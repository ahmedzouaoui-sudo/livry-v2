import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  X,
  HardDrive,
  RefreshCw,
  RotateCcw,
  Download,
  Trash2,
  Plus,
  Cloud,
  CheckCircle2,
  AlertTriangle,
  Calendar,
  Clock,
  Moon,
  FileSpreadsheet,
  FileJson,
  Copy,
  Check,
  FolderArchive,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import {
  DailyBackupMeta,
  StorageBucketStatus,
  SUPABASE_STORAGE_BUCKET,
  SUPABASE_STORAGE_BACKUP_SQL,
  fetchDailyBackupsList,
  createManualBackup,
  fetchBackupProductsById,
  restoreBackupProductsToSupabase,
  deleteBackupById,
  ensureDailyBackup,
  downloadStorageBackupText,
} from '../services/dailyBackupService';
import { exportProductsToCsv } from '../utils/csvImporter';
import { triggerCsvDownload, triggerFileDownload } from '../utils/fileDownload';
import { triggerHaptic } from '../utils/haptics';
import { copyTextToClipboard } from '../utils/clipboard';
import { logAppEvent } from '../services/activityLogService';

interface DailyBackupsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

function formatFileSize(bytes?: number): string {
  if (!bytes || bytes <= 0) return '';
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} Mo`;
}

export const DailyBackupsModal: React.FC<DailyBackupsModalProps> = ({ isOpen, onClose }) => {
  const { products, syncWithSupabase, showToast } = useApp();

  const [backups, setBackups] = useState<DailyBackupMeta[]>([]);
  const [storageStatus, setStorageStatus] = useState<StorageBucketStatus | null>(null);
  const [showStorageSql, setShowStorageSql] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isTestingStorage, setIsTestingStorage] = useState(false);
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [restoreProgress, setRestoreProgress] = useState<{ processed: number; total: number } | null>(null);
  const [confirmRestoreId, setConfirmRestoreId] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const productsRef = useRef(products);
  useEffect(() => {
    productsRef.current = products;
  }, [products]);

  const loadBackups = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetchDailyBackupsList();
      if (res.success) {
        setBackups(res.backups);
        setStorageStatus(res.storageStatus);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    setConfirmRestoreId(null);
    ensureDailyBackup(productsRef.current)
      .catch(() => {})
      .finally(() => {
        loadBackups();
      });
  }, [isOpen, loadBackups]);

  if (!isOpen) return null;

  const handleCopySql = async () => {
    const ok = await copyTextToClipboard(SUPABASE_STORAGE_BACKUP_SQL);
    if (ok) {
      setCopiedSql(true);
      triggerHaptic('success');
      showToast('📋 Script SQL Storage copié ! Collez-le dans Supabase → SQL Editor');
      setTimeout(() => setCopiedSql(false), 3000);
    } else {
      showToast('❌ Impossible de copier automatiquement');
    }
  };

  const handleTestAndUploadNow = async () => {
    triggerHaptic('medium');
    setIsTestingStorage(true);
    try {
      const res = await ensureDailyBackup(products, true);
      await loadBackups();
      if (res.storageUploaded) {
        triggerHaptic('success');
        setShowStorageSql(false);
        showToast(`✅ Fichiers CSV & JSON envoyés dans Supabase Storage (${SUPABASE_STORAGE_BUCKET}) !`);
      } else if (res.needsBucketSetup) {
        triggerHaptic('warning');
        setShowStorageSql(true);
        showToast(`⚠️ Bucket "${SUPABASE_STORAGE_BUCKET}" pas encore activé dans Supabase SQL Editor.`);
      } else {
        showToast(`⚠️ Erreur Storage : ${res.storageError || 'vérifiez la connexion'}`);
      }
    } finally {
      setIsTestingStorage(false);
    }
  };

  const handleCreateManualBackup = async () => {
    triggerHaptic('medium');
    setIsCreating(true);
    try {
      const res = await createManualBackup(products);
      await loadBackups();
      logAppEvent({
        category: 'BACKUP',
        action: 'BACKUP_MANUAL_CREATED',
        actorRole: 'Admin',
        target: `${products.length} articles`,
        details: res.storageUploaded
          ? `Backup manuel CSV + JSON envoyé vers Supabase Storage (${products.length} articles)`
          : res.success
            ? `Backup manuel Cloud DB créé (${products.length} articles)`
            : `Backup manuel local créé (${res.error || 'hors ligne'})`,
      });
      if (res.storageUploaded) {
        triggerHaptic('success');
        showToast(`✅ Fichiers CSV + JSON sauvegardés dans Supabase Storage (${products.length} articles) !`);
      } else if (res.success) {
        triggerHaptic('success');
        showToast(`✅ Sauvegarde Cloud DB créée (${products.length} articles). Activez Storage pour les fichiers CSV/JSON.`);
      } else {
        triggerHaptic('warning');
        showToast(`⚠️ Sauvegarde locale créée (${res.error || 'Cloud indisponible'})`);
      }
    } finally {
      setIsCreating(false);
    }
  };

  const handleDownloadCsv = async (backup: DailyBackupMeta) => {
    triggerHaptic('light');
    setDownloadingId(`${backup.id}_csv`);
    try {
      const storageText = await downloadStorageBackupText(
        backup.csvStoragePath,
        backup.csvPublicUrl
      );
      if (storageText) {
        triggerCsvDownload(storageText, `backup_livry_${backup.dateKey}.csv`);
        triggerHaptic('success');
        showToast(`📥 Fichier CSV téléchargé depuis Supabase Storage`);
        return;
      }

      const res = await fetchBackupProductsById(backup.id, backup);
      if (!res.success || res.products.length === 0) {
        showToast(`❌ ${res.error || 'Erreur chargement backup'}`);
        return;
      }
      const csvContent = exportProductsToCsv(res.products);
      triggerCsvDownload(
        csvContent,
        `backup_livry_${backup.dateKey}_${res.products.length}articles.csv`
      );
      triggerHaptic('success');
      showToast(`📥 CSV téléchargé (${res.products.length} articles)`);
    } finally {
      setDownloadingId(null);
    }
  };

  const handleDownloadJson = async (backup: DailyBackupMeta) => {
    triggerHaptic('light');
    setDownloadingId(`${backup.id}_json`);
    try {
      const storageText = await downloadStorageBackupText(
        backup.jsonStoragePath,
        backup.jsonPublicUrl
      );
      if (storageText) {
        triggerFileDownload(
          storageText,
          `backup_livry_${backup.dateKey}.json`,
          'application/json;charset=utf-8'
        );
        triggerHaptic('success');
        showToast(`📥 Fichier JSON téléchargé depuis Supabase Storage`);
        return;
      }

      const res = await fetchBackupProductsById(backup.id, backup);
      if (!res.success || res.products.length === 0) {
        showToast(`❌ ${res.error || 'Erreur chargement backup'}`);
        return;
      }
      const jsonContent = JSON.stringify(
        { exportedAt: backup.createdAt, productCount: res.products.length, products: res.products },
        null,
        2
      );
      triggerFileDownload(
        jsonContent,
        `backup_livry_${backup.dateKey}_${res.products.length}articles.json`,
        'application/json;charset=utf-8'
      );
      triggerHaptic('success');
      showToast(`📥 JSON téléchargé (${res.products.length} articles)`);
    } finally {
      setDownloadingId(null);
    }
  };

  const handleRestore = async (backup: DailyBackupMeta) => {
    triggerHaptic('medium');
    setRestoringId(backup.id);
    setRestoreProgress(null);
    try {
      const fetched = await fetchBackupProductsById(backup.id, backup);
      if (!fetched.success || fetched.products.length === 0) {
        showToast(`❌ ${fetched.error || 'Impossible de lire cette sauvegarde'}`);
        return;
      }

      const restored = await restoreBackupProductsToSupabase(
        fetched.products,
        (processed, total) => setRestoreProgress({ processed, total })
      );

      if (restored.success) {
        await syncWithSupabase(true);
        logAppEvent({
          category: 'BACKUP',
          action: 'BACKUP_RESTORED',
          actorRole: 'Admin',
          target: backup.dateKey,
          details: `Catalogue restauré depuis backup "${backup.title}" (${restored.count} articles)`,
        });
        triggerHaptic('success');
        showToast(`✅ Backup du ${backup.dateKey} restauré (${restored.count} articles) !`);
        setConfirmRestoreId(null);
        onClose();
      } else {
        triggerHaptic('warning');
        showToast(`❌ Erreur restauration : ${restored.error || 'échec'}`);
      }
    } finally {
      setRestoringId(null);
      setRestoreProgress(null);
    }
  };

  const handleDelete = async (backup: DailyBackupMeta) => {
    triggerHaptic('light');
    setDeletingId(backup.id);
    try {
      await deleteBackupById(backup.id, backup);
      setBackups((prev) => prev.filter((b) => b.id !== backup.id));
      logAppEvent({
        category: 'BACKUP',
        action: 'BACKUP_DELETED',
        actorRole: 'Admin',
        target: backup.dateKey,
        details: `Sauvegarde "${backup.title}" supprimée`,
      });
      showToast(`🗑️ Sauvegarde et fichiers supprimés`);
    } finally {
      setDeletingId(null);
    }
  };

  const formatBackupDate = (iso: string) => {
    try {
      const d = new Date(iso);
      return d.toLocaleString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return iso;
    }
  };

  const renderSourceBadge = (backup: DailyBackupMeta) => {
    if (backup.source === 'storage+cloud') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[6px] bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 text-[10px] font-bold border border-indigo-200 dark:border-indigo-800">
          <FolderArchive className="w-3 h-3" />
          Supabase Storage + DB
        </span>
      );
    }
    if (backup.source === 'storage') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[6px] bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 text-[10px] font-bold border border-indigo-200 dark:border-indigo-800">
          <FolderArchive className="w-3 h-3" />
          Fichiers Supabase Storage
        </span>
      );
    }
    if (backup.source === 'cloud') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[6px] bg-sky-50 dark:bg-sky-950/50 text-sky-700 dark:text-sky-300 text-[10px] font-bold border border-sky-200 dark:border-sky-800">
          <Cloud className="w-3 h-3" />
          Cloud DB Supabase
        </span>
      );
    }
    return (
      <span className="text-[10px] text-gray-400 dark:text-slate-500 font-semibold">📱 Mémoire Locale</span>
    );
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-5 bg-black/65 backdrop-blur-md animate-in fade-in duration-150">
      <div className="relative w-full max-w-3xl max-h-[90vh] bg-white/88 dark:bg-slate-900/88 backdrop-blur-2xl rounded-[24px] shadow-2xl border border-white/75 dark:border-white/15 flex flex-col overflow-hidden text-gray-900 dark:text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-gray-100 dark:border-slate-800 bg-gray-50/80 dark:bg-slate-800/50 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-[14px] bg-emerald-600 text-white flex items-center justify-center shadow-sm shrink-0">
              <HardDrive className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm sm:text-base font-black text-gray-900 dark:text-white leading-tight">
                  Backups Fichiers Automatiques (Chaque Nuit)
                </h3>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 text-[10.5px] font-black tabular-nums">
                  <Moon className="w-3 h-3" />
                  Auto 22h00 · 30j
                </span>
              </div>
              <p className="text-[11px] text-gray-500 dark:text-slate-400 mt-0.5">
                Envoi automatique de fichiers <strong>.CSV</strong> et <strong>.JSON</strong> dans Supabase Storage chaque nuit + miroir Cloud DB
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-[10px] text-gray-400 hover:text-gray-700 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-800 transition cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Supabase Storage Bucket Status Banner */}
        <div className="px-4 sm:px-6 py-2.5 border-b border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0">
          {storageStatus?.ready ? (
            <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-[12px] bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/70">
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-800 dark:text-emerald-200">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>
                  Supabase Storage actif : bucket <code className="px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900 font-mono text-[11px]">{SUPABASE_STORAGE_BUCKET}</code> ({storageStatus.fileCount} fichiers en ligne)
                </span>
              </div>
              <span className="text-[10.5px] font-bold text-emerald-700 dark:text-emerald-300">
                nightly/*.csv &amp; *.json
              </span>
            </div>
          ) : (
            <div className="rounded-[12px] bg-amber-50/90 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/70 overflow-hidden">
              <div className="p-2.5 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-xs font-bold text-amber-900 dark:text-amber-200">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>
                    Bucket Storage <code className="px-1 py-0.5 rounded bg-amber-100 dark:bg-amber-900 font-mono text-[11px]">{SUPABASE_STORAGE_BUCKET}</code> non activé (Cloud DB actif en secours)
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setShowStorageSql((v) => !v)}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-[8px] bg-amber-600 hover:bg-amber-700 text-white text-[11px] font-black transition cursor-pointer"
                  >
                    <span>Activer Storage (1 clic SQL)</span>
                    {showStorageSql ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>
                  <button
                    type="button"
                    onClick={handleTestAndUploadNow}
                    disabled={isTestingStorage}
                    className="px-2.5 py-1 rounded-[8px] bg-white dark:bg-slate-800 border border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-200 text-[11px] font-bold hover:bg-amber-100 transition cursor-pointer disabled:opacity-50"
                  >
                    {isTestingStorage ? 'Test...' : 'Tester & Envoyer'}
                  </button>
                </div>
              </div>

              {showStorageSql && (
                <div className="px-3 pb-3 pt-1 border-t border-amber-200/70 dark:border-amber-800/50 space-y-2">
                  <p className="text-[11px] text-amber-900/90 dark:text-amber-200/90 font-medium">
                    Copiez ce SQL et exécutez-le <strong>1 seule fois</strong> dans <strong>Supabase → SQL Editor → Run</strong>, puis cliquez sur <strong>Tester &amp; Envoyer</strong> :
                  </p>
                  <pre className="p-2.5 rounded-[10px] bg-slate-950 text-emerald-300 text-[10.5px] font-mono overflow-x-auto max-h-40 leading-relaxed">
                    {SUPABASE_STORAGE_BACKUP_SQL}
                  </pre>
                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={handleCopySql}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] bg-[#0759A4] hover:bg-blue-700 text-white text-xs font-black transition cursor-pointer"
                    >
                      {copiedSql ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedSql ? 'Copié !' : 'Copier le SQL Storage'}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Action Toolbar */}
        <div className="px-4 sm:px-6 py-3 border-b border-gray-100 dark:border-slate-800 bg-gray-50/60 dark:bg-slate-800/40 flex flex-wrap items-center justify-between gap-2 shrink-0">
          <div className="text-xs font-bold text-gray-600 dark:text-slate-300 flex items-center gap-2 tabular-nums">
            <Cloud className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>
              Catalogue actuel : <strong className="text-gray-900 dark:text-white">{products.length} articles</strong>
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={loadBackups}
              disabled={isLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-[10px] bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-slate-200 text-xs font-bold hover:bg-gray-50 dark:hover:bg-slate-700 transition cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Actualiser</span>
            </button>

            <button
              type="button"
              onClick={handleCreateManualBackup}
              disabled={isCreating || products.length === 0}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-[10px] bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black shadow-xs active:scale-95 transition cursor-pointer disabled:opacity-50"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{isCreating ? 'Envoi fichiers...' : 'Backup Fichiers Maintenant'}</span>
            </button>
          </div>
        </div>

        {/* Restoration Progress Bar */}
        {restoreProgress && (
          <div className="px-4 sm:px-6 py-2.5 bg-blue-50 dark:bg-blue-950/50 border-b border-blue-200 dark:border-blue-800 flex items-center justify-between gap-3">
            <span className="text-xs font-black text-[#0759A4] dark:text-blue-300 tabular-nums">
              Restauration en cours vers Supabase... ({restoreProgress.processed} / {restoreProgress.total})
            </span>
            <div className="w-36 h-2 rounded-full bg-blue-200 dark:bg-slate-700 overflow-hidden">
              <div
                className="h-full bg-[#0759A4] dark:bg-blue-500 transition-all duration-200"
                style={{ width: `${Math.round((restoreProgress.processed / Math.max(1, restoreProgress.total)) * 100)}%` }}
              />
            </div>
          </div>
        )}

        {/* Backups List */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-2.5">
          {isLoading && backups.length === 0 ? (
            <div className="py-12 text-center text-xs font-bold text-gray-400">
              Chargement des fichiers de sauvegarde...
            </div>
          ) : backups.length === 0 ? (
            <div className="py-10 text-center space-y-2">
              <HardDrive className="w-10 h-10 text-gray-300 dark:text-slate-600 mx-auto" />
              <p className="text-xs font-bold text-gray-700 dark:text-slate-300">
                Aucune sauvegarde trouvée pour le moment
              </p>
              <p className="text-[11px] text-gray-400">
                Cliquez sur &quot;Backup Fichiers Maintenant&quot; pour générer les fichiers CSV &amp; JSON immédiatement.
              </p>
            </div>
          ) : (
            backups.map((backup) => {
              const isConfirming = confirmRestoreId === backup.id;
              const isRestoringThis = restoringId === backup.id;
              const sizeStr = formatFileSize(backup.fileSizeBytes);

              return (
                <div
                  key={backup.id}
                  className="p-3.5 rounded-[16px] bg-gray-50/70 dark:bg-slate-800/60 border border-gray-200 dark:border-slate-700/80 flex flex-col gap-2.5 transition"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`px-2 py-0.5 rounded-[6px] text-[10px] font-black ${
                            backup.type === 'Auto'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300'
                              : backup.type === 'Urgence'
                              ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300'
                              : 'bg-blue-100 text-[#0759A4] dark:bg-blue-950/80 dark:text-blue-300'
                          }`}
                        >
                          {backup.type === 'Auto'
                            ? 'Backup Nuit Auto'
                            : backup.type === 'Urgence'
                            ? 'Urgence Locale'
                            : 'Backup Manuel'}
                        </span>

                        {backup.productCount > 0 && (
                          <span className="text-[10.5px] font-mono font-black text-[#0759A4] dark:text-blue-400 tabular-nums">
                            {backup.productCount} articles
                          </span>
                        )}

                        {renderSourceBadge(backup)}

                        {sizeStr && (
                          <span className="text-[10px] font-mono text-gray-400 font-semibold tabular-nums">
                            {sizeStr}
                          </span>
                        )}
                      </div>

                      <h4 className="text-xs sm:text-sm font-black text-gray-900 dark:text-white truncate">
                        {backup.title}
                      </h4>

                      <div className="flex items-center gap-3 flex-wrap text-[10.5px] text-gray-500 dark:text-slate-400 font-medium tabular-nums">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {backup.dateKey}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatBackupDate(backup.createdAt)}
                        </span>
                        {backup.csvStoragePath && (
                          <span className="font-mono text-[10px] text-indigo-600 dark:text-indigo-400 truncate max-w-[240px]">
                            {backup.csvStoragePath}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
                      <button
                        type="button"
                        onClick={() => handleDownloadCsv(backup)}
                        disabled={downloadingId === `${backup.id}_csv` || Boolean(restoringId)}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-[10px] bg-white dark:bg-slate-800 hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-200 border border-gray-200 dark:border-slate-700 text-xs font-bold transition cursor-pointer disabled:opacity-50"
                        title="Télécharger le fichier CSV (12 colonnes Excel)"
                      >
                        <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                        <span>{downloadingId === `${backup.id}_csv` ? '...' : 'CSV'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDownloadJson(backup)}
                        disabled={downloadingId === `${backup.id}_json` || Boolean(restoringId)}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-[10px] bg-white dark:bg-slate-800 hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-200 border border-gray-200 dark:border-slate-700 text-xs font-bold transition cursor-pointer disabled:opacity-50"
                        title="Télécharger le fichier JSON complet"
                      >
                        <FileJson className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                        <span>{downloadingId === `${backup.id}_json` ? '...' : 'JSON'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setConfirmRestoreId(isConfirming ? null : backup.id)}
                        disabled={Boolean(restoringId)}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-[10px] bg-[#0759A4] hover:bg-blue-700 text-white text-xs font-black shadow-2xs active:scale-95 transition cursor-pointer disabled:opacity-50"
                        title="Restaurer ce backup dans Supabase"
                      >
                        <RotateCcw className={`w-3.5 h-3.5 ${isRestoringThis ? 'animate-spin' : ''}`} />
                        <span>Restaurer</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDelete(backup)}
                        disabled={deletingId === backup.id || Boolean(restoringId)}
                        className="p-1.5 rounded-[10px] text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition cursor-pointer disabled:opacity-50"
                        title="Supprimer cette sauvegarde"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Inline Restore Confirmation */}
                  {isConfirming && (
                    <div className="p-3 rounded-[12px] bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2 text-xs font-bold text-amber-900 dark:text-amber-200">
                        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                        <span>
                          Remplacer la base Supabase par ce backup{backup.productCount > 0 ? ` de ${backup.productCount} articles` : ''} ?
                        </span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => setConfirmRestoreId(null)}
                          className="px-3 py-1 rounded-[8px] bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-slate-200 text-xs font-bold cursor-pointer"
                        >
                          Annuler
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRestore(backup)}
                          disabled={isRestoringThis}
                          className="flex items-center gap-1 px-3.5 py-1 rounded-[8px] bg-amber-600 hover:bg-amber-700 text-white text-xs font-black cursor-pointer disabled:opacity-50"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>{isRestoringThis ? 'Restauration...' : 'Confirmer'}</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer Info */}
        <div className="px-4 sm:px-6 py-3 border-t border-gray-100 dark:border-slate-800 bg-gray-50/80 dark:bg-slate-800/40 text-[11px] text-gray-500 dark:text-slate-400 flex items-center justify-between gap-2 shrink-0">
          <span className="flex items-center gap-1.5">
            <Download className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>
              Auto chaque nuit à partir de 22h00 · Fichiers CSV &amp; JSON protégés contre l&apos;écrasement vide.
            </span>
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-[10px] bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-slate-200 text-xs font-bold cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-700 transition shrink-0"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};

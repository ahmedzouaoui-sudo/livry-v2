import React, { useState, useEffect, useMemo } from 'react';
import {
  FileText,
  Download,
  RefreshCw,
  Search,
  X,
  Shield,
  Package,
  BadgeCheck,
  Upload,
  HardDrive,
  BookOpen,
  Lightbulb,
  ThumbsUp,
  Activity,
} from 'lucide-react';
import { ActivityCategory, AppActivityLog, Product, UserDevice } from '../types';
import {
  buildActivityLogsCsv,
  buildFullAuditTextReport,
  fetchAllActivityLogs,
  getLocalActivityLogs,
} from '../services/activityLogService';
import { triggerHaptic } from '../utils/haptics';
import { triggerCsvDownload, triggerFileDownload } from '../utils/fileDownload';

interface ActivityLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  devices: UserDevice[];
  onExportToast?: (msg: string) => void;
}

const CATEGORY_LABELS: Record<ActivityCategory, { label: string; badgeClass: string }> = {
  AUTH: {
    label: 'Sécurité / MDP',
    badgeClass: 'bg-rose-100 dark:bg-rose-950/70 text-rose-800 dark:text-rose-200 border-rose-300 dark:border-rose-700',
  },
  PRODUCT: {
    label: 'Produit',
    badgeClass: 'bg-blue-100 dark:bg-blue-950/70 text-blue-800 dark:text-blue-200 border-blue-300 dark:border-blue-700',
  },
  VERIFICATION: {
    label: 'Icône Statut',
    badgeClass: 'bg-sky-100 dark:bg-sky-950/70 text-sky-800 dark:text-sky-200 border-sky-300 dark:border-sky-700',
  },
  IMPORT_EXPORT: {
    label: 'Import / Export',
    badgeClass: 'bg-indigo-100 dark:bg-indigo-950/70 text-indigo-800 dark:text-indigo-200 border-indigo-300 dark:border-indigo-700',
  },
  BACKUP: {
    label: 'Backup',
    badgeClass: 'bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-200 border-emerald-300 dark:border-emerald-700',
  },
  GUIDE: {
    label: 'Guide',
    badgeClass: 'bg-pink-100 dark:bg-pink-950/70 text-pink-800 dark:text-pink-200 border-pink-300 dark:border-pink-700',
  },
  TIPS: {
    label: 'Astuces',
    badgeClass: 'bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-200 border-amber-300 dark:border-amber-700',
  },
  BARCODE_VOTE: {
    label: 'Vote Code',
    badgeClass: 'bg-teal-100 dark:bg-teal-950/70 text-teal-800 dark:text-teal-200 border-teal-300 dark:border-teal-700',
  },
  SYSTEM: {
    label: 'Système',
    badgeClass: 'bg-gray-100 dark:bg-slate-800 text-gray-800 dark:text-slate-200 border-gray-300 dark:border-slate-700',
  },
};

function CategoryIcon({ category }: { category: ActivityCategory }) {
  switch (category) {
    case 'AUTH':
      return <Shield className="w-3.5 h-3.5" />;
    case 'PRODUCT':
      return <Package className="w-3.5 h-3.5" />;
    case 'VERIFICATION':
      return <BadgeCheck className="w-3.5 h-3.5" />;
    case 'IMPORT_EXPORT':
      return <Upload className="w-3.5 h-3.5" />;
    case 'BACKUP':
      return <HardDrive className="w-3.5 h-3.5" />;
    case 'GUIDE':
      return <BookOpen className="w-3.5 h-3.5" />;
    case 'TIPS':
      return <Lightbulb className="w-3.5 h-3.5" />;
    case 'BARCODE_VOTE':
      return <ThumbsUp className="w-3.5 h-3.5" />;
    default:
      return <Activity className="w-3.5 h-3.5" />;
  }
}

export const ActivityLogModal: React.FC<ActivityLogModalProps> = ({
  isOpen,
  onClose,
  products,
  devices,
  onExportToast,
}) => {
  const [logs, setLogs] = useState<AppActivityLog[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedCat, setSelectedCat] = useState<'ALL' | ActivityCategory>('ALL');

  const loadLogs = async () => {
    setIsLoading(true);
    setLogs(getLocalActivityLogs());
    try {
      const merged = await fetchAllActivityLogs();
      setLogs(merged);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    loadLogs();

    const handleLiveUpdate = () => {
      setLogs(getLocalActivityLogs());
    };
    window.addEventListener('livry:activity-log-updated', handleLiveUpdate);
    return () => window.removeEventListener('livry:activity-log-updated', handleLiveUpdate);
  }, [isOpen]);

  const filteredLogs = useMemo(() => {
    const q = search.trim().toLowerCase();
    return logs.filter((l) => {
      if (selectedCat !== 'ALL' && l.category !== selectedCat) return false;
      if (!q) return true;
      return (
        l.action.toLowerCase().includes(q) ||
        l.details.toLowerCase().includes(q) ||
        (l.target || '').toLowerCase().includes(q) ||
        l.deviceId.toLowerCase().includes(q) ||
        l.ipAddress.toLowerCase().includes(q) ||
        l.localDateTime.toLowerCase().includes(q)
      );
    });
  }, [logs, selectedCat, search]);

  if (!isOpen) return null;

  const triggerDownload = (content: string, filename: string, mimeType: string) => {
    triggerHaptic('success');
    triggerFileDownload(content, filename, mimeType);
    onExportToast?.(`📄 Fichier téléchargé : ${filename}`);
  };

  const dateStamp = new Date().toISOString().slice(0, 10);

  const handleDownloadFullTxt = () => {
    const txt = buildFullAuditTextReport({
      logs,
      products,
      devices,
    });
    triggerDownload(txt, `livry_finder_rapport_complet_${dateStamp}.txt`, 'text/plain;charset=utf-8');
  };

  const handleDownloadCsv = () => {
    const csv = buildActivityLogsCsv(logs);
    triggerHaptic('success');
    triggerCsvDownload(csv, `livry_finder_historique_${dateStamp}.csv`);
    onExportToast?.(`📄 Fichier téléchargé : livry_finder_historique_${dateStamp}.csv`);
  };

  const handleDownloadJson = () => {
    const payload = JSON.stringify(
      {
        exportedAt: new Date().toISOString(),
        totalLogs: logs.length,
        totalProducts: products.length,
        totalDevices: devices.length,
        logs,
        devices,
      },
      null,
      2
    );
    triggerDownload(payload, `livry_finder_audit_complet_${dateStamp}.json`, 'application/json;charset=utf-8');
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-2.5 sm:p-5 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-150">
      <div className="relative w-full max-w-5xl max-h-[92dvh] bg-white/94 dark:bg-[#0E1526]/95 backdrop-blur-2xl rounded-3xl shadow-2xl border border-white/75 dark:border-white/15 flex flex-col overflow-hidden text-gray-900 dark:text-slate-100">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-4 border-b border-gray-100 dark:border-slate-800 bg-gray-50/80 dark:bg-slate-800/50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#0759A4] to-indigo-700 text-white flex items-center justify-center shadow-sm shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-black text-gray-900 dark:text-white leading-tight">
                Journal Complet &amp; Fichier d&apos;Activité
              </h3>
              <p className="text-[11px] text-gray-500 dark:text-slate-400">
                Tout ce qui se passe dans l&apos;application (modifications, sécurité, guide, astuces, backups, votes)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              type="button"
              onClick={handleDownloadFullTxt}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#0759A4] hover:bg-blue-700 text-white text-xs font-black shadow-xs active:scale-95 transition cursor-pointer"
              title="Télécharger un fichier .TXT lisible contenant tout l'historique"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Fichier Complet (.TXT)</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadCsv}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black shadow-xs active:scale-95 transition cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Excel (.CSV)</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadJson}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-gray-800 dark:bg-slate-700 hover:bg-gray-900 text-white text-xs font-bold shadow-xs active:scale-95 transition cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>.JSON</span>
            </button>

            <button
              type="button"
              onClick={() => {
                triggerHaptic('light');
                loadLogs();
              }}
              className="p-2 rounded-xl bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-300 hover:bg-gray-200 cursor-pointer"
              title="Actualiser"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-[#0759A4]' : ''}`} />
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-gray-400 hover:text-gray-700 dark:hover:text-white cursor-pointer"
              aria-label="Fermer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Filters & Search */}
        <div className="px-5 py-3 border-b border-gray-100 dark:border-slate-800 space-y-2.5 shrink-0 bg-white/60 dark:bg-slate-900/40">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filtrer par action, produit, date, appareil ID, adresse IP..."
              className="w-full pl-9 pr-9 py-2 rounded-xl bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-xs text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-[#0759A4]"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            <button
              type="button"
              onClick={() => setSelectedCat('ALL')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-black shrink-0 cursor-pointer transition ${
                selectedCat === 'ALL'
                  ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900'
                  : 'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-300'
              }`}
            >
              Tout ({logs.length})
            </button>

            {(Object.keys(CATEGORY_LABELS) as ActivityCategory[]).map((cat) => {
              const count = logs.filter((l) => l.category === cat).length;
              if (count === 0) return null;
              const info = CATEGORY_LABELS[cat];
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCat(selectedCat === cat ? 'ALL' : cat)}
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold border shrink-0 cursor-pointer transition ${
                    selectedCat === cat
                      ? 'bg-[#0759A4] text-white border-[#0759A4]'
                      : info.badgeClass
                  }`}
                >
                  <CategoryIcon category={cat} />
                  <span>
                    {info.label} ({count})
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Log Timeline List */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-2">
          {filteredLogs.length > 0 ? (
            filteredLogs.map((log) => {
              const catInfo = CATEGORY_LABELS[log.category] || CATEGORY_LABELS.SYSTEM;
              return (
                <div
                  key={log.id}
                  className="p-3 rounded-2xl bg-gray-50/85 dark:bg-slate-800/60 border border-gray-200/80 dark:border-slate-700/80 flex flex-col gap-1.5"
                >
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black border ${catInfo.badgeClass}`}
                      >
                        <CategoryIcon category={log.category} />
                        <span>{catInfo.label}</span>
                      </span>
                      <span className="font-mono text-[11px] font-black text-gray-900 dark:text-white">
                        {log.action}
                      </span>
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-black ${
                          log.actorRole === 'Admin'
                            ? 'bg-blue-100 dark:bg-blue-950 text-[#0759A4] dark:text-blue-300'
                            : 'bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-slate-300'
                        }`}
                      >
                        {log.actorRole}
                      </span>
                    </div>
                    <span className="text-[10.5px] font-mono font-bold text-gray-500 dark:text-slate-400 tabular-nums">
                      {log.localDateTime}
                    </span>
                  </div>

                  {log.target && (
                    <div className="text-[11px] font-extrabold text-[#0759A4] dark:text-blue-300">
                      Cible : {log.target}
                    </div>
                  )}

                  <p className="text-xs text-gray-700 dark:text-slate-200 leading-relaxed">
                    {log.details}
                  </p>

                  <div className="flex items-center gap-3 text-[10px] font-mono text-gray-400 dark:text-slate-500 pt-0.5">
                    <span>Appareil: {log.deviceId}</span>
                    <span>IP: {log.ipAddress}</span>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="py-16 text-center text-gray-400 dark:text-slate-500 space-y-2">
              <FileText className="w-10 h-10 mx-auto opacity-40" />
              <p className="text-sm font-bold">Aucune activité trouvée pour ce filtre</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

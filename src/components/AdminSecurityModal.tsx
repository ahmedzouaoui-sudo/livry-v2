import React, { useState } from 'react';
import {
  ShieldCheck,
  KeyRound,
  X,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertTriangle,
  Lock,
} from 'lucide-react';
import {
  changeAdminPassword,
  getActiveSessionInfo,
  getLocalAuthConfig,
} from '../services/adminAuthService';
import { triggerHaptic } from '../utils/haptics';

interface AdminSecurityModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLockAdmin: () => void;
  onPasswordChanged?: () => void;
}

export const AdminSecurityModal: React.FC<AdminSecurityModalProps> = ({
  isOpen,
  onClose,
  onLockAdmin,
  onPasswordChanged,
}) => {
  const [currentPwd, setCurrentPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  if (!isOpen) return null;

  const cfg = getLocalAuthConfig();
  const session = getActiveSessionInfo();
  const expiresStr = session?.expiresAt
    ? new Date(session.expiresAt).toLocaleString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      })
    : 'Session active';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (newPwd.trim().length < 6) {
      triggerHaptic('warning');
      setErrorMsg('Le nouveau mot de passe doit contenir au moins 6 caractères.');
      return;
    }

    if (newPwd !== confirmPwd) {
      triggerHaptic('warning');
      setErrorMsg('Les deux nouveaux mots de passe ne correspondent pas.');
      return;
    }

    setIsSaving(true);
    try {
      const res = await changeAdminPassword(currentPwd, newPwd);
      if (res.success) {
        triggerHaptic('success');
        setSuccessMsg('✅ Mot de passe Data changé et synchronisé !');
        setCurrentPwd('');
        setNewPwd('');
        setConfirmPwd('');
        onPasswordChanged?.();
      } else {
        triggerHaptic('warning');
        setErrorMsg(res.error || 'Erreur lors de la modification.');
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-3 sm:p-5 bg-slate-950/75 backdrop-blur-md animate-in fade-in duration-150">
      <div className="relative w-full max-w-md bg-white/92 dark:bg-[#0E1526]/92 backdrop-blur-2xl rounded-3xl shadow-2xl border border-white/75 dark:border-white/15 overflow-hidden text-gray-900 dark:text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-slate-800 bg-gray-50/80 dark:bg-slate-800/50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-black text-gray-900 dark:text-white leading-tight">
                Sécurité &amp; Mot de Passe Data
              </h3>
              <p className="text-[11px] text-gray-500 dark:text-slate-400">
                Protection PBKDF2-SHA256 · Verrouillage anti-intrusion actif
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full text-gray-400 hover:text-gray-700 dark:hover:text-white cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Status summary */}
          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <div className="p-2.5 rounded-xl bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800">
              <span className="text-emerald-700 dark:text-emerald-300 font-bold block">Version Clé</span>
              <span className="font-mono font-black text-emerald-950 dark:text-emerald-100">
                v{cfg?.version || 1} (Hachage Salé)
              </span>
            </div>
            <div className="p-2.5 rounded-xl bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800">
              <span className="text-[#0759A4] dark:text-blue-300 font-bold block">Session Expire</span>
              <span className="font-mono font-black text-blue-950 dark:text-blue-100">
                {expiresStr}
              </span>
            </div>
          </div>

          {/* Change Password Form */}
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-black text-gray-900 dark:text-white flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5 text-[#0759A4] dark:text-blue-400" />
                <span>Changer le mot de passe Admin / Data</span>
              </h4>
              <button
                type="button"
                onClick={() => setShowPwd((p) => !p)}
                className="text-[11px] font-bold text-[#0759A4] dark:text-blue-400 flex items-center gap-1 cursor-pointer"
              >
                {showPwd ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                <span>{showPwd ? 'Masquer' : 'Afficher'}</span>
              </button>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-gray-600 dark:text-slate-400 mb-1">
                Mot de passe actuel
              </label>
              <input
                type={showPwd ? 'text' : 'password'}
                required
                autoComplete="current-password"
                value={currentPwd}
                onChange={(e) => setCurrentPwd(e.target.value)}
                placeholder="Saisir le mot de passe actuel"
                className="w-full px-3 py-2 rounded-xl bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-xs font-mono font-bold text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-[#0759A4]"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-gray-600 dark:text-slate-400 mb-1">
                Nouveau mot de passe (min. 6 caractères)
              </label>
              <input
                type={showPwd ? 'text' : 'password'}
                required
                minLength={6}
                autoComplete="new-password"
                value={newPwd}
                onChange={(e) => setNewPwd(e.target.value)}
                placeholder="Nouveau mot de passe sécurisé"
                className="w-full px-3 py-2 rounded-xl bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-xs font-mono font-bold text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-[#0759A4]"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-gray-600 dark:text-slate-400 mb-1">
                Confirmer le nouveau mot de passe
              </label>
              <input
                type={showPwd ? 'text' : 'password'}
                required
                minLength={6}
                autoComplete="new-password"
                value={confirmPwd}
                onChange={(e) => setConfirmPwd(e.target.value)}
                placeholder="Répéter le nouveau mot de passe"
                className="w-full px-3 py-2 rounded-xl bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-xs font-mono font-bold text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-[#0759A4]"
              />
            </div>

            {errorMsg && (
              <div className="flex items-center gap-1.5 p-2.5 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 text-[11px] font-bold text-red-700 dark:text-red-300">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {successMsg && (
              <div className="flex items-center gap-1.5 p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-[11px] font-bold text-emerald-700 dark:text-emerald-300">
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isSaving}
              className="w-full py-2.5 rounded-xl bg-[#0759A4] hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-black shadow-md active:scale-95 transition cursor-pointer"
            >
              {isSaving ? 'Mise à jour...' : 'Mettre à jour le mot de passe Data'}
            </button>
          </form>

          {/* Session lock */}
          <div className="pt-3 border-t border-gray-100 dark:border-slate-800 flex items-center justify-between gap-2">
            <span className="text-[11px] text-gray-500 dark:text-slate-400">
              Quitter et verrouiller l&apos;accès Data
            </span>
            <button
              type="button"
              onClick={() => {
                triggerHaptic('light');
                onLockAdmin();
                onClose();
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-50 dark:bg-red-950/50 hover:bg-red-100 dark:hover:bg-red-900/60 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800 text-xs font-black transition cursor-pointer"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Verrouiller maintenant</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

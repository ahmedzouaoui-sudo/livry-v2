import React, { useState, useEffect, useRef } from 'react';
import { Shield, Lock, X, Eye, EyeOff, KeyRound, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { triggerHaptic } from '../utils/haptics';
import {
  checkIsAdminPasswordConfigured,
  getRemainingLockoutSeconds,
  setupInitialAdminPassword,
  verifyAdminPassword,
} from '../services/adminAuthService';

interface AdminAuthModalProps {
  isOpen: boolean;
  title?: string;
  subtitle?: string;
  submitLabel?: string;
  onClose: () => void;
  onSuccess: () => void;
}

export const AdminAuthModal: React.FC<AdminAuthModalProps> = ({
  isOpen,
  title = 'Accès Administrateur',
  subtitle = 'Entrez le mot de passe Data pour gérer les produits & paramètres',
  submitLabel = 'Déverrouiller',
  onClose,
  onSuccess,
}) => {
  const [isLoadingState, setIsLoadingState] = useState(true);
  const [isFirstRunSetup, setIsFirstRunSetup] = useState(false);

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [lockoutSeconds, setLockoutSeconds] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) {
      setPassword('');
      setConfirmPassword('');
      setErrorMsg(null);
      setShowPassword(false);
      return;
    }

    let cancelled = false;
    setIsLoadingState(true);

    checkIsAdminPasswordConfigured()
      .then((configured) => {
        if (cancelled) return;
        setIsFirstRunSetup(!configured);
        setLockoutSeconds(getRemainingLockoutSeconds());
        setIsLoadingState(false);
        setTimeout(() => inputRef.current?.focus(), 80);
      })
      .catch(() => {
        if (!cancelled) {
          setIsLoadingState(false);
          setTimeout(() => inputRef.current?.focus(), 80);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || lockoutSeconds <= 0) return;
    const timer = window.setInterval(() => {
      const rem = getRemainingLockoutSeconds();
      setLockoutSeconds(rem);
      if (rem <= 0) {
        setErrorMsg(null);
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [isOpen, lockoutSeconds]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting || lockoutSeconds > 0) return;

    setErrorMsg(null);
    setIsSubmitting(true);

    try {
      if (isFirstRunSetup) {
        if (password.trim().length < 6) {
          triggerHaptic('warning');
          setErrorMsg('Le mot de passe doit contenir au moins 6 caractères.');
          return;
        }
        if (password !== confirmPassword) {
          triggerHaptic('warning');
          setErrorMsg('Les deux mots de passe ne correspondent pas.');
          return;
        }
        const res = await setupInitialAdminPassword(password);
        if (res.success) {
          triggerHaptic('success');
          onSuccess();
        } else {
          triggerHaptic('warning');
          setErrorMsg(res.error || 'Impossible de configurer le mot de passe.');
        }
      } else {
        const res = await verifyAdminPassword(password);
        if (res.success) {
          triggerHaptic('success');
          onSuccess();
        } else {
          triggerHaptic('warning');
          setPassword('');
          if (res.lockedSeconds) {
            setLockoutSeconds(res.lockedSeconds);
          }
          setErrorMsg(res.error || 'Mot de passe incorrect.');
          inputRef.current?.focus();
        }
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/65 backdrop-blur-md animate-in fade-in duration-150">
      <div className="w-full max-w-sm bg-white/92 dark:bg-[#0E1526]/92 backdrop-blur-2xl rounded-[24px] p-5 shadow-2xl border border-white/75 dark:border-white/15 animate-in zoom-in-95 duration-150 relative text-gray-900 dark:text-slate-100">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-3.5 right-3.5 p-1.5 rounded-full text-gray-400 hover:text-gray-700 dark:hover:text-white cursor-pointer"
          aria-label="Fermer"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex flex-col items-center text-center space-y-2 mb-4">
          <div className="w-12 h-12 rounded-[16px] bg-blue-50/90 dark:bg-blue-950/60 border border-blue-200/80 dark:border-blue-800/70 flex items-center justify-center text-[#0759A4] dark:text-blue-400">
            {isFirstRunSetup ? <KeyRound className="w-6 h-6" /> : <Lock className="w-6 h-6" />}
          </div>
          <h3 className="text-sm sm:text-base font-black text-gray-900 dark:text-white">
            {isFirstRunSetup ? 'Créer le Mot de Passe Data' : title}
          </h3>
          <p className="text-[11px] text-gray-500 dark:text-slate-400 leading-relaxed max-w-[290px]">
            {isFirstRunSetup
              ? 'Ancien code supprimé pour votre sécurité. Définissez maintenant votre nouveau mot de passe Administrateur (min. 6 caractères).'
              : subtitle}
          </p>
        </div>

        {isLoadingState ? (
          <div className="py-6 text-center text-xs font-bold text-gray-400">
            Vérification sécurité en cours...
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="relative">
              <input
                ref={inputRef}
                type={showPassword ? 'text' : 'password'}
                autoComplete={isFirstRunSetup ? 'new-password' : 'current-password'}
                value={password}
                disabled={lockoutSeconds > 0 || isSubmitting}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setErrorMsg(null);
                }}
                placeholder={isFirstRunSetup ? 'Nouveau mot de passe (min. 6)' : 'Mot de passe Data'}
                className={`w-full pr-10 pl-3.5 py-2.5 rounded-[14px] bg-white/75 dark:bg-slate-900/70 text-sm font-mono font-bold text-gray-900 dark:text-white border outline-none transition ${
                  errorMsg || lockoutSeconds > 0
                    ? 'border-red-500 ring-2 ring-red-200 dark:ring-red-950'
                    : 'border-gray-200 dark:border-slate-700 focus:border-[#0759A4] focus:ring-2 focus:ring-blue-500/20'
                }`}
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-700 dark:hover:text-white cursor-pointer"
                tabIndex={-1}
                aria-label="Afficher ou masquer"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {isFirstRunSetup && (
              <input
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                value={confirmPassword}
                disabled={isSubmitting}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  setErrorMsg(null);
                }}
                placeholder="Confirmer le mot de passe"
                className="w-full px-3.5 py-2.5 rounded-[14px] bg-white/75 dark:bg-slate-900/70 text-sm font-mono font-bold text-gray-900 dark:text-white border border-gray-200 dark:border-slate-700 focus:border-[#0759A4] focus:ring-2 focus:ring-blue-500/20 outline-none transition"
              />
            )}

            {lockoutSeconds > 0 && (
              <div className="flex items-center justify-center gap-1.5 text-[11px] font-bold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 rounded-xl py-2 px-3">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                <span>Protection active · Réessayez dans {lockoutSeconds}s</span>
              </div>
            )}

            {errorMsg && lockoutSeconds <= 0 && (
              <p className="text-center text-[11px] font-bold text-red-600 dark:text-red-400">
                {errorMsg}
              </p>
            )}

            {isFirstRunSetup && (
              <div className="flex items-start gap-1.5 text-[10.5px] text-emerald-700 dark:text-emerald-300 bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl p-2.5">
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                <span>
                  Chiffré en PBKDF2-SHA256 &amp; synchronisé pour tous vos appareils. Vous pourrez le modifier à tout moment dans Data.
                </span>
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting || lockoutSeconds > 0}
              className="w-full py-2.5 rounded-[14px] bg-[#0759A4] hover:bg-blue-700 disabled:opacity-45 text-white font-black text-xs shadow-md active:scale-95 transition cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Shield className="w-4 h-4" />
              <span>
                {isSubmitting
                  ? 'Vérification...'
                  : isFirstRunSetup
                    ? 'Enregistrer & Déverrouiller'
                    : submitLabel}
              </span>
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

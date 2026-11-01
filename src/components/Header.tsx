import React, { useState, useRef, useEffect } from 'react';
import { Lock, X, ShieldAlert, RefreshCw, Database, Check, LogOut, Moon, Sun } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { triggerHaptic } from '../utils/haptics';
import { PWAInstallButton } from './PWAInstallButton';

export const Header: React.FC<{ onLogoClick?: () => void }> = ({ onLogoClick }) => {
  const {
    role,
    setRole,
    activeTab,
    setActiveTab,
    setSelectedDepartment,
    showToast,
    isSyncing,
    lastSyncTimestamp,
    dataUpdateStatus,
    applyUpdate,
    isDarkMode,
    toggleDarkMode,
  } = useApp();

  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [adminPin, setAdminPin] = useState('');
  const [pinError, setPinError] = useState(false);
  const pinInputRef = useRef<HTMLInputElement>(null);

  const logoClicksRef = useRef(0);
  const logoTimerRef = useRef<any>(null);

  useEffect(() => {
    if (isPinModalOpen) {
      setTimeout(() => {
        pinInputRef.current?.focus();
      }, 100);
    } else {
      setAdminPin('');
      setPinError(false);
    }
  }, [isPinModalOpen]);

  const handleLogoClick = () => {
    triggerHaptic('light');

    if (logoTimerRef.current) clearTimeout(logoTimerRef.current);
    logoClicksRef.current += 1;
    const clicks = logoClicksRef.current;

    logoTimerRef.current = setTimeout(() => {
      logoClicksRef.current = 0;
    }, 3000);

    // 8 Clics pour déverrouiller l'accès Admin
    if (clicks >= 8) {
      logoClicksRef.current = 0;
      if (logoTimerRef.current) clearTimeout(logoTimerRef.current);
      triggerHaptic('success');
      setIsPinModalOpen(true);
      showToast('🔒 Accès Admin (8 clics) : Entrez le code PIN');
      return;
    }

    if (onLogoClick) onLogoClick();
    else {
      setSelectedDepartment(null);
      setActiveTab('home');
    }
  };

  const handleVerifyPin = (e: React.FormEvent) => {
    e.preventDefault();
    if (adminPin === '1997') {
      triggerHaptic('success');
      setRole('Admin');
      setActiveTab('admin');
      setIsPinModalOpen(false);
      setAdminPin('');
      setPinError(false);
      showToast('Accès Administrateur déverrouillé !');
    } else {
      triggerHaptic('warning');
      setPinError(true);
      setAdminPin('');
      pinInputRef.current?.focus();
    }
  };

  const handleExitAdmin = () => {
    triggerHaptic('light');
    setRole('Pickeur');
    setActiveTab('home');
    showToast('Retour au mode standard');
  };

  const handleUpdateClick = () => {
    triggerHaptic('medium');
    applyUpdate();
  };

  return (
    <>
      <header className="w-full bg-[#FFFFFF] dark:bg-slate-900 border-b border-[#E0E0E6]/80 dark:border-slate-800 sticky top-0 z-30 shadow-[0_2px_8px_rgba(0,0,0,0.04)] px-3 sm:px-5 py-2 sm:py-2.5 pt-safe transition-colors">
        <div className="max-w-[850px] mx-auto flex items-center justify-between gap-2 sm:gap-3">
          {/* Application logo aligned to the left (8 clicks unlocks Admin PIN) */}
          <div
            onClick={handleLogoClick}
            className="flex items-center gap-2 cursor-pointer select-none group min-w-0 shrink-1"
          >
            <div className="w-[34px] h-[34px] sm:w-[38px] sm:h-[38px] rounded-full bg-white dark:bg-slate-800 flex items-center justify-center p-0.5 shadow-2xs border border-gray-100 dark:border-slate-700 group-hover:scale-105 transition-transform shrink-0">
              <img
                src="/assets/aistudio/icon_03400f86.png"
                alt="Livry Code Finder"
                className="w-full h-full object-contain"
                loading="eager"
              />
            </div>
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-1 leading-none">
                <span className="text-[15px] sm:text-[17px] font-black tracking-tight text-[#0759A4] dark:text-blue-400">
                  Livry
                </span>
                <span className="text-[10px] sm:text-[11px] font-black text-[#171717] dark:text-slate-100 tracking-wider uppercase">
                  FINDER
                </span>
              </div>
              <span className="text-[8.5px] sm:text-[9.5px] font-semibold text-[#757575] dark:text-slate-400 tracking-tight mt-0.5 hidden xs:inline truncate">
                Marjane &amp; Aswak Assalam
              </span>
            </div>
          </div>

          {/* Right Header Area: Dark Mode + PWA Install + "Mise à jour" */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Dark Mode Toggle Button */}
            <button
              type="button"
              onClick={() => {
                triggerHaptic('light');
                toggleDarkMode();
              }}
              title={isDarkMode ? 'Activer le mode jour' : 'Activer le mode nuit (dark mode)'}
              aria-label="Changer de thème"
              className="p-1.5 sm:p-2 rounded-[10px] sm:rounded-[12px] bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-amber-400 border border-gray-200 dark:border-slate-700 hover:bg-gray-200 dark:hover:bg-slate-700 transition active:scale-95 cursor-pointer select-none min-h-[32px] min-w-[32px] sm:min-h-[36px] sm:min-w-[36px] flex items-center justify-center"
            >
              {isDarkMode ? (
                <Sun className="w-4 h-4 text-amber-400" />
              ) : (
                <Moon className="w-4 h-4 text-slate-700" />
              )}
            </button>

            {/* Install PWA Button on mobile/desktop */}
            <PWAInstallButton />

            {/* Bouton de Statut & Mise à jour */}
            {dataUpdateStatus === 'update-available' ? (
              <button
                type="button"
                onClick={handleUpdateClick}
                disabled={isSyncing}
                title="Des nouvelles données sont prêtes ! Cliquez pour mettre à jour"
                aria-label="Mise à jour"
                className="flex items-center justify-center gap-1 p-1.5 sm:px-3 sm:py-2 rounded-[10px] sm:rounded-[12px] bg-[#0759A4] hover:bg-[#064a88] text-white font-black text-[11px] sm:text-xs shadow-md shadow-blue-500/25 ring-2 ring-blue-400/50 active:scale-95 transition cursor-pointer select-none min-h-[32px] sm:min-h-[36px] shrink-0"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-white shrink-0 ${isSyncing ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline font-black tracking-tight">Mise à jour</span>
              </button>
            ) : isSyncing ? (
              <button
                type="button"
                disabled
                aria-label="Mise à jour en cours"
                className="flex items-center justify-center gap-1 p-1.5 sm:px-3 sm:py-2 rounded-[10px] sm:rounded-[12px] bg-[#0759A4]/90 text-white font-black text-[11px] sm:text-xs shadow-xs select-none min-h-[32px] sm:min-h-[36px] shrink-0"
              >
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-white shrink-0" />
                <span className="hidden sm:inline font-black tracking-tight">Mise à jour...</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleUpdateClick}
                title={lastSyncTimestamp ? `${lastSyncTimestamp} - Cliquez pour actualiser` : 'Catalogue à jour - Cliquez pour actualiser'}
                aria-label="À jour"
                className="flex items-center justify-center gap-1 p-1.5 sm:px-3 sm:py-2 rounded-[10px] sm:rounded-[12px] bg-[#EAF8F1] dark:bg-emerald-950/40 hover:bg-[#D4F4E4] dark:hover:bg-emerald-900/50 active:bg-[#BFE9D4] text-[#1E8E55] dark:text-emerald-300 border border-[#28B873]/40 text-[11px] sm:text-xs font-black transition shadow-xs active:scale-95 cursor-pointer select-none min-h-[32px] sm:min-h-[36px] shrink-0"
              >
                <Check className="w-3.5 h-3.5 text-[#28B873] stroke-[3] shrink-0" />
                <span className="hidden sm:inline font-black tracking-tight">À jour</span>
              </button>
            )}

            {/* Mode Admin : Données et Quitter (Visible UNIQUEMENT après déverrouillage) */}
            {role === 'Admin' && (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic('medium');
                    setSelectedDepartment(null);
                    setActiveTab('admin');
                  }}
                  title="Accéder au panneau Données Admin & Base Supabase"
                  aria-label="Données Admin"
                  className={`flex items-center justify-center gap-1 p-1.5 sm:px-2.5 sm:py-2 rounded-[10px] sm:rounded-[12px] font-black text-[11px] sm:text-xs transition shadow-xs active:scale-95 cursor-pointer select-none border min-h-[32px] sm:min-h-[36px] shrink-0 ${
                    activeTab === 'admin'
                      ? 'bg-[#B43167] text-white border-[#B43167] ring-2 ring-[#B43167]/30'
                      : 'bg-[#FDF0F5] hover:bg-[#FCE4EC] text-[#B43167] border-[#B43167]/30'
                  }`}
                >
                  <Database className="w-3.5 h-3.5 shrink-0" />
                  <span className="hidden sm:inline font-black tracking-tight">Données</span>
                </button>
                <button
                  type="button"
                  onClick={handleExitAdmin}
                  title="Quitter le mode Administrateur"
                  aria-label="Quitter Admin"
                  className="p-1.5 sm:px-2 sm:py-2 rounded-[10px] sm:rounded-[12px] bg-gray-100 hover:bg-gray-200 text-gray-700 transition cursor-pointer min-h-[32px] sm:min-h-[36px] shrink-0"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Admin Password Prompt Modal (1997) */}
      {isPinModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-xs bg-white rounded-[22px] p-5 shadow-2xl border border-gray-200 animate-in zoom-in-95 duration-150 relative">
            <button
              type="button"
              onClick={() => setIsPinModalOpen(false)}
              className="absolute top-3.5 right-3.5 p-1 text-gray-400 hover:text-gray-600 rounded-lg cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex flex-col items-center text-center">
              <div className="w-12 h-12 rounded-full bg-[#FDF0F5] border border-[#B43167]/20 flex items-center justify-center text-[#B43167] mb-3">
                <Lock className="w-5 h-5" />
              </div>

              <h3 className="text-sm font-bold text-[#171717]">Accès Administrateur</h3>
              <p className="text-[11px] text-gray-500 mt-1 mb-4">
                Saisissez le code PIN pour gérer le catalogue et les tutoriels.
              </p>

              <form onSubmit={handleVerifyPin} className="w-full space-y-3">
                <div>
                  <input
                    ref={pinInputRef}
                    type="password"
                    inputMode="numeric"
                    autoComplete="current-password"
                    maxLength={10}
                    value={adminPin}
                    onChange={(e) => {
                      setAdminPin(e.target.value);
                      if (pinError) setPinError(false);
                    }}
                    placeholder="••••"
                    className={`w-full text-center text-lg tracking-[0.4em] font-bold py-2.5 px-3 rounded-[14px] border ${
                      pinError
                        ? 'border-rose-500 bg-rose-50/50 text-rose-700'
                        : 'border-gray-200 focus:border-[#B43167] bg-gray-50/60'
                    } outline-none transition`}
                  />
                  {pinError && (
                    <div className="flex items-center justify-center gap-1 mt-2 text-rose-600 text-[11px] font-bold">
                      <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
                      <span>Code PIN incorrect</span>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setIsPinModalOpen(false)}
                    className="py-2 px-3 rounded-[12px] border border-gray-200 text-xs font-bold text-gray-600 hover:bg-gray-50 cursor-pointer"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={!adminPin.trim()}
                    className="py-2 px-3 rounded-[12px] bg-[#B43167] hover:bg-[#992655] text-white text-xs font-bold shadow-xs active:scale-95 transition cursor-pointer disabled:opacity-40"
                  >
                    Valider
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

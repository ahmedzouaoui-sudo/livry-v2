import React, { useState, useRef } from 'react';
import { LogOut, Database } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { triggerHaptic } from '../utils/haptics';
import { PWAInstallButton } from './PWAInstallButton';
import { AdminAuthModal } from './AdminAuthModal';

export const Header: React.FC = () => {
  const { role, setRole, activeTab, setActiveTab, setSearchQuery, showToast } = useApp();

  // Secret 8-click counter on the logo to open Admin authentication
  const [logoTapCount, setLogoTapCount] = useState(0);
  const tapTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Admin auth modal state
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);

  const handleLogoClick = () => {
    triggerHaptic('light');
    setSearchQuery('');
    setActiveTab('home');

    if (tapTimeoutRef.current) {
      clearTimeout(tapTimeoutRef.current);
    }

    const nextTap = logoTapCount + 1;
    if (nextTap >= 8) {
      setLogoTapCount(0);
      if (role === 'Admin') {
        setActiveTab('admin');
        showToast('Panneau Administrateur ouvert');
      } else {
        triggerHaptic('medium');
        setIsPinModalOpen(true);
      }
    } else {
      setLogoTapCount(nextTap);
      tapTimeoutRef.current = setTimeout(() => {
        setLogoTapCount(0);
      }, 2500);
    }
  };

  const handleLogoutAdmin = () => {
    triggerHaptic('light');
    setRole('Pickeur');
    if (activeTab === 'admin') {
      setActiveTab('home');
    }
    showToast('Retour au mode Pickeur standard');
  };

  return (
    <>
      <header className="sticky top-0 z-40 w-full bg-white/70 dark:bg-[#070B14]/70 backdrop-blur-xl border-b border-white/60 dark:border-white/10 shadow-[0_4px_24px_rgba(7,89,164,0.06)] transition-colors">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 h-[56px] sm:h-[62px] flex items-center justify-between gap-2">
          {/* Icon-Only Brand Logo (8-click secret admin access preserved) */}
          <button
            type="button"
            onClick={handleLogoClick}
            title="Livry Finder"
            aria-label="Accueil Livry Finder"
            className="flex items-center justify-center cursor-pointer active:scale-95 transition-transform select-none group shrink-0"
          >
            <div className="w-[40px] h-[40px] sm:w-[44px] sm:h-[44px] rounded-[13px] bg-white/85 dark:bg-white/10 backdrop-blur-md border border-white/90 dark:border-white/15 shadow-[0_4px_14px_rgba(7,89,164,0.12)] flex items-center justify-center p-1.5 overflow-hidden group-hover:shadow-[0_6px_18px_rgba(7,89,164,0.18)] transition-all">
              <img
                src="/assets/aistudio/icon_03400f86.png"
                alt="Livry Finder"
                className="w-full h-full object-contain"
                loading="eager"
                decoding="async"
              />
            </div>
          </button>

          {/* Right Actions: PWA Install + Admin Controls */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <PWAInstallButton />

            {role === 'Admin' && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic('light');
                    setActiveTab(activeTab === 'admin' ? 'home' : 'admin');
                  }}
                  className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-[12px] text-[11px] sm:text-xs font-extrabold transition active:scale-95 cursor-pointer select-none backdrop-blur-md ${
                    activeTab === 'admin'
                      ? 'bg-[#0759A4] text-white shadow-md shadow-blue-900/20'
                      : 'bg-blue-50/75 dark:bg-blue-950/60 hover:bg-blue-100/90 dark:hover:bg-blue-900/70 text-[#0759A4] dark:text-blue-300 border border-blue-200/80 dark:border-blue-800/70'
                  }`}
                >
                  <Database className="w-3.5 h-3.5" />
                  <span>Données</span>
                </button>

                <button
                  type="button"
                  onClick={handleLogoutAdmin}
                  title="Quitter le mode Admin"
                  className="p-2 rounded-[12px] bg-white/70 dark:bg-white/10 backdrop-blur-md border border-white/80 dark:border-white/10 text-gray-500 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50/80 dark:hover:bg-red-950/40 transition cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Secure Admin Auth Modal */}
      <AdminAuthModal
        isOpen={isPinModalOpen}
        onClose={() => setIsPinModalOpen(false)}
        onSuccess={() => {
          setRole('Admin');
          setIsPinModalOpen(false);
          setActiveTab('admin');
          showToast('Mode Administrateur déverrouillé !');
        }}
      />
    </>
  );
};

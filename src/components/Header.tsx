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
      <header className="sticky top-0 z-40 w-full bg-white/78 backdrop-blur-md border-b border-white/70 shadow-[0_4px_20px_rgba(7,89,164,0.06)]">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 h-[56px] sm:h-[62px] flex items-center justify-between gap-2">
          {/* Icon-Only Brand Logo (8-click secret admin access preserved) */}
          <button
            type="button"
            onClick={handleLogoClick}
            title="Livry Finder"
            aria-label="Accueil Livry Finder"
            className="flex items-center justify-center cursor-pointer active:scale-95 transition-transform select-none group shrink-0"
          >
            <div className="w-[40px] h-[40px] sm:w-[44px] sm:h-[44px] rounded-[13px] bg-white/85 border border-white/90 shadow-[0_4px_12px_rgba(7,89,164,0.10)] flex items-center justify-center p-1.5 overflow-hidden">
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
                  className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-[12px] text-[11px] sm:text-xs font-extrabold transition-colors active:scale-95 cursor-pointer select-none ${
                    activeTab === 'admin'
                      ? 'bg-[#0759A4] text-white shadow-sm'
                      : 'bg-blue-50/80 hover:bg-blue-100/90 text-[#0759A4] border border-blue-200/80'
                  }`}
                >
                  <Database className="w-3.5 h-3.5" />
                  <span>Données</span>
                </button>

                <button
                  type="button"
                  onClick={handleLogoutAdmin}
                  title="Quitter le mode Admin"
                  className="p-2 rounded-[12px] bg-white/75 border border-white/85 text-gray-500 hover:text-red-600 hover:bg-red-50/85 transition-colors cursor-pointer"
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

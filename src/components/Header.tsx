import React, { useState, useRef, useEffect } from 'react';
import { LogOut, Database, ArrowLeft } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { triggerHaptic } from '../utils/haptics';
import { PWAInstallButton } from './PWAInstallButton';
import { AdminAuthModal } from './AdminAuthModal';

export const Header: React.FC = () => {
  const {
    role,
    setRole,
    activeTab,
    setActiveTab,
    selectedDepartment,
    setSelectedDepartment,
    suggestActiveView,
    setSuggestActiveView,
    setSuggestInitialProduct,
    searchQuery,
    setSearchQuery,
    showToast,
  } = useApp();

  // Secret 8-click counter on the logo to open Admin authentication
  const [logoTapCount, setLogoTapCount] = useState(0);
  const tapTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Admin auth modal state
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);

  const canGoBack = activeTab !== 'home' || searchQuery.trim().length > 0;
  const routeSignature = `${activeTab}|${selectedDepartment || ''}|${
    activeTab === 'suggest' ? suggestActiveView : ''
  }|${searchQuery.trim().length > 0 ? 'search' : ''}`;

  const [showBackButton, setShowBackButton] = useState(canGoBack);
  const [subNavAnimKey, setSubNavAnimKey] = useState(0);
  const prevCanGoBackRef = useRef(canGoBack);
  const prevRouteRef = useRef(routeSignature);

  // Every time user enters a section/sub-view: animate icon first, then reveal Back button
  useEffect(() => {
    const prevCanGoBack = prevCanGoBackRef.current;
    const prevRoute = prevRouteRef.current;
    prevCanGoBackRef.current = canGoBack;
    prevRouteRef.current = routeSignature;

    if (!canGoBack) {
      setShowBackButton(false);
      return;
    }

    if (prevRoute === routeSignature) {
      return;
    }

    if (!prevCanGoBack && canGoBack) {
      // Entering from Home: icon glides left -> center first, then Back button appears
      setShowBackButton(false);
      const timer = setTimeout(() => {
        setShowBackButton(true);
      }, 210);
      return () => clearTimeout(timer);
    }

    // Entering a deeper destination while away from Home: pop-animate icon, then reveal Back button
    setSubNavAnimKey((k) => k + 1);
    setShowBackButton(false);
    const timer = setTimeout(() => {
      setShowBackButton(true);
    }, 180);
    return () => clearTimeout(timer);
  }, [canGoBack, routeSignature]);

  const handleBackClick = () => {
    triggerHaptic('light');
    if (activeTab === 'library') {
      if (selectedDepartment) {
        setSelectedDepartment(null);
      } else {
        setActiveTab('home');
      }
      return;
    }
    if (activeTab === 'suggest') {
      if (suggestActiveView === 'form' || suggestActiveView === 'missing') {
        setSuggestInitialProduct(null);
        setSuggestActiveView('hub');
      } else {
        setActiveTab('home');
      }
      return;
    }
    if (activeTab === 'tips' || activeTab === 'admin') {
      setActiveTab('home');
      return;
    }
    if (searchQuery.trim().length > 0) {
      setSearchQuery('');
    }
  };

  const handleLogoClick = () => {
    triggerHaptic('light');
    setSearchQuery('');
    setSelectedDepartment(null);
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
      <header className="fixed top-0 inset-x-0 z-40 w-full bg-white/80 backdrop-blur-md border-b border-white/75 shadow-[0_4px_20px_rgba(7,89,164,0.06)]">
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 h-[60px] sm:h-[64px] flex items-center justify-between gap-2">
          {/* Left: Icon-Only Back Button (appears AFTER logo icon animates) */}
          <div className="relative z-10 flex items-center">
            <button
              type="button"
              onClick={handleBackClick}
              disabled={!canGoBack || !showBackButton}
              aria-hidden={!canGoBack || !showBackButton}
              title="Retour"
              aria-label="Retour"
              className={`w-10 h-10 sm:w-11 sm:h-11 rounded-[14px] glass-pill hover:bg-white/95 border border-white/90 shadow-[0_3px_10px_rgba(7,89,164,0.08)] flex items-center justify-center select-none transition-all duration-250 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                canGoBack && showBackButton
                  ? 'opacity-100 translate-x-0 scale-100 pointer-events-auto cursor-pointer active:scale-95'
                  : 'opacity-0 -translate-x-2.5 scale-75 pointer-events-none'
              }`}
            >
              <ArrowLeft className="w-5 h-5 text-[#0759A4]" />
            </button>
          </div>

          {/* Animated App Icon: Stays on Left Side on Home, glides smoothly to Center on navigation */}
          <button
            type="button"
            onClick={handleLogoClick}
            title="Livry Finder"
            aria-label="Accueil Livry Finder"
            className={`absolute top-1/2 -translate-y-1/2 z-20 flex items-center justify-center cursor-pointer active:scale-95 select-none group shrink-0 transition-[left,transform] duration-[420ms] ease-[cubic-bezier(0.22,1,0.36,1)] ${
              canGoBack ? 'left-1/2 -translate-x-1/2' : 'left-4 sm:left-6 translate-x-0'
            }`}
          >
            <div
              key={subNavAnimKey}
              className={`w-[42px] h-[42px] sm:w-[46px] sm:h-[46px] rounded-[14px] bg-white/90 border border-white/95 shadow-[0_4px_12px_rgba(7,89,164,0.10)] flex items-center justify-center p-1.5 overflow-hidden ${
                subNavAnimKey > 0 && canGoBack ? 'animate-logo-enter-pop' : ''
              }`}
            >
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
          <div className="relative z-10 ml-auto flex items-center gap-1.5 sm:gap-2 shrink-0">
            <PWAInstallButton />

            {role === 'Admin' && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic('light');
                    setActiveTab(activeTab === 'admin' ? 'home' : 'admin');
                  }}
                  className={`flex items-center gap-1.5 px-2.5 sm:px-3.5 py-2 rounded-[13px] text-[11px] sm:text-xs font-extrabold transition-colors active:scale-95 cursor-pointer select-none ${
                    activeTab === 'admin'
                      ? 'bg-[#0759A4] text-white shadow-sm'
                      : 'bg-blue-50/85 hover:bg-blue-100/90 text-[#0759A4] border border-blue-200/80'
                  }`}
                >
                  <Database className="w-3.5 h-3.5" />
                  <span className="hidden xs:inline">Données</span>
                </button>

                <button
                  type="button"
                  onClick={handleLogoutAdmin}
                  title="Quitter le mode Admin"
                  className="p-2.5 rounded-[13px] bg-white/80 border border-white/90 text-gray-500 hover:text-red-600 hover:bg-red-50/85 transition-colors cursor-pointer"
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

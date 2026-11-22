import React, { useEffect, useRef } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Header } from './components/Header';
import { HomeScreen } from './components/HomeScreen';
import { BibliothequeScreen } from './components/BibliothequeScreen';
import { ProductListScreen } from './components/ProductListScreen';
import { SuggestOneScreen } from './components/SuggestOneScreen';
import { AstucesScreen } from './components/AstucesScreen';
import { AdminDashboard } from './components/AdminDashboard';
import { ProductDetailModal } from './components/ProductDetailModal';
import { OfflineIndicator } from './components/OfflineIndicator';
import { triggerHaptic } from './utils/haptics';
import { Department, Product } from './types';
import {
  checkServerVersion,
  forceHardRefreshApp,
} from './services/versionGuardService';

const MainLayout: React.FC = () => {
  const {
    activeTab,
    setActiveTab,
    products,
    selectedDepartment,
    setSelectedDepartment,
    searchQuery,
    selectedProduct,
    setSelectedProduct,
    toastMessage,
    showToast,
  } = useApp();

  const handleOpenLibraryDept = (dept: Department) => {
    setSelectedDepartment(dept);
  };

  const handleSelectProduct = (product: Product) => {
    setSelectedProduct(product);
  };

  const handleCopySuccess = (code: string) => {
    triggerHaptic('success');
    showToast(`Code-barres ${code} copié dans le presse-papier !`);
  };

  return (
    <div className="min-h-dvh flex flex-col bg-[#F8F7FC] dark:bg-[#070B14] text-gray-900 dark:text-slate-100 antialiased selection:bg-blue-100 selection:text-[#0759A4] transition-colors relative overflow-x-hidden">
      {/* Ambient Glassmorphism Depth Orbs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0" aria-hidden="true">
        <div className="absolute -top-28 -left-24 w-[420px] h-[420px] rounded-full bg-blue-400/20 dark:bg-blue-600/18 blur-[110px]" />
        <div className="absolute top-1/3 -right-28 w-[380px] h-[380px] rounded-full bg-sky-300/22 dark:bg-indigo-600/16 blur-[110px]" />
        <div className="absolute -bottom-28 left-1/4 w-[360px] h-[360px] rounded-full bg-emerald-300/16 dark:bg-emerald-600/10 blur-[110px]" />
      </div>

      <div className="relative z-10 flex-1 flex flex-col">
        {/* Mandatory Internet Requirement Block */}
        <OfflineIndicator />

        {/* Slim Top Header */}
        <Header />

        {/* Main Screen Switcher */}
        <main className="flex-1 w-full flex flex-col">
          {activeTab === 'home' && <HomeScreen />}

          {activeTab === 'library' && !selectedDepartment && (
            <BibliothequeScreen
              onBack={() => setActiveTab('home')}
              onSelectDepartment={handleOpenLibraryDept}
            />
          )}

          {activeTab === 'library' && selectedDepartment && (
            <ProductListScreen
              products={products}
              selectedDepartment={selectedDepartment}
              initialQuery={searchQuery}
              onBack={() => setSelectedDepartment(null)}
              onSelectProduct={handleSelectProduct}
            />
          )}

          {activeTab === 'suggest' && (
            <SuggestOneScreen onBack={() => setActiveTab('home')} />
          )}

          {activeTab === 'tips' && (
            <AstucesScreen onBack={() => setActiveTab('home')} />
          )}

          {activeTab === 'admin' && <AdminDashboard />}
        </main>

        {/* Full-Screen Barcode Product Detail Sheet */}
        {selectedProduct && (
          <ProductDetailModal
            product={selectedProduct}
            onClose={() => setSelectedProduct(null)}
            onCopySuccess={handleCopySuccess}
          />
        )}

        {/* Floating Toast Feedback */}
        {toastMessage && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-slate-900/85 dark:bg-slate-800/85 backdrop-blur-xl text-white px-4 py-2.5 rounded-2xl shadow-2xl border border-white/15 text-xs font-bold flex items-center gap-2 animate-in fade-in slide-in-from-bottom-4 duration-200 max-w-[90vw] text-center">
            <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
            <span className="truncate">{toastMessage}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export function App() {
  const isAutoRefreshingRef = useRef(false);

  // Automatic silent self-refresh when a newer version is deployed on the server
  useEffect(() => {
    let cancelled = false;

    const triggerAutoRefresh = (remoteBuildId?: string) => {
      if (cancelled || isAutoRefreshingRef.current) return;
      isAutoRefreshingRef.current = true;
      void forceHardRefreshApp(remoteBuildId);
    };

    const runCheck = async () => {
      if (cancelled || isAutoRefreshingRef.current || !navigator.onLine) return;
      const result = await checkServerVersion();
      if (!cancelled && result.outdated) {
        triggerAutoRefresh(result.remoteBuildId);
      }
    };

    // 1. Immediate check on app startup
    runCheck();

    // 2. Periodic check every 30 seconds while app stays open
    const intervalId = setInterval(runCheck, 30_000);

    // 3. Re-check on tab focus, visibility return, and network reconnect
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        runCheck();
      }
    };
    const handleFocus = () => runCheck();
    const handleOnline = () => runCheck();
    const handleOutdatedEvent = () => triggerAutoRefresh();

    window.addEventListener('focus', handleFocus);
    window.addEventListener('online', handleOnline);
    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('livry:version-outdated', handleOutdatedEvent);

    return () => {
      cancelled = true;
      clearInterval(intervalId);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('online', handleOnline);
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('livry:version-outdated', handleOutdatedEvent);
    };
  }, []);

  return (
    <AppProvider>
      <MainLayout />
    </AppProvider>
  );
}

export default App;

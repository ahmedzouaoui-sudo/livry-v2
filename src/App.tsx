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
    <div className="min-h-dvh flex flex-col bg-[#F8F7FC] text-gray-900 antialiased selection:bg-blue-100 selection:text-[#0759A4] relative overflow-x-hidden">
      {/* Cached Static Gaussian Blur Ambient Orbs for Subtle Glassmorphism Depth */}
      <div
        className="fixed inset-0 pointer-events-none overflow-hidden z-0"
        aria-hidden="true"
        style={{ contain: 'strict', transform: 'translateZ(0)' }}
      >
        <div className="absolute -top-24 -left-20 w-[340px] h-[340px] rounded-full bg-blue-400/20 blur-[72px]" />
        <div className="absolute top-1/3 -right-24 w-[320px] h-[320px] rounded-full bg-sky-300/22 blur-[72px]" />
        <div className="absolute -bottom-24 left-1/4 w-[300px] h-[300px] rounded-full bg-emerald-300/16 blur-[72px]" />
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

        {/* Floating Glass Toast Feedback */}
        {toastMessage && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-slate-900/85 backdrop-blur-md text-white px-4 py-2.5 rounded-2xl shadow-xl border border-white/15 text-xs font-bold flex items-center gap-2 max-w-[90vw] text-center">
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

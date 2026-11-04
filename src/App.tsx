/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Header } from './components/Header';
import { HomeScreen } from './components/HomeScreen';
import { BibliothequeScreen } from './components/BibliothequeScreen';
import { ProductListScreen } from './components/ProductListScreen';
import { AstucesScreen } from './components/AstucesScreen';
import { AdminDashboard } from './components/AdminDashboard';
import { SuggestOneScreen } from './components/SuggestOneScreen';
import { ProductDetailModal } from './components/ProductDetailModal';
import { OfflineIndicator } from './components/OfflineIndicator';
import { Check } from 'lucide-react';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Department } from './types';

const MainLayout: React.FC = () => {
  const {
    products,
    activeTab,
    setActiveTab,
    selectedDepartment,
    setSelectedDepartment,
    selectedProduct,
    setSelectedProduct,
    setSearchQuery,
    toastMessage,
    showToast,
  } = useApp();

  const handleSelectDepartment = (dept: Department) => {
    setSelectedDepartment(dept);
    setActiveTab('library');
  };

  const handleBackFromProductList = () => {
    if (selectedDepartment) {
      setSelectedDepartment(null);
    } else {
      setSearchQuery('');
      setActiveTab('home');
    }
  };

  const isDepartmentListActive = activeTab === 'library' && selectedDepartment !== null;

  return (
    <div className="min-h-[100dvh] bg-[#F8F7FC] dark:bg-slate-950 text-[#171717] dark:text-slate-100 flex flex-col font-['Montserrat',sans-serif] selection:bg-[#0759A4]/15 selection:text-[#0759A4] transition-colors">
      {/* Header with Application logo aligned to the left */}
      <Header
        onLogoClick={() => {
          setSelectedDepartment(null);
          setSearchQuery('');
          setActiveTab('home');
        }}
      />

      {/* Main Content Router - Pure Barcodes & Astuces */}
      <main className="flex-1 w-full max-w-[850px] mx-auto flex flex-col px-2 sm:px-4">
        {activeTab === 'admin' ? (
          <AdminDashboard />
        ) : activeTab === 'tips' ? (
          <AstucesScreen onBack={() => setActiveTab('home')} />
        ) : activeTab === 'suggest' ? (
          <SuggestOneScreen onBack={() => setActiveTab('home')} />
        ) : isDepartmentListActive ? (
          <ProductListScreen
            products={products}
            selectedDepartment={selectedDepartment}
            onBack={handleBackFromProductList}
            onSelectProduct={(p) => setSelectedProduct(p)}
          />
        ) : activeTab === 'library' ? (
          <BibliothequeScreen
            onBack={() => setActiveTab('home')}
            onSelectDepartment={handleSelectDepartment}
          />
        ) : (
          <HomeScreen />
        )}
      </main>

      {/* Product Detail Modal */}
      {selectedProduct && (
        <ProductDetailModal
          product={selectedProduct}
          onClose={() => setSelectedProduct(null)}
          onCopySuccess={(code) => showToast(`Code-barres ${code} copié !`)}
        />
      )}

      {/* Offline Status Floating Pill */}
      <OfflineIndicator />

      {/* Global Toast Notification */}
      {toastMessage && (
        <div className="fixed top-18 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-2.5 rounded-[16px] bg-[#171717]/95 text-white text-xs font-bold shadow-xl border border-white/10 animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center shrink-0">
            <Check className="w-3 h-3 text-white" />
          </div>
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
};

export default function App() {
  return (
    <ErrorBoundary>
      <AppProvider>
        <MainLayout />
      </AppProvider>
    </ErrorBoundary>
  );
}

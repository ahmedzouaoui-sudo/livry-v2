import React, { useState, useMemo } from 'react';
import { ArrowLeft, ShoppingBag, Database, Edit3, Trash2 } from 'lucide-react';
import { Department, Product } from '../types';
import {
  DEPARTMENT_CONFIGS,
  filterProducts,
  formatProductCodeBadge,
  getProductDisplayStatus,
  getPrimaryBarcode,
  isProductVisibleInCatalog,
} from '../utils/productUtils';
import { useApp } from '../context/AppContext';
import { triggerHaptic } from '../utils/haptics';
import { Verified100Badge, getProductVerificationStatus } from './Verified100Badge';

interface ProductListScreenProps {
  products: Product[];
  selectedDepartment: Department | null;
  initialQuery?: string;
  onBack: () => void;
  onSelectProduct: (p: Product) => void;
}

export const ProductListScreen: React.FC<ProductListScreenProps> = ({
  products,
  selectedDepartment,
  onBack,
  onSelectProduct,
}) => {
  const { role, setActiveTab, barcodeVotes, noCodeSettings, openSuggestForProduct, deleteProduct, showToast } = useApp();
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [visibleCount, setVisibleCount] = useState(60);

  React.useEffect(() => {
    setVisibleCount(60);
  }, [selectedDepartment, selectedCategory]);

  const deptConfig = selectedDepartment
    ? DEPARTMENT_CONFIGS[selectedDepartment]
    : DEPARTMENT_CONFIGS['Fruits et légumes'];

  // Categories in this department (sorted A-Z)
  const categories = useMemo(() => {
    const list = products.filter((p) => {
      if (selectedDepartment && p.department !== selectedDepartment) return false;
      return isProductVisibleInCatalog(p, barcodeVotes, noCodeSettings);
    });

    const unique = Array.from(new Set(list.map((p) => p.category).filter(Boolean)));
    return unique.sort((a, b) => a.localeCompare(b, 'fr', { sensitivity: 'base' }));
  }, [products, selectedDepartment, barcodeVotes, noCodeSettings]);

  const filtered = useMemo(() => {
    return filterProducts(
      products,
      '',
      selectedDepartment || 'ALL',
      selectedCategory,
      true,
      false,
      barcodeVotes,
      undefined,
      noCodeSettings
    );
  }, [products, selectedDepartment, selectedCategory, barcodeVotes, noCodeSettings]);

  const visibleProducts = useMemo(
    () => filtered.slice(0, visibleCount),
    [filtered, visibleCount]
  );

  const title = selectedDepartment || 'Catalogue des produits';

  const handleProductClick = (product: Product) => {
    const status = getProductDisplayStatus(product, barcodeVotes, noCodeSettings);
    if (status === 'UNAVAILABLE_NO_BARCODE') {
      triggerHaptic('warning');
      return;
    }
    triggerHaptic('light');
    onSelectProduct(product);
  };

  return (
    <div className="w-full max-w-[800px] mx-auto px-2.5 sm:px-4 py-2 pb-20 flex flex-col min-h-[calc(100dvh-60px)] pb-safe">
      {/* Top Header with Back Button */}
      <div className="flex items-center gap-2 mb-2.5">
        <button
          type="button"
          onClick={() => {
            triggerHaptic('light');
            onBack();
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-gray-800 glass-surface hover:bg-white active:scale-95 transition-colors font-bold text-xs shrink-0 cursor-pointer select-none"
          aria-label="Retour"
        >
          <ArrowLeft className="w-4 h-4 text-[#0759A4]" />
          <span>Retour</span>
        </button>

        <h1 className="text-xs sm:text-sm font-extrabold text-gray-900 truncate flex-1 tracking-tight">
          {title}
        </h1>

        {role === 'Admin' && (
          <button
            type="button"
            onClick={() => {
              triggerHaptic('medium');
              setActiveTab('admin');
            }}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-[#0759A4] border border-blue-200 text-[11px] font-black transition-colors active:scale-95 cursor-pointer shadow-2xs shrink-0 select-none"
            title="Ouvrir le panneau Données"
          >
            <Database className="w-3.5 h-3.5" />
            <span>Data</span>
          </button>
        )}
      </div>

      {/* Categories Filter Bar */}
      {categories.length > 0 && (
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 mb-2.5 no-scrollbar select-none touch-pan-x">
          <button
            type="button"
            onClick={() => {
              triggerHaptic('light');
              setSelectedCategory('ALL');
            }}
            className={`px-3 py-1.5 rounded-full text-xs font-bold transition-colors shrink-0 cursor-pointer select-none tabular-nums whitespace-nowrap ${
              selectedCategory === 'ALL'
                ? 'bg-gray-900 text-white shadow-xs'
                : 'glass-pill text-gray-600 hover:bg-white'
            }`}
          >
            Toutes ({filtered.length})
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => {
                triggerHaptic('light');
                setSelectedCategory(cat);
              }}
              className={`px-3 py-1.5 rounded-full text-xs font-bold transition-colors shrink-0 cursor-pointer select-none whitespace-nowrap ${
                selectedCategory === cat
                  ? 'bg-[#0759A4] text-white shadow-xs'
                  : 'glass-pill text-gray-600 hover:bg-white'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      {/* Products Grid: Category colored cards with white text and white code badges */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 sm:gap-2.5">
        {filtered.length > 0 ? (
          visibleProducts.map((product) => {
            const productDeptConfig = DEPARTMENT_CONFIGS[product.department] || deptConfig;
            const displayCodeLabel = formatProductCodeBadge(
              product.code,
              product,
              barcodeVotes,
              noCodeSettings
            );
            const showMissingPrompt = displayCodeLabel === 'Indisponible';
            const primaryBarcode = getPrimaryBarcode(product, barcodeVotes);

            return (
              <div
                key={product.id}
                onClick={() => handleProductClick(product)}
                className="cv-grid-card rounded-[15px] sm:rounded-[17px] p-2 sm:p-2.5 flex flex-col justify-between shadow-2xs active:scale-[0.98] transition-transform duration-100 cursor-pointer select-none border border-black/10"
                style={{ backgroundColor: productDeptConfig.accentColor }}
              >
                {/* 1. White Image Thumbnail Box */}
                <div className="relative w-full aspect-square rounded-[12px] bg-white border border-black/5 flex items-center justify-center overflow-hidden mb-1.5 p-1.5 shadow-2xs">
                  {role === 'Admin' && (
                    <div className="absolute top-1.5 right-1.5 flex items-center gap-1 z-10">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          triggerHaptic('light');
                          onSelectProduct(product);
                        }}
                        className="p-1.5 rounded-lg bg-[#0759A4] text-white hover:bg-blue-700 transition-colors shadow-xs cursor-pointer"
                        title="Modifier cet article (Admin)"
                      >
                        <Edit3 className="w-3 h-3 text-white" />
                      </button>
                      <button
                        type="button"
                        onClick={async (e) => {
                          e.stopPropagation();
                          if (confirmDeleteId !== product.id) {
                            triggerHaptic('warning');
                            setConfirmDeleteId(product.id);
                            setTimeout(() => {
                              setConfirmDeleteId((prev) => (prev === product.id ? null : prev));
                            }, 3500);
                            return;
                          }
                          setConfirmDeleteId(null);
                          triggerHaptic('warning');
                          await deleteProduct(product.id);
                          showToast(`🗑️ "${product.name}" supprimé`);
                        }}
                        className={`px-1.5 py-1.5 rounded-lg text-white transition-colors shadow-xs cursor-pointer inline-flex items-center gap-0.5 text-[9.5px] font-black ${
                          confirmDeleteId === product.id
                            ? 'bg-red-700 ring-2 ring-red-200'
                            : 'bg-red-600/90 hover:bg-red-600'
                        }`}
                        title={
                          confirmDeleteId === product.id
                            ? 'Cliquer encore pour supprimer'
                            : 'Supprimer cet article (Admin)'
                        }
                      >
                        <Trash2 className="w-3 h-3 text-white" />
                        {confirmDeleteId === product.id && <span>OK ?</span>}
                      </button>
                    </div>
                  )}
                  {product.imageUrl ? (
                    <img
                      src={product.imageUrl}
                      alt={product.name}
                      loading="lazy"
                      decoding="async"
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <ShoppingBag className="w-8 h-8 opacity-40 text-gray-400" />
                  )}
                </div>

                {/* 2. Code Badge */}
                <div className="mb-1 flex items-center gap-1.5 flex-wrap">
                  <span
                    className="inline-block text-[10px] sm:text-[11px] font-mono font-black px-1.5 py-0.5 rounded-[6px] shadow-2xs tracking-wider tabular-nums whitespace-nowrap"
                    style={{
                      backgroundColor: showMissingPrompt ? '#EA580C' : '#FFFFFF',
                      color: showMissingPrompt ? '#FFFFFF' : productDeptConfig.accentColor,
                    }}
                  >
                    {displayCodeLabel}
                  </span>

                  {showMissingPrompt && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        triggerHaptic('light');
                        openSuggestForProduct(product);
                      }}
                      className="px-1.5 py-0.5 rounded-[5px] bg-[#EA580C] hover:bg-[#C2410C] text-white text-[9px] font-black shadow-2xs active:scale-95 transition-transform duration-100 cursor-pointer select-none border border-white/20"
                      title="Ajouter le code court manquant"
                    >
                      <span>Aidez-nous</span>
                    </button>
                  )}
                </div>

                {/* 3. Product Name: White Text + 100% Verified Icon */}
                <div className="flex items-start gap-1 mt-auto">
                  <h3
                    className="text-[13px] sm:text-[14px] md:text-[15px] font-extrabold text-white leading-snug line-clamp-2 tracking-tight flex-1 min-w-0"
                    title={product.name}
                  >
                    {product.name}
                  </h3>
                  <Verified100Badge
                    variant="compact"
                    status={getProductVerificationStatus(product)}
                  />
                </div>

                {/* 4. Barcode preview */}
                {primaryBarcode && (
                  <p className="text-[9px] font-mono text-white/85 truncate mt-1 tabular-nums">
                    {primaryBarcode}
                  </p>
                )}
              </div>
            );
          })
        ) : (
          <div className="col-span-2 sm:col-span-3 md:col-span-4 glass-surface rounded-2xl p-6 text-center mt-3">
            <p className="text-xs font-bold text-gray-800">Aucun produit dans ce rayon</p>
            <p className="text-[10.5px] text-gray-500 mt-0.5">
              Tous les produits affichés disposent d&apos;un code-barres actif.
            </p>
          </div>
        )}
      </div>

      {filtered.length > visibleCount && (
        <button
          type="button"
          onClick={() => {
            triggerHaptic('light');
            setVisibleCount((prev) => prev + 60);
          }}
          className="mt-3 w-full py-2.5 rounded-2xl bg-white border border-gray-200 text-[#0759A4] hover:bg-blue-50 text-xs font-extrabold cursor-pointer transition-colors"
        >
          Afficher plus (+{filtered.length - visibleCount} restants)
        </button>
      )}
    </div>
  );
};

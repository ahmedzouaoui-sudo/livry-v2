import React, { useState, useMemo } from 'react';
import { ArrowLeft, ShoppingBag, Database } from 'lucide-react';
import { Department, Product } from '../types';
import {
  DEPARTMENT_CONFIGS,
  filterProducts,
  formatProductCodeBadge,
  getProductDisplayStatus,
  getPrimaryBarcode,
  hasProductBarcodes,
  isProductCodeXXXX,
} from '../utils/productUtils';
import { useApp } from '../context/AppContext';
import { triggerHaptic } from '../utils/haptics';

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
  const { role, setActiveTab, barcodeVotes, openSuggestForProduct } = useApp();
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  const deptConfig = selectedDepartment
    ? DEPARTMENT_CONFIGS[selectedDepartment]
    : DEPARTMENT_CONFIGS['Fruits et légumes'];

  // Categories in this department (strictly ONLY products with valid barcodes)
  const categories = useMemo(() => {
    const list = products.filter((p) => {
      if (!p.isEnabled) return false;
      if (selectedDepartment && p.department !== selectedDepartment) return false;
      if (isProductCodeXXXX(p.code)) return false;
      return hasProductBarcodes(p, barcodeVotes);
    });

    const unique = Array.from(new Set(list.map((p) => p.category).filter(Boolean)));
    return unique.sort();
  }, [products, selectedDepartment, barcodeVotes]);

  // Filter products by department and category (strictly ONLY products with valid barcodes)
  const filtered = useMemo(() => {
    return filterProducts(
      products,
      '',
      selectedDepartment || 'ALL',
      selectedCategory,
      true,
      false,
      barcodeVotes
    );
  }, [products, selectedDepartment, selectedCategory, barcodeVotes]);

  const title = selectedDepartment || 'Catalogue des produits';

  const handleProductClick = (product: Product) => {
    const status = getProductDisplayStatus(product, barcodeVotes);
    if (status === 'UNAVAILABLE_NO_BARCODE') {
      triggerHaptic('warning');
      return;
    }
    triggerHaptic('light');
    onSelectProduct(product);
  };

  return (
    <div className="w-full max-w-[800px] mx-auto px-2.5 sm:px-4 py-2 pb-20 flex flex-col min-h-[calc(100dvh-60px)] pb-safe">
      {/* Top Header with Back Button (Article count removed per user request) */}
      <div className="flex items-center gap-2 mb-2.5">
        <button
          type="button"
          onClick={() => {
            triggerHaptic('light');
            onBack();
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-[12px] text-[#0759A4] bg-white border border-[#E0E0E6]/80 shadow-2xs hover:bg-[#EBF4FC] active:scale-95 transition font-bold text-xs shrink-0 cursor-pointer select-none"
          aria-label="Retour"
        >
          <ArrowLeft className="w-4 h-4 text-[#0759A4]" />
          <span>Retour</span>
        </button>

        <h1 className="text-xs sm:text-sm font-bold text-[#171717] truncate flex-1">
          {title}
        </h1>

        {role === 'Admin' && (
          <button
            type="button"
            onClick={() => {
              triggerHaptic('medium');
              setActiveTab('admin');
            }}
            className="flex items-center gap-1 px-2.5 py-1 rounded-[10px] bg-[#FDF0F5] hover:bg-[#FCE4EC] text-[#B43167] border border-[#B43167]/30 text-[11px] font-black transition active:scale-95 cursor-pointer shadow-2xs shrink-0 select-none"
            title="Ouvrir le panneau Données"
          >
            <Database className="w-3.5 h-3.5" />
            <span>Data</span>
          </button>
        )}
      </div>

      {/* Categories Filter Tabs */}
      {categories.length > 0 && (
        <div className="flex items-center gap-1.5 overflow-x-auto pb-2 mb-2.5 no-scrollbar select-none touch-pan-x">
          <button
            type="button"
            onClick={() => {
              triggerHaptic('light');
              setSelectedCategory('ALL');
            }}
            className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all shrink-0 cursor-pointer select-none border ${
              selectedCategory === 'ALL'
                ? 'bg-[#171717] text-white border-[#171717] shadow-xs'
                : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
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
              className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all shrink-0 cursor-pointer select-none border ${
                selectedCategory === cat
                  ? 'bg-[#0759A4] text-white border-[#0759A4] shadow-xs'
                  : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
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
          filtered.map((product) => {
            const productDeptConfig = DEPARTMENT_CONFIGS[product.department] || deptConfig;
            const codeBadge = formatProductCodeBadge(product.code);
            const primaryBarcode = getPrimaryBarcode(product, barcodeVotes);

            return (
              <div
                key={product.id}
                onClick={() => handleProductClick(product)}
                className="rounded-[14px] sm:rounded-[16px] p-2 sm:p-2.5 flex flex-col justify-between shadow-2xs hover:shadow-md active:scale-[0.98] transition-all cursor-pointer select-none border border-black/5"
                style={{ backgroundColor: productDeptConfig.accentColor }}
              >
                {/* 1. White Image Thumbnail Box */}
                <div className="relative w-full aspect-square rounded-[12px] bg-white border border-black/5 flex items-center justify-center overflow-hidden mb-1.5 p-1.5 shadow-2xs">
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

                {/* 2. Code Badge: Limouni (Orange) if Indisponible, White otherwise */}
                <div className="mb-1 flex items-center gap-1.5 flex-wrap">
                  <span
                    className="inline-block text-[10px] sm:text-[11px] font-mono font-black px-1.5 py-0.5 rounded-[5px] shadow-2xs tracking-wider"
                    style={{
                      backgroundColor: codeBadge === 'Indisponible' ? '#EA580C' : '#FFFFFF',
                      color: codeBadge === 'Indisponible' ? '#FFFFFF' : productDeptConfig.accentColor,
                    }}
                  >
                    {codeBadge}
                  </span>

                  {codeBadge === 'Indisponible' && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        triggerHaptic('light');
                        openSuggestForProduct(product);
                      }}
                      className="px-1.5 py-0.5 rounded-[4px] bg-[#EA580C] hover:bg-[#C2410C] text-white text-[9px] font-black shadow-2xs active:scale-95 transition cursor-pointer select-none border border-white/20"
                      title="Ajouter le code court manquant"
                    >
                      <span>Aidez-nous</span>
                    </button>
                  )}
                </div>

                {/* 3. Product Name: White Text */}
                <h3
                  className="text-[13px] sm:text-[14px] md:text-[15px] font-extrabold text-white leading-snug line-clamp-2 mt-auto tracking-tight"
                  title={product.name}
                >
                  {product.name}
                </h3>

                {/* 4. Barcode preview if available */}
                {primaryBarcode && (
                  <p className="text-[9px] font-mono text-white/80 truncate mt-1">
                    {primaryBarcode}
                  </p>
                )}
              </div>
            );
          })
        ) : (
          <div className="col-span-2 sm:col-span-3 md:col-span-4 bg-white rounded-[16px] p-6 text-center border border-gray-100 shadow-2xs mt-3">
            <p className="text-xs font-bold text-[#171717]">Aucun produit dans ce rayon</p>
            <p className="text-[10px] text-gray-400 mt-0.5">
              Tous les produits affichés disposent d'un code-barres actif.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

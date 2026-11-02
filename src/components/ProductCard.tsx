import React, { useState } from 'react';
import { ShoppingBag, ChevronRight, CheckCircle2 } from 'lucide-react';
import { Product } from '../types';
import {
  DEPARTMENT_CONFIGS,
  getEffectiveBarcodeVariants,
  getProductDisplayStatus,
  formatProductCodeBadge,
  isProductCode0000,
  getPrimaryBarcode,
} from '../utils/productUtils';
import { useApp } from '../context/AppContext';
import { triggerHaptic } from '../utils/haptics';

interface ProductCardProps {
  product: Product;
  onClick: () => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product, onClick }) => {
  const { barcodeVotes, openSuggestForProduct } = useApp();
  const [imgError, setImgError] = useState(false);
  const deptConfig = DEPARTMENT_CONFIGS[product.department] || DEPARTMENT_CONFIGS['Fruits et légumes'];
  const variants = getEffectiveBarcodeVariants(product, barcodeVotes);
  const status = getProductDisplayStatus(product, barcodeVotes);
  const isUnavailableNoBarcode = status === 'UNAVAILABLE_NO_BARCODE';
  const is0000 = isProductCode0000(product.code);
  const codeBadge = formatProductCodeBadge(product.code);
  const primaryBarcode = getPrimaryBarcode(product, barcodeVotes);

  const handleClick = () => {
    if (isUnavailableNoBarcode) {
      triggerHaptic('warning');
      return;
    }
    triggerHaptic('light');
    onClick();
  };

  return (
    <div
      onClick={handleClick}
      className="group relative flex items-center gap-2.5 sm:gap-3 p-2 sm:p-2.5 rounded-[14px] sm:rounded-[16px] shadow-2xs hover:shadow-sm transition-all duration-150 select-none cursor-pointer active:scale-[0.99] border border-black/5"
      style={{ backgroundColor: deptConfig.accentColor }}
    >
      {/* Thumbnail with White Box Background */}
      <div className="relative w-11 h-11 sm:w-13 sm:h-13 rounded-[10px] sm:rounded-[12px] bg-white p-1 shrink-0 flex items-center justify-center overflow-hidden shadow-2xs">
        {product.imageUrl && !imgError ? (
          <img
            src={product.imageUrl}
            alt={product.name}
            onError={() => setImgError(true)}
            loading="lazy"
            decoding="async"
            referrerPolicy="no-referrer"
            className="w-full h-full object-contain group-hover:scale-105 transition-transform"
          />
        ) : (
          <ShoppingBag className="w-5 h-5 opacity-40 text-gray-400" />
        )}
      </div>

      {/* Details: Category Color Background, White Text */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
          {/* Code Badge: Limouni (Orange) if Indisponible, White otherwise */}
          <span
            className="px-1.5 py-0.5 rounded-[5px] font-black text-[10px] sm:text-[11px] shadow-2xs shrink-0"
            style={{
              backgroundColor: codeBadge === 'Indisponible' ? '#EA580C' : '#FFFFFF',
              color: codeBadge === 'Indisponible' ? '#FFFFFF' : deptConfig.accentColor,
            }}
          >
            {codeBadge}
          </span>

          {/* If code is Indisponible, show orange Aidez-nous button */}
          {codeBadge === 'Indisponible' && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                triggerHaptic('light');
                openSuggestForProduct(product);
              }}
              className="px-2 py-0.5 rounded-[5px] bg-[#EA580C] hover:bg-[#C2410C] text-white text-[9.5px] font-extrabold flex items-center gap-1 shadow-2xs active:scale-95 transition cursor-pointer select-none border border-white/20"
              title="Ajouter le code court manquant"
            >
              <span>Aidez-nous</span>
            </button>
          )}

          {/* Department / Category Tag: Semi-translucent white */}
          <span className="text-[9.5px] font-semibold text-white/90 truncate">
            {product.category && product.category !== 'Général' ? product.category : deptConfig.shortName}
          </span>
        </div>

        {/* Product Name: White Text */}
        <h4 className="text-[13px] sm:text-[14px] font-extrabold text-white leading-snug truncate">
          {product.name}
        </h4>

        {/* Primary Barcode Preview */}
        {primaryBarcode && (
          <p className="text-[9.5px] font-mono text-white/80 truncate mt-0.5">
            Code-barres : <span className="font-semibold text-white">{primaryBarcode}</span>
          </p>
        )}
      </div>

      {/* Status Pill on the Right: White pill */}
      <div className="shrink-0 flex items-center gap-1 px-1.5 py-0.5 rounded-[6px] bg-white/20 text-white text-[9.5px] font-bold backdrop-blur-xs">
        <CheckCircle2 className="w-3 h-3 text-white" />
        <span className="hidden xs:inline">Valide</span>
      </div>
    </div>
  );
};

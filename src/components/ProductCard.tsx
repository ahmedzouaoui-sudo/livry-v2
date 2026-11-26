import React, { useState } from 'react';
import { ShoppingBag, CheckCircle2, Edit3, Trash2 } from 'lucide-react';
import { Product } from '../types';
import {
  DEPARTMENT_CONFIGS,
  getProductDisplayStatus,
  formatProductCodeBadge,
  getPrimaryBarcode,
} from '../utils/productUtils';
import { useApp } from '../context/AppContext';
import { triggerHaptic } from '../utils/haptics';
import { Verified100Badge, getProductVerificationStatus } from './Verified100Badge';

interface ProductCardProps {
  product: Product;
  onClick: () => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product, onClick }) => {
  const { role, barcodeVotes, noCodeSettings, openSuggestForProduct, deleteProduct, showToast } = useApp();
  const [imgError, setImgError] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const deptConfig = DEPARTMENT_CONFIGS[product.department] || DEPARTMENT_CONFIGS['Fruits et légumes'];
  const status = getProductDisplayStatus(product, barcodeVotes, noCodeSettings);
  const isUnavailableNoBarcode = status === 'UNAVAILABLE_NO_BARCODE';
  const displayCodeLabel = formatProductCodeBadge(
    product.code,
    product,
    barcodeVotes,
    noCodeSettings
  );
  const showMissingPrompt = displayCodeLabel === 'Indisponible';
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
      className="cv-card group relative flex items-center gap-3 sm:gap-3.5 p-2.5 sm:p-3 rounded-[18px] sm:rounded-[20px] shadow-2xs transition-transform duration-100 select-none cursor-pointer active:scale-[0.99] border border-black/10"
      style={{ backgroundColor: deptConfig.accentColor }}
    >
      {/* Thumbnail with White Box Background */}
      <div className="relative w-12 h-12 sm:w-14 sm:h-14 rounded-[12px] bg-white p-1.5 shrink-0 flex items-center justify-center overflow-hidden shadow-2xs">
        {product.imageUrl && !imgError ? (
          <img
            src={product.imageUrl}
            alt={product.name}
            onError={() => setImgError(true)}
            loading="lazy"
            decoding="async"
            referrerPolicy="no-referrer"
            className="w-full h-full object-contain"
          />
        ) : (
          <ShoppingBag className="w-5 h-5 opacity-40 text-gray-400" />
        )}
      </div>

      {/* Details: Category Color Background, White Text */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
          {/* Code Badge */}
          <span
            className="px-1.5 py-0.5 rounded-[6px] font-mono font-black text-[10px] sm:text-[11px] shadow-2xs shrink-0 tabular-nums whitespace-nowrap"
            style={{
              backgroundColor: showMissingPrompt ? '#EA580C' : '#FFFFFF',
              color: showMissingPrompt ? '#FFFFFF' : deptConfig.accentColor,
            }}
          >
            {displayCodeLabel}
          </span>

          {/* If code is Indisponible and NOT disabled, show orange Aidez-nous button */}
          {showMissingPrompt && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                triggerHaptic('light');
                openSuggestForProduct(product);
              }}
              className="px-2 py-0.5 rounded-[6px] bg-[#EA580C] hover:bg-[#C2410C] text-white text-[9.5px] font-extrabold flex items-center gap-1 shadow-2xs active:scale-95 transition-transform duration-100 cursor-pointer select-none border border-white/20"
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

        {/* Product Name: White Text + Optional 100% Verified Icon */}
        <div className="flex items-center gap-1.5 min-w-0">
          <h4 className="text-[13px] sm:text-[14px] font-extrabold text-white leading-snug truncate">
            {product.name}
          </h4>
          <Verified100Badge
            variant="card"
            status={getProductVerificationStatus(product)}
          />
        </div>

        {/* Primary Barcode Preview */}
        {primaryBarcode && (
          <p className="text-[9.5px] font-mono text-white/85 truncate mt-0.5 tabular-nums">
            Code-barres : <span className="font-semibold text-white">{primaryBarcode}</span>
          </p>
        )}
      </div>

      {/* Status Pill & Admin Quick Actions on the Right */}
      <div className="shrink-0 flex items-center gap-1.5">
        {role === 'Admin' && (
          <>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                triggerHaptic('light');
                onClick();
              }}
              className="p-1.5 rounded-[9px] bg-white/25 hover:bg-white/40 text-white transition-colors active:scale-90 cursor-pointer shadow-2xs"
              title="Modifier cet article (Admin)"
            >
              <Edit3 className="w-3.5 h-3.5 text-white" />
            </button>
            <button
              type="button"
              onClick={async (e) => {
                e.stopPropagation();
                if (!confirmDelete) {
                  triggerHaptic('warning');
                  setConfirmDelete(true);
                  setTimeout(() => setConfirmDelete(false), 3500);
                  return;
                }
                triggerHaptic('warning');
                await deleteProduct(product.id);
                showToast(`🗑️ "${product.name}" supprimé`);
              }}
              className={`px-1.5 py-1.5 rounded-[9px] text-white transition-colors active:scale-90 cursor-pointer shadow-2xs inline-flex items-center gap-1 text-[10px] font-black ${
                confirmDelete
                  ? 'bg-red-600 ring-2 ring-white/80'
                  : 'bg-red-600/80 hover:bg-red-600'
              }`}
              title={confirmDelete ? 'Cliquer à nouveau pour supprimer' : 'Supprimer cet article (Admin)'}
            >
              <Trash2 className="w-3.5 h-3.5 text-white" />
              {confirmDelete && <span>OK ?</span>}
            </button>
          </>
        )}
        <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-[7px] bg-white/20 text-white text-[9.5px] font-bold">
          <CheckCircle2 className="w-3 h-3 text-white" />
          <span className="hidden xs:inline">{primaryBarcode ? 'Valide' : 'Actif'}</span>
        </div>
      </div>
    </div>
  );
};

import React, { useState, useMemo, useEffect } from 'react';
import { ArrowLeft, ShoppingBag, Share2, Check, Barcode as BarcodeIcon, Sparkles, Globe, Plus } from 'lucide-react';
import { Product } from '../types';
import { DEPARTMENT_CONFIGS, getEffectiveBarcodeVariants, formatProductCodeBadge, isProductCode0000 } from '../utils/productUtils';
import { BarcodeCard } from './BarcodeCard';
import { QuantityCalculator } from './QuantityCalculator';
import { extractProductUnitInfo, recalculateBarcodeWithMultiplier } from '../utils/productWeight';
import { triggerHaptic } from '../utils/haptics';
import { useApp } from '../context/AppContext';

interface ProductDetailModalProps {
  product: Product;
  initialQuantity?: number;
  onClose: () => void;
  onCopySuccess: (code: string) => void;
}

export const ProductDetailModal: React.FC<ProductDetailModalProps> = ({
  product,
  initialQuantity = 1,
  onClose,
  onCopySuccess,
}) => {
  const { barcodeVotes, openSuggestForProduct } = useApp();
  const [imgError, setImgError] = useState(false);
  const [copiedShare, setCopiedShare] = useState(false);
  const [selectedVariantIndex, setSelectedVariantIndex] = useState<number>(0);

  useEffect(() => {
    setSelectedVariantIndex(0);
  }, [product.id]);

  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  const unitInfo = useMemo(() => extractProductUnitInfo(product.name), [product.name]);
  const [multiplier, setMultiplier] = useState<number>(initialQuantity || 1);

  const deptConfig = DEPARTMENT_CONFIGS[product.department] || DEPARTMENT_CONFIGS['Fruits et légumes'];
  const rawVariants = useMemo(
    () => getEffectiveBarcodeVariants(product, barcodeVotes),
    [product, barcodeVotes]
  );

  // Recalculation rules:
  // - MARJANE INTERNE: DOES NOT CHANGE with weight or multiplier
  // - MARJANE MINI: DOES NOT CHANGE with weight or multiplier
  // - Codes containing 2000014: DO NOT CHANGE
  // - MARJANE SEC and MARJANE SEC 2: DO NOT CHANGE
  // - Only standard MARJANE EAN-13 barcodes recalculate
  const adjustedVariants = useMemo(() => {
    return rawVariants.map((v) => {
      const isFixedCode =
        v.type === 'barcodeInterne' ||
        v.type === 'barcodeMiniSecours' ||
        v.type === 'barcodeSecours' ||
        v.type === 'barcodeP3' ||
        v.code.includes('2000014') ||
        v.code.length !== 13;

      if (isFixedCode || multiplier === 1) {
        return v;
      }

      const recalculated = recalculateBarcodeWithMultiplier(v.code, unitInfo, multiplier);
      return {
        ...v,
        code: recalculated,
      };
    });
  }, [rawVariants, unitInfo, multiplier]);

  const currentVariant = adjustedVariants[selectedVariantIndex] || adjustedVariants[0];

  const handleShare = () => {
    triggerHaptic('medium');
    const primaryCode = currentVariant?.code || product.code;
    const textToShare = `${product.name} (Code: ${product.code}) - Barcode: ${primaryCode}`;
    if (navigator.share) {
      navigator.share({
        title: product.name,
        text: textToShare,
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(textToShare);
      setCopiedShare(true);
      setTimeout(() => setCopiedShare(false), 2000);
    }
  };

  const handleVariantSelect = (idx: number) => {
    triggerHaptic('light');
    setSelectedVariantIndex(idx);
  };

  const codeBadge = formatProductCodeBadge(product.code);

  return (
    <div className="fixed inset-0 z-50 bg-[#F8F7FC] dark:bg-slate-950 text-[#171717] dark:text-slate-100 flex flex-col w-full h-full overflow-y-auto animate-in fade-in duration-150 transition-colors">
      {/* Top Navigation Bar */}
      <div className="sticky top-0 z-30 flex items-center justify-between px-3 sm:px-6 py-2.5 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-[#E0E0E6]/80 dark:border-slate-800 shrink-0">
        <button
          type="button"
          onClick={() => {
            triggerHaptic('light');
            onClose();
          }}
          className="flex items-center gap-1.5 text-xs sm:text-sm font-bold text-[#0759A4] dark:text-blue-400 py-1.5 px-3 rounded-[12px] bg-[#EBF4FC] dark:bg-blue-950/60 hover:bg-[#D9EAF9] dark:hover:bg-blue-900/60 active:scale-95 transition cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4 text-[#0759A4] dark:text-blue-400" />
          <span>Retour</span>
        </button>

        <span
          className="px-2.5 py-0.5 rounded-[8px] text-[10px] sm:text-[11px] font-bold"
          style={{ backgroundColor: deptConfig.tagBg, color: deptConfig.tagText }}
        >
          {deptConfig.shortName}
        </span>

        <button
          type="button"
          onClick={handleShare}
          className="p-2 rounded-[12px] text-gray-600 dark:text-slate-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-800 active:scale-95 transition cursor-pointer min-h-[36px] min-w-[36px] flex items-center justify-center border border-gray-200 dark:border-slate-700"
          title="Partager"
        >
          {copiedShare ? <Check className="w-4 h-4 text-emerald-600" /> : <Share2 className="w-4 h-4" />}
        </button>
      </div>

      {/* Main Full-Screen Body */}
      <div className="flex-1 w-full max-w-[620px] mx-auto px-3 sm:px-6 py-3 sm:py-5 flex flex-col space-y-3 pb-12">
        {/* 1. Large Product Image */}
        <div className="w-full h-52 sm:h-64 rounded-[20px] bg-white dark:bg-slate-900 border border-[#E0E0E6]/80 dark:border-slate-800 p-3 flex items-center justify-center overflow-hidden relative shadow-2xs transition-colors">
          {product.imageUrl && !imgError ? (
            <img
              src={product.imageUrl}
              alt={product.name}
              onError={() => setImgError(true)}
              loading="eager"
              decoding="async"
              referrerPolicy="no-referrer"
              className="w-full h-full object-contain pointer-events-none select-none"
            />
          ) : (
            <div
              className="w-full h-full rounded-[16px] flex items-center justify-center"
              style={{ backgroundColor: deptConfig.bgColor }}
            >
              <ShoppingBag className="w-16 h-16 opacity-40" style={{ color: deptConfig.accentColor }} />
            </div>
          )}
        </div>

        {/* 2. Product Code Badge & Name */}
        <div className="bg-white dark:bg-slate-900 rounded-[18px] border border-[#E0E0E6]/80 dark:border-slate-800 p-3 sm:p-4 shadow-2xs space-y-1.5 transition-colors">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className="px-2 py-0.5 rounded-[6px] text-xs font-mono font-black tracking-wider shadow-2xs"
              style={{
                backgroundColor: codeBadge === 'Indisponible' ? '#EA580C' : '#0759A4',
                color: '#FFFFFF',
              }}
            >
              {codeBadge}
            </span>

            {/* If code is Indisponible, show orange Aidez-nous button */}
            {codeBadge === 'Indisponible' && (
              <button
                type="button"
                onClick={() => {
                  triggerHaptic('light');
                  onClose();
                  openSuggestForProduct(product);
                }}
                className="px-2.5 py-0.5 rounded-[6px] bg-[#EA580C] hover:bg-[#C2410C] text-white text-[11px] font-black flex items-center gap-1 shadow-2xs active:scale-95 transition cursor-pointer select-none"
                title="Ajouter le code court"
              >
                <span>Aidez-nous</span>
              </button>
            )}

            <span className="text-xs text-gray-500 dark:text-slate-400 font-semibold truncate">
              {product.category && product.category !== 'Général' ? product.category : deptConfig.shortName}
            </span>
          </div>

          <h2 className="text-base sm:text-lg md:text-xl font-black text-[#171717] dark:text-white leading-snug tracking-tight">
            {product.name}
          </h2>
        </div>

        {/* 3. Weight / Multiplier Stepper: Strictly (-) digit (+) with wider container */}
        <div className="bg-white dark:bg-slate-900 rounded-[18px] border border-[#E0E0E6]/80 dark:border-slate-800 p-3 sm:p-4 shadow-2xs flex flex-col items-center w-full transition-colors">
          <QuantityCalculator
            multiplier={multiplier}
            onMultiplierChange={(m) => setMultiplier(m)}
          />
        </div>

        {/* 4. Barcode Selection Buttons (DIR DES BOTTON BACH TKHTAR MNHOM LES CODES BARRES) */}
        {adjustedVariants.length > 0 ? (
          <div className="space-y-2.5">
            {/* Show buttons for only the barcodes that actually exist in the product (1 code = 1 button, 2 codes = 2 buttons) */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {adjustedVariants.map((variant, idx) => {
                const isSelected = selectedVariantIndex === idx;

                return (
                  <button
                    key={`${variant.type}-${variant.code}-${idx}`}
                    type="button"
                    onClick={() => handleVariantSelect(idx)}
                    style={{
                      backgroundColor: isSelected ? variant.accentColor : variant.badgeBg,
                      color: isSelected ? '#FFFFFF' : variant.badgeText,
                      borderColor: variant.accentColor,
                    }}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-black border transition-all cursor-pointer select-none active:scale-95 shadow-2xs min-h-[34px] ${
                      isSelected
                        ? 'ring-2 ring-offset-1 shadow-xs'
                        : 'opacity-85 hover:opacity-100'
                    }`}
                  >
                    {variant.iconType === 'marjane' ? (
                      <div className="w-4 h-4 rounded-full bg-white/20 flex items-center justify-center p-0.5 shrink-0">
                        <img
                          src="/assets/aistudio/psd_2219503b.png"
                          alt="Marjane"
                          className="w-3 h-3 object-contain"
                        />
                      </div>
                    ) : variant.iconType === 'internet' ? (
                      <Globe className="w-3.5 h-3.5 shrink-0" />
                    ) : variant.iconType === 'plus' ? (
                      <Plus className="w-3.5 h-3.5 shrink-0" />
                    ) : (
                      <BarcodeIcon className="w-3.5 h-3.5 shrink-0" />
                    )}
                    <span>{variant.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Selected Barcode Display Card */}
            {currentVariant && (
              <BarcodeCard
                variant={currentVariant}
                onCopySuccess={onCopySuccess}
              />
            )}
          </div>
        ) : (
          <div className="bg-amber-50 border border-amber-200 rounded-[16px] p-4 text-center text-amber-900 text-xs font-bold space-y-2.5">
            <p>Aucun code-barres disponible pour cet article</p>
            <button
              type="button"
              onClick={() => {
                triggerHaptic('light');
                onClose();
                openSuggestForProduct(product);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-[12px] bg-[#155B48] text-white text-xs font-bold hover:bg-[#104838] active:scale-95 transition shadow-xs cursor-pointer select-none"
            >
              <Sparkles className="w-3.5 h-3.5 text-emerald-200" />
              <span>Compléter / Scanner le code-barres</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

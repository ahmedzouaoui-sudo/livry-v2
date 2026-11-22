import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  ArrowLeft,
  ShoppingBag,
  Share2,
  Check,
  Barcode as BarcodeIcon,
  Sparkles,
  Globe,
  Plus,
  Edit3,
  Lock,
  Shield,
  X,
  KeyRound,
} from 'lucide-react';
import { Product } from '../types';
import { DEPARTMENT_CONFIGS, getEffectiveBarcodeVariants, formatProductCodeBadge, isProductCode0000 } from '../utils/productUtils';
import { BarcodeCard } from './BarcodeCard';
import { QuantityCalculator } from './QuantityCalculator';
import { extractProductUnitInfo, recalculateBarcodeWithMultiplier } from '../utils/productWeight';
import { triggerHaptic } from '../utils/haptics';
import { useApp } from '../context/AppContext';
import { ProductEditModal } from './ProductEditModal';
import {
  Verified100Badge,
  VerifiedIconImg,
  Verified50IconImg,
  getProductVerificationStatus,
} from './Verified100Badge';

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
  const { role, setRole, barcodeVotes, openSuggestForProduct, showToast, updateProduct, setSelectedProduct } = useApp();
  const [imgError, setImgError] = useState(false);
  const [copiedShare, setCopiedShare] = useState(false);
  const [selectedVariantIndex, setSelectedVariantIndex] = useState<number>(0);

  // Direct In-Place Edit Modal state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Admin PIN verification modal (for quick unlock directly from product page)
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [adminPin, setAdminPin] = useState('');
  const [pinError, setPinError] = useState(false);
  const pinInputRef = useRef<HTMLInputElement>(null);

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

  useEffect(() => {
    if (isPinModalOpen) {
      setTimeout(() => pinInputRef.current?.focus(), 100);
    } else {
      setAdminPin('');
      setPinError(false);
    }
  }, [isPinModalOpen]);

  const handleVerifyPin = (e: React.FormEvent) => {
    e.preventDefault();
    if (adminPin === '1997') {
      triggerHaptic('success');
      setRole('Admin');
      setIsPinModalOpen(false);
      setAdminPin('');
      setPinError(false);
      showToast('🔒 Mode Administrateur déverrouillé !');
      setIsEditModalOpen(true);
    } else {
      triggerHaptic('warning');
      setPinError(true);
      setAdminPin('');
      pinInputRef.current?.focus();
    }
  };

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
        v.type === 'marjane Interne' ||
        v.type === 'barcodeInterne' ||
        v.type === 'marjane mini' ||
        v.type === 'barcodeMiniSecours' ||
        v.type === 'marjane sec' ||
        v.type === 'barcodeSecours' ||
        v.type === 'marjane sec 2' ||
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
      <div className="sticky top-0 z-30 flex items-center justify-between px-3 sm:px-6 py-2.5 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-[#E0E0E6]/80 dark:border-slate-800 shrink-0 gap-2">
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

        {/* Right Action Buttons: Admin Edit & Share */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {role === 'Admin' ? (
            <button
              type="button"
              onClick={() => {
                triggerHaptic('light');
                setIsEditModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-[12px] bg-[#0759A4] hover:bg-[#064a88] text-white text-xs font-black shadow-xs active:scale-95 transition cursor-pointer select-none"
              title="Modifier directement cet article (Admin)"
            >
              <Edit3 className="w-3.5 h-3.5 text-white" />
              <span>Modifier</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                triggerHaptic('light');
                setIsPinModalOpen(true);
              }}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-[12px] bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-300 text-xs font-bold transition cursor-pointer select-none border border-gray-200 dark:border-slate-700"
              title="Déverrouiller le mode Admin pour modifier cet article"
            >
              <Lock className="w-3.5 h-3.5 text-gray-500" />
              <span className="text-[11px] font-bold">Admin</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleShare}
            className="p-2 rounded-[12px] text-gray-600 dark:text-slate-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-800 active:scale-95 transition cursor-pointer min-h-[36px] min-w-[36px] flex items-center justify-center border border-gray-200 dark:border-slate-700"
            title="Partager"
          >
            {copiedShare ? <Check className="w-4 h-4 text-emerald-600" /> : <Share2 className="w-4 h-4" />}
          </button>
        </div>
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

          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-base sm:text-lg md:text-xl font-black text-[#171717] dark:text-white leading-snug tracking-tight">
              {product.name}
            </h2>
            <Verified100Badge
              variant="detail"
              status={getProductVerificationStatus(product)}
            />
          </div>
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

        {/* Admin Direct In-Place Edit Banner */}
        {role === 'Admin' && (
          <div className="bg-gradient-to-r from-blue-50 via-indigo-50/40 to-blue-50 dark:from-slate-800/90 dark:via-blue-950/40 dark:to-slate-800/90 border border-blue-200/80 dark:border-blue-900/60 rounded-[18px] p-3 flex items-center justify-between gap-3 shadow-2xs mt-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-[10px] bg-[#0759A4] text-white flex items-center justify-center shrink-0 shadow-xs">
                <Shield className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-black text-[#0759A4] dark:text-blue-400">Mode Admin Actif</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-[6px] bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-200 font-mono font-bold">
                    ID #{product.id}
                  </span>
                </div>
                <p className="text-[10.5px] text-gray-600 dark:text-slate-400 truncate mt-0.5">
                  Modifier les codes, le nom, l'unité ou la photo de cet article
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
              {(() => {
                const vStatus = getProductVerificationStatus(product);
                const applyStatus = async (target: '100' | '50') => {
                  triggerHaptic('medium');
                  const next = vStatus === target ? 'none' : target;
                  const updated: Product = {
                    ...product,
                    verificationStatus: next,
                    isVerified100: next === '100',
                  };
                  await updateProduct(updated);
                  setSelectedProduct(updated);
                  showToast(
                    next === '100'
                      ? `✅ Icône 100% Khdam (Bleue) activée pour "${product.name}"`
                      : next === '50'
                        ? `🟠 Icône 50% Khdam (Orange) activée pour "${product.name}"`
                        : `Icône retirée pour "${product.name}"`
                  );
                };

                return (
                  <>
                    <button
                      type="button"
                      onClick={() => applyStatus('100')}
                      className={`flex items-center gap-1 px-2 py-1.5 rounded-[10px] text-[11px] font-black shadow-xs active:scale-95 transition cursor-pointer select-none border ${
                        vStatus === '100'
                          ? 'bg-sky-100 hover:bg-sky-200 text-sky-900 border-sky-400 dark:bg-sky-950/70 dark:text-sky-200 dark:border-sky-600'
                          : 'bg-white dark:bg-slate-800 hover:bg-sky-50 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-800'
                      }`}
                      title="Activer / Désactiver l'icône bleue 100% Khdam"
                    >
                      <VerifiedIconImg className={`w-4 h-4 ${vStatus === '100' ? '' : 'opacity-45 grayscale'}`} />
                      <span>100%</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => applyStatus('50')}
                      className={`flex items-center gap-1 px-2 py-1.5 rounded-[10px] text-[11px] font-black shadow-xs active:scale-95 transition cursor-pointer select-none border ${
                        vStatus === '50'
                          ? 'bg-orange-100 hover:bg-orange-200 text-orange-900 border-orange-400 dark:bg-orange-950/70 dark:text-orange-200 dark:border-orange-600'
                          : 'bg-white dark:bg-slate-800 hover:bg-orange-50 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-800'
                      }`}
                      title="Activer / Désactiver l'icône orange 50% Khdam"
                    >
                      <Verified50IconImg className={`w-4 h-4 ${vStatus === '50' ? '' : 'opacity-45 grayscale'}`} />
                      <span>50%</span>
                    </button>
                  </>
                );
              })()}

              <button
                type="button"
                onClick={() => {
                  triggerHaptic('light');
                  setIsEditModalOpen(true);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-[12px] bg-[#0759A4] hover:bg-blue-700 text-white text-xs font-black shadow-xs active:scale-95 transition cursor-pointer select-none shrink-0"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Modifier</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 5. Direct In-Place Product Edit Modal */}
      {isEditModalOpen && (
        <ProductEditModal
          isOpen={isEditModalOpen}
          product={product}
          onClose={() => setIsEditModalOpen(false)}
          onDeleted={() => onClose()}
        />
      )}

      {/* 6. Quick Admin PIN Unlock Modal from Product Page */}
      {isPinModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-xs bg-white dark:bg-slate-900 rounded-[22px] p-5 shadow-2xl border border-gray-200 dark:border-slate-800 animate-in zoom-in-95 duration-150 relative text-gray-900 dark:text-slate-100">
            <button
              type="button"
              onClick={() => setIsPinModalOpen(false)}
              className="absolute top-3 right-3 p-1 rounded-full text-gray-400 hover:text-gray-600 dark:hover:text-slate-200 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex flex-col items-center text-center space-y-2 mb-4">
              <div className="w-12 h-12 rounded-full bg-blue-50 dark:bg-blue-950/80 border border-blue-200 dark:border-blue-800 flex items-center justify-center text-[#0759A4] dark:text-blue-400">
                <Lock className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-black text-gray-900 dark:text-white">
                Modifier cet Article
              </h3>
              <p className="text-[11px] text-gray-500 dark:text-slate-400">
                Entrez le code PIN Admin pour modifier la fiche produit directement
              </p>
            </div>

            <form onSubmit={handleVerifyPin} className="space-y-3">
              <input
                ref={pinInputRef}
                type="password"
                inputMode="numeric"
                maxLength={4}
                value={adminPin}
                onChange={(e) => {
                  setAdminPin(e.target.value);
                  setPinError(false);
                }}
                placeholder="Code PIN (1997)"
                className={`w-full text-center text-lg font-mono font-black tracking-widest py-2 rounded-[12px] bg-gray-50 dark:bg-slate-800 border outline-none transition ${
                  pinError
                    ? 'border-red-500 ring-2 ring-red-200 dark:ring-red-950'
                    : 'border-gray-300 dark:border-slate-700 focus:border-[#0759A4] focus:ring-2 focus:ring-blue-100'
                }`}
              />

              {pinError && (
                <p className="text-center text-[10.5px] font-bold text-red-600 dark:text-red-400 animate-shake">
                  Code PIN incorrect. Réessayez.
                </p>
              )}

              <button
                type="submit"
                className="w-full py-2.5 rounded-[12px] bg-[#0759A4] hover:bg-blue-700 text-white font-black text-xs shadow-md active:scale-95 transition cursor-pointer"
              >
                Déverrouiller &amp; Modifier
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

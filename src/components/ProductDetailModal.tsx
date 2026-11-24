import React, { useState, useMemo, useEffect } from 'react';
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
  Unlock,
  Shield,
  Trash2,
} from 'lucide-react';
import { Product } from '../types';
import {
  DEPARTMENT_CONFIGS,
  getEffectiveBarcodeVariants,
  formatProductCodeBadge,
  isProductCodeDisabled,
} from '../utils/productUtils';
import { BarcodeCard } from './BarcodeCard';
import { QuantityCalculator } from './QuantityCalculator';
import { extractProductUnitInfo, recalculateBarcodeWithMultiplier } from '../utils/productWeight';
import { triggerHaptic } from '../utils/haptics';
import { copyTextToClipboard } from '../utils/clipboard';
import { useApp } from '../context/AppContext';
import { ProductEditModal } from './ProductEditModal';
import { AdminAuthModal } from './AdminAuthModal';
import {
  Verified100Badge,
  VerifiedIconImg,
  Verified50IconImg,
  VerifiedBrokenIconImg,
  VerificationStatus,
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
  const {
    role,
    setRole,
    barcodeVotes,
    noCodeSettings,
    toggleProductCodeDisabled,
    openSuggestForProduct,
    showToast,
    updateProduct,
    deleteProduct,
    setSelectedProduct,
  } = useApp();
  const [imgError, setImgError] = useState(false);
  const [copiedShare, setCopiedShare] = useState(false);
  const [selectedVariantIndex, setSelectedVariantIndex] = useState<number>(0);

  // Direct In-Place Edit Modal & Quick Delete state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [confirmDeleteInline, setConfirmDeleteInline] = useState(false);

  // Admin auth modal (for quick unlock directly from product page)
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);

  useEffect(() => {
    setSelectedVariantIndex(0);
    setConfirmDeleteInline(false);
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

  const handleShare = async () => {
    triggerHaptic('medium');
    const primaryCode = currentVariant?.code || product.code;
    const textToShare = `${product.name} (Code: ${product.code}) - Barcode: ${primaryCode}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: product.name,
          text: textToShare,
        });
        return;
      } catch {
        // User cancelled or share failed; fall back to clipboard below if not AbortError
      }
    }
    const ok = await copyTextToClipboard(textToShare);
    if (ok) {
      setCopiedShare(true);
      showToast('Infos produit copiées dans le presse-papier !');
      setTimeout(() => setCopiedShare(false), 2000);
    }
  };

  const handleVariantSelect = (idx: number) => {
    triggerHaptic('light');
    setSelectedVariantIndex(idx);
  };

  const codeDisabled = isProductCodeDisabled(product, noCodeSettings);
  const displayCodeBadge = formatProductCodeBadge(
    product.code,
    product,
    barcodeVotes,
    noCodeSettings
  );
  const showMissingCodePrompt = displayCodeBadge === 'Indisponible';

  return (
    <div className="fixed inset-0 z-50 bg-[#F8F7FC]/90 dark:bg-[#070B14]/90 backdrop-blur-2xl text-gray-900 dark:text-slate-100 flex flex-col w-full h-full overflow-y-auto animate-in fade-in duration-150 transition-colors">
      {/* Top Navigation Bar */}
      <div className="sticky top-0 z-30 flex items-center justify-between px-3 sm:px-6 py-2.5 bg-white/70 dark:bg-[#070B14]/70 backdrop-blur-xl border-b border-white/60 dark:border-white/10 shrink-0 gap-2">
        <button
          type="button"
          onClick={() => {
            triggerHaptic('light');
            onClose();
          }}
          className="flex items-center gap-1.5 text-xs sm:text-sm font-bold text-gray-800 dark:text-slate-100 py-1.5 px-3 rounded-xl glass-pill hover:bg-white/90 dark:hover:bg-slate-800/80 active:scale-95 transition cursor-pointer shadow-2xs"
        >
          <ArrowLeft className="w-4 h-4 text-[#0759A4] dark:text-blue-400" />
          <span>Retour</span>
        </button>

        <span
          className="px-2.5 py-0.5 rounded-full text-[10px] sm:text-[11px] font-bold"
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
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#0759A4] hover:bg-blue-700 text-white text-xs font-black shadow-xs active:scale-95 transition cursor-pointer select-none"
              title="Modifier directement cet article (Admin)"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Modifier</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                triggerHaptic('light');
                setIsPinModalOpen(true);
              }}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl glass-pill hover:bg-white/90 dark:hover:bg-slate-800/80 text-gray-700 dark:text-slate-200 text-xs font-bold transition cursor-pointer select-none"
              title="Déverrouiller le mode Admin pour modifier cet article"
            >
              <Lock className="w-3.5 h-3.5 text-[#0759A4] dark:text-blue-400" />
              <span className="text-[11px] font-bold">Admin</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleShare}
            className="p-2 rounded-xl glass-pill text-gray-600 dark:text-slate-300 hover:text-gray-900 dark:hover:text-white hover:bg-white/90 dark:hover:bg-slate-800/80 active:scale-95 transition cursor-pointer min-h-[36px] min-w-[36px] flex items-center justify-center"
            title="Partager"
          >
            {copiedShare ? <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> : <Share2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Main Full-Screen Body */}
      <div className="flex-1 w-full max-w-[620px] mx-auto px-3 sm:px-6 py-3 sm:py-5 flex flex-col space-y-3 pb-12">
        {/* 1. Large Product Image */}
        <div className="w-full h-52 sm:h-64 rounded-2xl glass-surface p-3 flex items-center justify-center overflow-hidden relative transition-colors">
          {product.imageUrl && !imgError ? (
            <div className="w-full h-full rounded-[14px] bg-white p-2 flex items-center justify-center">
              <img
                src={product.imageUrl}
                alt={product.name}
                onError={() => setImgError(true)}
                loading="eager"
                decoding="async"
                referrerPolicy="no-referrer"
                className="w-full h-full object-contain pointer-events-none select-none"
              />
            </div>
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
        <div className="glass-surface rounded-2xl p-3.5 sm:p-4 space-y-1.5 transition-colors">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className="px-2 py-0.5 rounded-lg text-xs font-mono font-black tracking-wider shadow-2xs tabular-nums whitespace-nowrap"
              style={{
                backgroundColor: showMissingCodePrompt ? '#EA580C' : '#0759A4',
                color: '#FFFFFF',
              }}
            >
              {displayCodeBadge}
            </span>

            {/* If code is Indisponible and NOT disabled, show orange Aidez-nous button */}
            {showMissingCodePrompt && (
              <button
                type="button"
                onClick={() => {
                  triggerHaptic('light');
                  onClose();
                  openSuggestForProduct(product);
                }}
                className="px-2.5 py-0.5 rounded-lg bg-[#EA580C] hover:bg-[#C2410C] text-white text-[11px] font-black flex items-center gap-1 shadow-2xs active:scale-95 transition cursor-pointer select-none"
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
            <h2 className="text-base sm:text-lg md:text-xl font-black text-gray-900 dark:text-white leading-snug tracking-tight">
              {product.name}
            </h2>
            <Verified100Badge
              variant="detail"
              status={getProductVerificationStatus(product)}
            />
          </div>
        </div>

        {/* 3. Weight / Multiplier Stepper */}
        <div className="glass-surface rounded-2xl p-3 sm:p-4 flex flex-col items-center w-full transition-colors">
          <QuantityCalculator
            multiplier={multiplier}
            onMultiplierChange={(m) => setMultiplier(m)}
          />
        </div>

        {/* 4. Barcode Selection Buttons */}
        {adjustedVariants.length > 0 ? (
          <div className="space-y-2.5">
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
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black border transition-all cursor-pointer select-none active:scale-95 shadow-2xs min-h-[34px] ${
                      isSelected
                        ? 'ring-2 ring-gray-900/20 dark:ring-white/30 ring-offset-1 shadow-xs'
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
        ) : codeDisabled ? (
          <div className="bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 text-center text-slate-700 dark:text-slate-200 text-xs space-y-2">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-200/80 dark:bg-slate-800 font-black text-slate-800 dark:text-slate-100">
              <Unlock className="w-3.5 h-3.5 text-slate-600 dark:text-slate-300" />
              <span>Non adressé — Code désactivé</span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
              Statut code : Non adressé. Ajoutez un code-barres si disponible via Aidez-nous.
            </p>
            <div>
              <button
                type="button"
                onClick={() => {
                  triggerHaptic('light');
                  onClose();
                  openSuggestForProduct(product);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-[11px] font-bold hover:bg-slate-100 active:scale-95 transition cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Ajouter un code si disponible</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 rounded-2xl p-4 text-center text-amber-900 dark:text-amber-200 text-xs font-bold space-y-2.5">
            <p>Aucun code-barres disponible pour cet article</p>
            <button
              type="button"
              onClick={() => {
                triggerHaptic('light');
                onClose();
                openSuggestForProduct(product);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 active:scale-95 transition shadow-xs cursor-pointer select-none"
            >
              <Sparkles className="w-3.5 h-3.5 text-emerald-100" />
              <span>Compléter / Scanner le code-barres</span>
            </button>
          </div>
        )}

        {/* Admin Direct In-Place Edit Banner */}
        {role === 'Admin' && (
          <div className="bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-2xl p-3 flex items-center justify-between gap-3 shadow-2xs mt-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-[#0759A4] text-white flex items-center justify-center shrink-0 shadow-xs">
                <Shield className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-black text-[#0759A4] dark:text-blue-300">Mode Admin Actif</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-white dark:bg-slate-900 text-[#0759A4] dark:text-blue-300 border border-blue-200 dark:border-blue-800 font-mono font-bold tabular-nums">
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
                const applyStatus = async (target: VerificationStatus) => {
                  triggerHaptic('medium');
                  const next: VerificationStatus = vStatus === target ? 'none' : target;
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
                        : next === 'broken'
                          ? `🔴 Icône Makhdamch Daba (Rouge) activée pour "${product.name}"`
                          : `Icône retirée pour "${product.name}"`
                  );
                };

                return (
                  <>
                    <button
                      type="button"
                      onClick={() => applyStatus('100')}
                      className={`inline-flex items-center justify-center gap-1 px-2 py-1.5 rounded-xl text-[11px] font-black shadow-xs active:scale-95 transition cursor-pointer select-none border ${
                        vStatus === '100'
                          ? 'bg-sky-100 hover:bg-sky-200 text-sky-900 border-sky-400 dark:bg-sky-950/70 dark:text-sky-200 dark:border-sky-600'
                          : 'bg-white dark:bg-slate-900 hover:bg-sky-50 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-800'
                      }`}
                      title="Activer / Désactiver l'icône bleue 100% Khdam"
                    >
                      <VerifiedIconImg className={`w-4 h-4 ${vStatus === '100' ? '' : 'opacity-45 grayscale'}`} />
                      <span className="leading-none">100%</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => applyStatus('50')}
                      className={`inline-flex items-center justify-center gap-1 px-2 py-1.5 rounded-xl text-[11px] font-black shadow-xs active:scale-95 transition cursor-pointer select-none border ${
                        vStatus === '50'
                          ? 'bg-orange-100 hover:bg-orange-200 text-orange-900 border-orange-400 dark:bg-orange-950/70 dark:text-orange-200 dark:border-orange-600'
                          : 'bg-white dark:bg-slate-900 hover:bg-orange-50 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-800'
                      }`}
                      title="Activer / Désactiver l'icône orange 50% Khdam"
                    >
                      <Verified50IconImg className={`w-4 h-4 ${vStatus === '50' ? '' : 'opacity-45 grayscale'}`} />
                      <span className="leading-none">50%</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => applyStatus('broken')}
                      className={`inline-flex items-center justify-center gap-1 px-2 py-1.5 rounded-xl text-[11px] font-black shadow-xs active:scale-95 transition cursor-pointer select-none border ${
                        vStatus === 'broken'
                          ? 'bg-red-100 hover:bg-red-200 text-red-900 border-red-400 dark:bg-red-950/70 dark:text-red-200 dark:border-red-600'
                          : 'bg-white dark:bg-slate-900 hover:bg-red-50 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800'
                      }`}
                      title="Activer / Désactiver l'icône rouge Makhdamch daba"
                    >
                      <VerifiedBrokenIconImg className={`w-4 h-4 ${vStatus === 'broken' ? '' : 'opacity-45 grayscale'}`} />
                      <span className="leading-none">Makhdamch</span>
                    </button>
                  </>
                );
              })()}

              <button
                type="button"
                onClick={() => {
                  triggerHaptic('medium');
                  toggleProductCodeDisabled(product.id);
                }}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[11px] font-black shadow-xs active:scale-95 transition cursor-pointer select-none border ${
                  codeDisabled
                    ? 'bg-slate-800 hover:bg-slate-900 text-white border-slate-700'
                    : 'bg-white dark:bg-slate-900 hover:bg-slate-50 text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-700'
                }`}
                title="Désactiver ou réactiver l'obligation de code pour cet article"
              >
                <Unlock className="w-3.5 h-3.5" />
                <span>{codeDisabled ? 'Code désactivé' : 'Désactiver code'}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  triggerHaptic('light');
                  setIsEditModalOpen(true);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#0759A4] hover:bg-blue-700 text-white text-xs font-black shadow-xs active:scale-95 transition cursor-pointer select-none shrink-0"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Modifier</span>
              </button>

              <button
                type="button"
                onClick={async () => {
                  if (!confirmDeleteInline) {
                    triggerHaptic('warning');
                    setConfirmDeleteInline(true);
                    setTimeout(() => setConfirmDeleteInline(false), 4000);
                    return;
                  }
                  triggerHaptic('warning');
                  await deleteProduct(product.id);
                  showToast(`🗑️ "${product.name}" supprimé.`);
                  onClose();
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black shadow-xs active:scale-95 transition cursor-pointer select-none shrink-0 ${
                  confirmDeleteInline
                    ? 'bg-red-700 text-white ring-2 ring-red-300'
                    : 'bg-red-50 hover:bg-red-600 text-red-700 hover:text-white border border-red-200'
                }`}
                title={confirmDeleteInline ? 'Cliquer à nouveau pour supprimer' : 'Supprimer cet article'}
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{confirmDeleteInline ? 'Confirmer ?' : 'Supprimer'}</span>
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

      {/* 6. Secure Admin Auth Modal from Product Page */}
      <AdminAuthModal
        isOpen={isPinModalOpen}
        title="Modifier cet Article"
        subtitle="Entrez le mot de passe Admin / Data pour modifier cette fiche produit directement"
        submitLabel="Déverrouiller & Modifier"
        onClose={() => setIsPinModalOpen(false)}
        onSuccess={() => {
          setRole('Admin');
          setIsPinModalOpen(false);
          showToast('🔒 Mode Administrateur déverrouillé !');
          setIsEditModalOpen(true);
        }}
      />
    </div>
  );
};

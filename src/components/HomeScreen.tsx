import React, { useRef, useMemo, useDeferredValue, useState } from 'react';
import {
  Search,
  Lightbulb,
  X,
  AlertCircle,
  ShoppingBag,
  HeartHandshake,
  CheckCircle2,
  BookOpen,
  Trash2,
  Copy,
  ScanLine,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Product } from '../types';
import {
  DEPARTMENT_CONFIGS,
  filterProducts,
  formatProductCodeBadge,
  getProductDisplayStatus,
  getPrimaryBarcode,
} from '../utils/productUtils';
import { triggerHaptic } from '../utils/haptics';
import { copyTextToClipboard } from '../utils/clipboard';
import { AppTutorialModal, TUTORIAL_STORAGE_KEY } from './AppTutorialModal';
import { Verified100Badge, getProductVerificationStatus } from './Verified100Badge';
import {
  WHATSAPP_PHONE_NUMBER,
  WhatsAppIcon,
  openWhatsApp,
} from './SuggestOneScreen';

export const HomeScreen: React.FC = () => {
  const {
    searchQuery,
    setSearchQuery,
    setActiveTab,
    products,
    barcodeVotes,
    noCodeSettings,
    setSelectedProduct,
    setSuggestActiveView,
    setSuggestInitialProduct,
    openSuggestForProduct,
    role,
    deleteProduct,
    showToast,
  } = useApp();

  const [isTutorialOpen, setIsTutorialOpen] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [visibleCount, setVisibleCount] = useState(60);
  const inputRef = useRef<HTMLInputElement>(null);
  const deferredQuery = useDeferredValue(searchQuery);

  // Reset visible slice when search query changes
  React.useEffect(() => {
    setVisibleCount(60);
  }, [deferredQuery]);

  // Auto-open tutorial on the very first time the app is launched
  React.useEffect(() => {
    try {
      const hasSeen = localStorage.getItem(TUTORIAL_STORAGE_KEY);
      if (!hasSeen) {
        setIsTutorialOpen(true);
      }
    } catch {
      // ignore
    }
  }, []);

  // Filter products when search text is entered
  const filteredProducts = useMemo(() => {
    if (!deferredQuery.trim()) return [];
    return filterProducts(
      products,
      deferredQuery,
      'ALL',
      'ALL',
      true,
      false,
      barcodeVotes,
      undefined,
      noCodeSettings
    );
  }, [products, deferredQuery, barcodeVotes, noCodeSettings]);

  const visibleProducts = useMemo(
    () => filteredProducts.slice(0, visibleCount),
    [filteredProducts, visibleCount]
  );

  const isSearching = searchQuery.trim().length > 0;

  const handleProductClick = (product: Product) => {
    const status = getProductDisplayStatus(product, barcodeVotes, noCodeSettings);
    if (status === 'UNAVAILABLE_NO_BARCODE') {
      triggerHaptic('warning');
      return;
    }
    triggerHaptic('light');
    setSelectedProduct(product);
  };

  const handleBarcodeHintClick = async () => {
    const firstWithBarcode = filteredProducts.find((p) => Boolean(getPrimaryBarcode(p, barcodeVotes)));
    const code = firstWithBarcode ? getPrimaryBarcode(firstWithBarcode, barcodeVotes) : '';
    if (code) {
      triggerHaptic('success');
      const ok = await copyTextToClipboard(code);
      if (ok) {
        showToast(`Code-barres ${code} copié !`);
        return;
      }
    }
    triggerHaptic('light');
    inputRef.current?.focus();
    showToast('Recherchez un produit puis copiez son code-barres');
  };

  return (
    <div className="w-full flex-1 flex flex-col max-w-[600px] mx-auto px-4 sm:px-6 py-4 sm:py-6 min-h-[calc(100dvh-64px)] pb-safe">
      {/* Top Persistent Search Container - Input is NEVER unmounted, keeping keyboard & cursor active */}
      <div
        className={`w-full max-w-[560px] mx-auto flex flex-col items-center ${
          isSearching ? 'mt-1.5 mb-3 shrink-0' : 'flex-1 justify-center py-4 sm:py-6 my-auto'
        }`}
      >
        {/* 3 Lightweight Blinking Notifications Stacked Vertically Above the Logos Image */}
        <div
          className={`w-full flex flex-col items-center justify-center gap-1.5 ${
            isSearching ? 'mb-2.5' : 'mb-3.5 sm:mb-4.5'
          }`}
        >
          <button
            type="button"
            onClick={() => {
              triggerHaptic('light');
              const cleanCode = searchQuery.trim();
              const msg = cleanCode
                ? `Salam, makhdemch lia had lcode (${cleanCode}), momkin tsa3dni?`
                : `Salam, makhdemch lia code, momkin tsa3dni?`;
              openWhatsApp(`https://wa.me/${WHATSAPP_PHONE_NUMBER}?text=${encodeURIComponent(msg)}`);
            }}
            className="animate-soft-blink inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-full bg-emerald-100/85 hover:bg-emerald-200/85 backdrop-blur-sm text-emerald-900 border border-emerald-300/80 shadow-2xs text-[10.5px] sm:text-xs font-extrabold tracking-tight cursor-pointer select-none active:scale-95 transition-colors max-w-full"
            title="Envoyer un message WhatsApp si un code ne fonctionne pas"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" aria-hidden="true" />
            <WhatsAppIcon className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span className="truncate">Ila makhdemch lik code sift WhatsApp</span>
          </button>

          <button
            type="button"
            onClick={handleBarcodeHintClick}
            className="animate-soft-blink inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-full bg-sky-100/85 hover:bg-sky-200/85 backdrop-blur-sm text-sky-900 border border-sky-300/80 shadow-2xs text-[10.5px] sm:text-xs font-extrabold tracking-tight cursor-pointer select-none active:scale-95 transition-colors max-w-full"
            title="Copier le code-barres pour qu'il fonctionne à 100%"
          >
            <span className="w-2 h-2 rounded-full bg-sky-500 shrink-0" aria-hidden="true" />
            <Copy className="w-3.5 h-3.5 text-sky-600 shrink-0" />
            <span className="truncate">Copie codebarre bach ikhdem 100%</span>
          </button>

          <button
            type="button"
            onClick={handleBarcodeHintClick}
            className="animate-soft-blink inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-full bg-purple-100/85 hover:bg-purple-200/85 backdrop-blur-sm text-purple-900 border border-purple-300/80 shadow-2xs text-[10.5px] sm:text-xs font-extrabold tracking-tight cursor-pointer select-none active:scale-95 transition-colors max-w-full"
            title="Si le scan ne passe pas, copiez le code-barres"
          >
            <span className="w-2 h-2 rounded-full bg-purple-500 shrink-0" aria-hidden="true" />
            <ScanLine className="w-3.5 h-3.5 text-purple-600 shrink-0" />
            <span className="truncate">Ila scanniti o mazach copie codebarre</span>
          </button>
        </div>

        {/* Centered Brand Banner Image Above Search Bar */}
        <div
          className={`w-full flex items-center justify-center px-2 ${
            isSearching ? 'mb-2.5' : 'mb-4 sm:mb-5'
          }`}
        >
          <img
            src="/assets/aistudio/barre_de_recherch_a0bb2929.png"
            alt="Aswak Assalam, Livry, Marjane"
            className={`w-auto object-contain select-none pointer-events-none ${
              isSearching
                ? 'h-7 xs:h-8 sm:h-10 max-w-[65%]'
                : 'h-11 xs:h-13 sm:h-15 md:h-18 max-w-[88%] sm:max-w-[400px]'
            }`}
            loading="eager"
            decoding="async"
          />
        </div>

        {/* Big Search Bar - Single persistent input across all states */}
        <div
          onClick={() => inputRef.current?.focus()}
          className={`w-full rounded-[18px] sm:rounded-[22px] glass-surface flex items-center px-4 sm:px-5 focus-within:border-[#0759A4] focus-within:ring-2 focus-within:ring-blue-500/20 cursor-text ${
            isSearching
              ? 'h-[48px] xs:h-[52px] sm:h-[56px]'
              : 'h-[56px] xs:h-[60px] sm:h-[66px]'
          }`}
        >
          <Search className="w-4 h-4 xs:w-5 xs:h-5 sm:w-6 sm:h-6 text-[#0759A4] shrink-0 mr-3" />
          <input
            ref={inputRef}
            type="search"
            inputMode="text"
            enterKeyHint="search"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Code ou nom du produit..."
            style={{ fontWeight: 700 }}
            className="w-full h-full bg-transparent border-none outline-none text-gray-900 font-bold text-sm xs:text-base sm:text-[18px] placeholder:text-gray-400 placeholder:font-medium placeholder:text-xs xs:placeholder:text-sm sm:placeholder:text-base"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                triggerHaptic('light');
                setSearchQuery('');
                inputRef.current?.focus();
              }}
              className="p-2 rounded-full hover:bg-gray-100 active:scale-95 text-gray-400 hover:text-gray-700 cursor-pointer ml-1.5 shrink-0 transition-colors"
              aria-label="Effacer la recherche"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Action Buttons under search bar - Unified Dimensions with Subtle Glassmorphism */}
        {!isSearching && (
          <div className="w-full mt-5 sm:mt-6 space-y-3">
            {/* Button 1: Bibliothèque des Rayons */}
            <button
              type="button"
              onClick={() => {
                triggerHaptic('light');
                setActiveTab('library');
              }}
              className="w-full h-[52px] xs:h-[56px] sm:h-[60px] px-4 sm:px-5 bg-[#0759A4]/90 hover:bg-[#0759A4] backdrop-blur-md text-white border border-white/25 rounded-[18px] font-bold text-xs xs:text-sm sm:text-base shadow-[0_8px_22px_rgba(7,89,164,0.22)] active:scale-[0.985] transition-colors flex items-center justify-center gap-3 cursor-pointer select-none"
            >
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-[9px] bg-white/15 flex items-center justify-center p-1 shrink-0">
                <img
                  src="/assets/aistudio/psd_2219503b.png"
                  alt="Marjane"
                  className="w-full h-full object-contain"
                  loading="eager"
                />
              </div>
              <span className="tracking-tight">Bibliothèque des Rayons</span>
            </button>

            {/* Button 2: Aidez-nous (Inverted Colors: Green Glass BG, White Text & White Icon Box) */}
            <button
              type="button"
              onClick={() => {
                triggerHaptic('light');
                setSuggestInitialProduct(null);
                setSuggestActiveView('hub');
                setActiveTab('suggest');
              }}
              className="w-full h-[52px] xs:h-[56px] sm:h-[60px] px-4 sm:px-5 bg-emerald-600/92 hover:bg-emerald-600 backdrop-blur-md text-white border border-white/25 rounded-[18px] font-bold text-xs xs:text-sm sm:text-base shadow-[0_8px_22px_rgba(5,150,105,0.22)] active:scale-[0.985] transition-colors flex items-center justify-center gap-3 cursor-pointer select-none"
            >
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-[9px] bg-white text-emerald-600 flex items-center justify-center shrink-0 shadow-2xs">
                <HeartHandshake className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
              </div>
              <span className="tracking-tight">Aidez-nous</span>
            </button>

            {/* Button 3: Astuces & Tutos */}
            <button
              type="button"
              onClick={() => {
                triggerHaptic('light');
                setActiveTab('tips');
              }}
              className="w-full h-[52px] xs:h-[56px] sm:h-[60px] px-4 sm:px-5 bg-white/78 hover:bg-amber-50/88 backdrop-blur-md text-amber-800 border border-amber-200/80 rounded-[18px] font-bold text-xs xs:text-sm sm:text-base shadow-[0_6px_18px_rgba(245,158,11,0.08)] active:scale-[0.985] transition-colors flex items-center justify-center gap-3 cursor-pointer select-none"
            >
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-[9px] bg-amber-50/95 text-amber-600 flex items-center justify-center shrink-0">
                <Lightbulb className="w-4 h-4 sm:w-4.5 sm:h-4.5 fill-amber-500/30" />
              </div>
              <span className="tracking-tight">Astuces &amp; Tutos Pratiques</span>
            </button>

            {/* Button 4: Guide (Same Dimensions as Other Buttons, Text Strictly "Guide") */}
            <button
              type="button"
              onClick={() => {
                triggerHaptic('medium');
                setIsTutorialOpen(true);
              }}
              className="w-full h-[52px] xs:h-[56px] sm:h-[60px] px-4 sm:px-5 bg-blue-50/78 hover:bg-blue-100/85 backdrop-blur-md text-[#0759A4] border border-blue-200/80 rounded-[18px] font-bold text-xs xs:text-sm sm:text-base shadow-[0_6px_18px_rgba(7,89,164,0.08)] active:scale-[0.985] transition-colors flex items-center justify-center gap-3 cursor-pointer select-none"
            >
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-[9px] bg-white/95 text-[#0759A4] border border-blue-200/70 flex items-center justify-center shrink-0">
                <BookOpen className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
              </div>
              <span className="tracking-tight">Guide</span>
            </button>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* SEARCHING STATE : LISTE DES RÉSULTATS (Visible dès qu'on tape un mot)     */}
      {/* ========================================================================= */}
      {isSearching && (
        <div className="flex-1 w-full max-w-[560px] mx-auto flex flex-col mb-4 overflow-y-auto">
          <div className="flex items-center justify-between gap-2 px-1.5 mb-2.5">
            <span className="text-[11px] font-bold text-gray-500 tabular-nums whitespace-nowrap">
              {filteredProducts.length} résultat{filteredProducts.length > 1 ? 's' : ''}
            </span>

            <button
              type="button"
              onClick={() => {
                triggerHaptic('light');
                setSearchQuery('');
                inputRef.current?.focus();
              }}
              className="text-[11px] font-bold text-[#0759A4] hover:underline cursor-pointer whitespace-nowrap shrink-0"
            >
              Effacer
            </button>
          </div>

          {filteredProducts.length > 0 ? (
            <div className="space-y-2 pb-4">
              {visibleProducts.map((product) => {
                const displayCodeLabel = formatProductCodeBadge(
                  product.code,
                  product,
                  barcodeVotes,
                  noCodeSettings
                );
                const showMissingPrompt = displayCodeLabel === 'Indisponible';
                const deptConf = DEPARTMENT_CONFIGS[product.department] || DEPARTMENT_CONFIGS['Fruits et légumes'];
                const primaryBarcode = getPrimaryBarcode(product, barcodeVotes);

                return (
                  <div
                    key={product.id}
                    onClick={() => handleProductClick(product)}
                    className="cv-card w-full rounded-[18px] p-2.5 sm:p-3 shadow-2xs active:scale-[0.99] transition-transform duration-100 flex items-center gap-3 cursor-pointer select-none border border-black/10"
                    style={{ backgroundColor: deptConf.accentColor }}
                  >
                    {/* White Thumbnail Box */}
                    <div className="w-12 h-12 sm:w-13 sm:h-13 rounded-[12px] bg-white p-1.5 flex items-center justify-center shrink-0 overflow-hidden shadow-2xs">
                      {product.imageUrl ? (
                        <img
                          src={product.imageUrl}
                          alt={product.name}
                          className="w-full h-full object-contain"
                          loading="lazy"
                          decoding="async"
                          referrerPolicy="no-referrer"
                          onError={(e) => {
                            (e.currentTarget as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      ) : (
                        <ShoppingBag className="w-4 h-4 text-gray-400" />
                      )}
                    </div>

                    {/* Details: White text */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
                        {/* Code badge */}
                        <span
                          className="px-1.5 py-0.5 rounded-[6px] font-mono font-black text-[10px] sm:text-[11px] shadow-2xs shrink-0 tabular-nums whitespace-nowrap"
                          style={{
                            backgroundColor: showMissingPrompt ? '#EA580C' : '#FFFFFF',
                            color: showMissingPrompt ? '#FFFFFF' : deptConf.accentColor,
                          }}
                        >
                          {displayCodeLabel}
                        </span>

                        {/* If code is indisponible and NOT disabled, show orange Aidez-nous button */}
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

                        <span className="text-[9.5px] text-white/85 font-medium truncate">
                          {deptConf.shortName}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 min-w-0">
                        <h3 className="text-[13px] sm:text-[14px] font-extrabold text-white truncate leading-snug">
                          {product.name}
                        </h3>
                        <Verified100Badge
                          variant="card"
                          status={getProductVerificationStatus(product)}
                        />
                      </div>

                      {primaryBarcode && (
                        <p className="text-[9.5px] font-mono text-white/85 truncate mt-0.5 tabular-nums">
                          Code : {primaryBarcode}
                        </p>
                      )}
                    </div>

                    {/* Admin Quick Delete + Status Badge */}
                    <div className="shrink-0 flex items-center gap-1.5">
                      {role === 'Admin' && (
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
                          className={`px-1.5 py-1.5 rounded-[8px] text-white transition-colors active:scale-90 cursor-pointer shadow-2xs inline-flex items-center gap-1 text-[9.5px] font-black ${
                            confirmDeleteId === product.id
                              ? 'bg-red-600 ring-2 ring-white/80'
                              : 'bg-red-600/80 hover:bg-red-600'
                          }`}
                          title={
                            confirmDeleteId === product.id
                              ? 'Cliquer encore pour supprimer'
                              : 'Supprimer cet article (Admin)'
                          }
                        >
                          <Trash2 className="w-3.5 h-3.5 text-white" />
                          {confirmDeleteId === product.id && <span>OK ?</span>}
                        </button>
                      )}
                      <div className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-[7px] bg-white/20 text-white text-[9.5px] font-bold">
                        <CheckCircle2 className="w-3 h-3 text-white" />
                        <span className="hidden xs:inline">{primaryBarcode ? 'Valide' : 'Actif'}</span>
                      </div>
                    </div>
                  </div>
                );
              })}

              {filteredProducts.length > visibleCount && (
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic('light');
                    setVisibleCount((prev) => prev + 60);
                  }}
                  className="w-full py-2.5 rounded-[14px] bg-white border border-gray-200 text-[#0759A4] hover:bg-blue-50 text-xs font-extrabold cursor-pointer transition-colors"
                >
                  Afficher plus (+{filteredProducts.length - visibleCount} restants)
                </button>
              )}
            </div>
          ) : (
            <div className="glass-surface rounded-[20px] p-7 sm:p-8 text-center my-auto">
              <AlertCircle className="w-7 h-7 text-gray-400 mx-auto mb-2" />
              <h4 className="text-xs font-bold text-gray-900">Aucun produit trouvé</h4>
              <p className="text-[10.5px] text-gray-500 mt-1">
                Vérifiez le numéro de code ou le libellé saisi.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Interactive 3-Slide Tutorial Modal */}
      <AppTutorialModal
        isOpen={isTutorialOpen}
        onClose={() => setIsTutorialOpen(false)}
        onOpenSuggest={() => {
          setSuggestInitialProduct(null);
          setSuggestActiveView('hub');
          setActiveTab('suggest');
        }}
        onOpenTips={() => setActiveTab('tips')}
      />
    </div>
  );
};

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
import { AppTutorialModal, TUTORIAL_STORAGE_KEY } from './AppTutorialModal';
import { Verified100Badge, getProductVerificationStatus } from './Verified100Badge';

export const HomeScreen: React.FC = () => {
  const {
    searchQuery,
    setSearchQuery,
    setActiveTab,
    products,
    barcodeVotes,
    setSelectedProduct,
    setSuggestActiveView,
    setSuggestInitialProduct,
    openSuggestForProduct,
  } = useApp();

  const [isTutorialOpen, setIsTutorialOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const deferredQuery = useDeferredValue(searchQuery);

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
      barcodeVotes
    );
  }, [products, deferredQuery, barcodeVotes]);

  const isSearching = searchQuery.trim().length > 0;

  const handleProductClick = (product: Product) => {
    const status = getProductDisplayStatus(product, barcodeVotes);
    if (status === 'UNAVAILABLE_NO_BARCODE') {
      triggerHaptic('warning');
      return;
    }
    triggerHaptic('light');
    setSelectedProduct(product);
  };

  return (
    <div className="w-full flex-1 flex flex-col max-w-[600px] mx-auto px-3 sm:px-4 py-2 sm:py-3 min-h-[calc(100dvh-60px)] pb-safe">
      {/* Top Persistent Search Container - Input is NEVER unmounted, keeping keyboard & cursor active */}
      <div
        className={`w-full max-w-[560px] mx-auto flex flex-col items-center transition-all duration-150 ${
          isSearching ? 'mt-1 mb-2 shrink-0' : 'flex-1 justify-center py-4 my-auto'
        }`}
      >
        {/* Centered Brand Banner Image Above Search Bar */}
        <div
          className={`w-full flex items-center justify-center px-2 transition-all duration-150 ${
            isSearching ? 'mb-2' : 'mb-3.5 sm:mb-5'
          }`}
        >
          <img
            src="/assets/aistudio/barre_de_recherch_a0bb2929.png"
            alt="Aswak Assalam, Livry, Marjane"
            className={`w-auto transition-all duration-150 object-contain select-none pointer-events-none drop-shadow-xs dark:brightness-110 ${
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
          className={`w-full rounded-[16px] sm:rounded-[20px] glass-surface flex items-center px-3.5 sm:px-4.5 transition-all focus-within:border-[#0759A4] dark:focus-within:border-blue-500 focus-within:ring-4 focus-within:ring-blue-500/15 cursor-text ${
            isSearching
              ? 'h-[46px] xs:h-[50px] sm:h-[56px]'
              : 'h-[54px] xs:h-[60px] sm:h-[66px]'
          }`}
        >
          <Search className="w-4 h-4 xs:w-5 xs:h-5 sm:w-6 sm:h-6 text-[#0759A4] dark:text-blue-400 shrink-0 mr-2.5 sm:mr-3" />
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
            className="w-full h-full bg-transparent border-none outline-none text-gray-900 dark:text-slate-100 font-bold text-sm xs:text-base sm:text-[18px] placeholder:text-gray-400 dark:placeholder:text-slate-500 placeholder:font-medium placeholder:text-xs xs:placeholder:text-sm sm:placeholder:text-base"
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
              className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-slate-800 active:scale-95 text-gray-400 hover:text-gray-700 dark:hover:text-white cursor-pointer ml-1 shrink-0 transition-colors"
              aria-label="Effacer la recherche"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Action Buttons under search bar */}
        {!isSearching && (
          <div className="w-full mt-3.5 sm:mt-4.5 space-y-2.5 animate-in fade-in duration-150">
            {/* Button 1: Bibliothèque des Rayons */}
            <button
              type="button"
              onClick={() => {
                triggerHaptic('light');
                setActiveTab('library');
              }}
              className="w-full h-[52px] xs:h-[56px] sm:h-[60px] bg-[#0759A4]/90 hover:bg-[#0759A4] backdrop-blur-xl text-white border border-white/25 rounded-[16px] font-bold text-xs xs:text-sm sm:text-base shadow-[0_10px_28px_rgba(7,89,164,0.28)] active:scale-[0.985] transition-all flex items-center justify-center gap-3 cursor-pointer select-none relative overflow-hidden"
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

            {/* Button 2: Aidez-nous */}
            <button
              type="button"
              onClick={() => {
                triggerHaptic('light');
                setSuggestInitialProduct(null);
                setSuggestActiveView('hub');
                setActiveTab('suggest');
              }}
              className="w-full h-[50px] xs:h-[54px] sm:h-[58px] bg-white/72 dark:bg-[#0E1526]/72 backdrop-blur-xl hover:bg-emerald-50/85 dark:hover:bg-slate-800/80 text-emerald-700 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-700/50 rounded-[16px] font-bold text-xs xs:text-sm sm:text-base shadow-[0_6px_22px_rgba(16,185,129,0.08)] active:scale-[0.985] transition-all flex items-center justify-center gap-3 cursor-pointer select-none"
            >
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-[9px] bg-emerald-50/90 dark:bg-emerald-950/70 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
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
              className="w-full h-[50px] xs:h-[54px] sm:h-[58px] bg-white/72 dark:bg-[#0E1526]/72 backdrop-blur-xl hover:bg-amber-50/85 dark:hover:bg-slate-800/80 text-amber-800 dark:text-amber-300 border border-amber-200/80 dark:border-amber-700/50 rounded-[16px] font-bold text-xs xs:text-sm sm:text-base shadow-[0_6px_22px_rgba(245,158,11,0.08)] active:scale-[0.985] transition-all flex items-center justify-center gap-3 cursor-pointer select-none"
            >
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-[9px] bg-amber-50/90 dark:bg-amber-950/70 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                <Lightbulb className="w-4 h-4 sm:w-4.5 sm:h-4.5 fill-amber-500/30" />
              </div>
              <span className="tracking-tight">Astuces &amp; Tutos Pratiques</span>
            </button>

            {/* Button 4: Tutoriel (3 Slides b Darija) */}
            <button
              type="button"
              onClick={() => {
                triggerHaptic('medium');
                setIsTutorialOpen(true);
              }}
              className="w-full py-2.5 px-3 rounded-[12px] bg-blue-50/70 dark:bg-blue-950/50 backdrop-blur-md border border-blue-200/80 dark:border-blue-800/60 text-[#0759A4] dark:text-blue-300 hover:bg-blue-100/80 dark:hover:bg-blue-900/60 text-[11px] font-extrabold transition flex items-center justify-center gap-1.5 cursor-pointer select-none active:scale-[0.99]"
            >
              <BookOpen className="w-3.5 h-3.5 text-[#0759A4] dark:text-blue-400" />
              <span>📖 Guide Tuto Pickeur (B Darija - 3 Khotowat)</span>
            </button>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* SEARCHING STATE : LISTE DES RÉSULTATS (Visible dès qu'on tape un mot)     */}
      {/* ========================================================================= */}
      {isSearching && (
        <div className="flex-1 w-full max-w-[560px] mx-auto flex flex-col mb-3 overflow-y-auto animate-in fade-in duration-150">
          <div className="flex items-center justify-between px-1 mb-2">
            <span className="text-[11px] font-bold text-gray-500 dark:text-slate-400 tabular-nums">
              {filteredProducts.length} résultat{filteredProducts.length > 1 ? 's' : ''}
            </span>
            <button
              type="button"
              onClick={() => {
                triggerHaptic('light');
                setSearchQuery('');
                inputRef.current?.focus();
              }}
              className="text-[11px] font-bold text-[#0759A4] dark:text-blue-400 hover:underline cursor-pointer"
            >
              Effacer pour voir les boutons
            </button>
          </div>

          {filteredProducts.length > 0 ? (
            <div className="space-y-1.5 pb-3">
              {filteredProducts.map((product) => {
                const codeBadge = formatProductCodeBadge(product.code);
                const deptConf = DEPARTMENT_CONFIGS[product.department] || DEPARTMENT_CONFIGS['Fruits et légumes'];
                const primaryBarcode = getPrimaryBarcode(product, barcodeVotes);

                return (
                  <div
                    key={product.id}
                    onClick={() => handleProductClick(product)}
                    className="w-full rounded-[15px] p-2 sm:p-2.5 shadow-2xs hover:shadow-md active:scale-[0.99] transition-all flex items-center gap-2.5 cursor-pointer select-none border border-black/10 dark:border-white/15"
                    style={{ backgroundColor: deptConf.accentColor }}
                  >
                    {/* White Thumbnail Box */}
                    <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-[10px] bg-white p-1 flex items-center justify-center shrink-0 overflow-hidden shadow-2xs">
                      {product.imageUrl ? (
                        <img
                          src={product.imageUrl}
                          alt={product.name}
                          className="w-full h-full object-contain"
                          loading="lazy"
                        />
                      ) : (
                        <ShoppingBag className="w-4 h-4 text-gray-400" />
                      )}
                    </div>

                    {/* Details: White text */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
                        {/* Code badge: If Indisponible -> Limouni (Orange), else White */}
                        <span
                          className="px-1.5 py-0.5 rounded-[6px] font-mono font-black text-[10px] sm:text-[11px] shadow-2xs shrink-0 tabular-nums"
                          style={{
                            backgroundColor: codeBadge === 'Indisponible' ? '#EA580C' : '#FFFFFF',
                            color: codeBadge === 'Indisponible' ? '#FFFFFF' : deptConf.accentColor,
                          }}
                        >
                          {codeBadge}
                        </span>

                        {/* If code is indisponible, show orange Aidez-nous button */}
                        {codeBadge === 'Indisponible' && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              triggerHaptic('light');
                              openSuggestForProduct(product);
                            }}
                            className="px-2 py-0.5 rounded-[6px] bg-[#EA580C] hover:bg-[#C2410C] text-white text-[9.5px] font-extrabold flex items-center gap-1 shadow-2xs active:scale-95 transition cursor-pointer select-none border border-white/20"
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

                    {/* Badge */}
                    <div className="shrink-0 flex items-center gap-0.5 px-1.5 py-0.5 rounded-[7px] bg-white/20 text-white text-[9.5px] font-bold backdrop-blur-xs">
                      <CheckCircle2 className="w-3 h-3 text-white" />
                      <span className="hidden xs:inline">Valide</span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="glass-surface rounded-[18px] p-6 text-center my-auto">
              <AlertCircle className="w-7 h-7 text-gray-400 dark:text-slate-500 mx-auto mb-1.5" />
              <h4 className="text-xs font-bold text-gray-900 dark:text-white">Aucun produit trouvé</h4>
              <p className="text-[10.5px] text-gray-500 dark:text-slate-400 mt-0.5">
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

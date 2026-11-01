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
} from '../utils/productUtils';
import { triggerHaptic } from '../utils/haptics';
import { AppTutorialModal, TUTORIAL_STORAGE_KEY } from './AppTutorialModal';

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
      {!isSearching ? (
        /* ========================================================================= */
        /* DEFAULT STATE : BARRE DE RECHERCHE + 3 BOUTONS DIRECTEMENT EN DESSOUS     */
        /* (Les 3 boutons disparaissent dès que l'utilisateur tape une recherche)    */
        /* ========================================================================= */
        <div className="w-full flex-1 flex flex-col justify-center items-center py-4 my-auto">
          {/* Centered Brand Banner Image Above Search Bar */}
          <div className="w-full flex items-center justify-center mb-3 sm:mb-4 px-2">
            <img
              src="/assets/aistudio/barre_de_recherch_a0bb2929.png"
              alt="Aswak Assalam, Livry, Marjane"
              className="w-auto h-11 xs:h-13 sm:h-15 md:h-18 max-w-[88%] sm:max-w-[400px] transition-all object-contain select-none pointer-events-none drop-shadow-xs"
              loading="eager"
              decoding="async"
            />
          </div>

          {/* Big Centered Search Bar */}
          <div
            onClick={() => inputRef.current?.focus()}
            className="w-full max-w-[560px] h-[52px] xs:h-[58px] sm:h-[64px] rounded-[16px] sm:rounded-[20px] bg-[#FFFFFF] dark:bg-slate-800 shadow-[0_4px_20px_rgba(7,89,164,0.10)] border-2 border-[#0759A4]/35 dark:border-blue-500/40 hover:border-[#0759A4] flex items-center px-3.5 sm:px-4.5 transition-all focus-within:border-[#0759A4] focus-within:ring-4 focus-within:ring-[#0759A4]/15 cursor-text"
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
              className="w-full h-full bg-transparent border-none outline-none text-[#171717] dark:text-white font-bold text-sm xs:text-base sm:text-[18px] placeholder:text-gray-400 dark:placeholder:text-slate-400 placeholder:font-medium placeholder:text-xs xs:placeholder:text-sm sm:placeholder:text-base"
            />
          </div>

          {/* ========================================================================= */}
          {/* DIRECTEMENT SOUS LA BARRE DE RECHERCHE : LES 3 BOUTONS DU MEME GABARIT   */}
          {/* (Bibliothèque, Aidez-nous, Astuces)                                      */}
          {/* ========================================================================= */}
          <div className="w-full max-w-[560px] mt-3 sm:mt-4 space-y-2.5">
            {/* Bouton 1 : Bibliothèque des Rayons (avec logo Marjane psd.png) */}
            <button
              type="button"
              onClick={() => {
                triggerHaptic('light');
                setActiveTab('library');
              }}
              className="w-full h-[48px] xs:h-[52px] sm:h-[56px] bg-[#0759A4] hover:bg-[#064a88] text-[#FFFFFF] rounded-[14px] sm:rounded-[16px] font-bold text-xs xs:text-sm sm:text-base shadow-[0_4px_14px_rgba(7,89,164,0.20)] active:scale-[0.98] transition-all flex items-center justify-center gap-2.5 cursor-pointer select-none"
            >
              <img
                src="/assets/aistudio/psd_2219503b.png"
                alt="Marjane"
                className="w-5 h-5 sm:w-6 sm:h-6 object-contain"
                loading="eager"
              />
              <span>Bibliothèque des Rayons</span>
            </button>

            {/* Bouton 2 : Aidez-nous (Hub : I Need & Compléter les produits) */}
            <button
              type="button"
              onClick={() => {
                triggerHaptic('light');
                setSuggestInitialProduct(null);
                setSuggestActiveView('hub');
                setActiveTab('suggest');
              }}
              className="w-full h-[48px] xs:h-[52px] sm:h-[56px] bg-[#155B48] hover:bg-[#104838] text-[#FFFFFF] rounded-[14px] sm:rounded-[16px] font-bold text-xs xs:text-sm sm:text-base shadow-[0_4px_14px_rgba(21,91,72,0.22)] active:scale-[0.98] transition-all flex items-center justify-center gap-2.5 cursor-pointer select-none"
            >
              <HeartHandshake className="w-5 h-5 text-emerald-200" />
              <span>Aidez-nous</span>
            </button>

            {/* Bouton 3 : Astuces & Tuto */}
            <button
              type="button"
              onClick={() => {
                triggerHaptic('light');
                setActiveTab('tips');
              }}
              className="w-full h-[48px] xs:h-[52px] sm:h-[56px] bg-[#FFFFFF] dark:bg-slate-800 border-2 border-[#0759A4]/25 dark:border-slate-700 text-[#0759A4] dark:text-blue-300 hover:bg-[#EBF4FC]/60 dark:hover:bg-slate-700/80 rounded-[14px] sm:rounded-[16px] font-bold text-xs xs:text-sm sm:text-base shadow-xs active:scale-[0.98] transition-all flex items-center justify-center gap-2.5 cursor-pointer select-none"
            >
              <Lightbulb className="w-5 h-5 text-amber-500 fill-amber-500 shrink-0" />
              <span>Astuces &amp; Tutos Pratiques</span>
            </button>

            {/* Bouton d'accès direct au Tutoriel (3 Slides b Darija) */}
            <button
              type="button"
              onClick={() => {
                triggerHaptic('medium');
                setIsTutorialOpen(true);
              }}
              className="w-full py-2 px-3 rounded-[12px] bg-blue-50 dark:bg-blue-950/40 border border-blue-200/80 dark:border-blue-800 text-[#0759A4] dark:text-blue-300 hover:bg-blue-100/70 text-[11px] font-extrabold transition flex items-center justify-center gap-1.5 cursor-pointer select-none"
            >
              <BookOpen className="w-3.5 h-3.5 text-[#0759A4] dark:text-blue-300" />
              <span>📖 Guide Tuto Pickeur (B Darija - 3 Khotowat)</span>
            </button>
          </div>
        </div>
      ) : (
        /* ========================================================================= */
        /* SEARCHING STATE : BARRE DE RECHERCHE + RÉSULTATS                          */
        /* (Les 3 boutons sont masqués tant qu'il y a du texte dans la recherche)   */
        /* ========================================================================= */
        <div className="w-full flex-1 flex flex-col">
          {/* Top Compact Brand & Search Bar */}
          <div className="w-full max-w-[560px] mx-auto flex flex-col items-center justify-center mt-1 mb-2 shrink-0">
            <div className="w-full flex items-center justify-center mb-2 px-2">
              <img
                src="/assets/aistudio/barre_de_recherch_a0bb2929.png"
                alt="Aswak Assalam, Livry, Marjane"
                className="w-auto h-7 xs:h-8 sm:h-10 max-w-[65%] object-contain select-none pointer-events-none drop-shadow-xs"
                loading="eager"
                decoding="async"
              />
            </div>

            <div
              onClick={() => inputRef.current?.focus()}
              className="w-full h-[46px] xs:h-[50px] sm:h-[56px] rounded-[14px] sm:rounded-[18px] bg-[#FFFFFF] dark:bg-slate-800 shadow-[0_4px_16px_rgba(7,89,164,0.08)] border-2 border-[#0759A4] dark:border-blue-500 flex items-center px-3 sm:px-4 transition-all focus-within:ring-3 focus-within:ring-[#0759A4]/15 cursor-text"
            >
              <Search className="w-4 h-4 xs:w-5 xs:h-5 text-[#0759A4] dark:text-blue-400 shrink-0 mr-2 sm:mr-3" />
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
                className="w-full h-full bg-transparent border-none outline-none text-[#171717] dark:text-white font-bold text-sm xs:text-base placeholder:text-gray-400 dark:placeholder:text-slate-400 placeholder:font-medium placeholder:text-xs"
              />
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  triggerHaptic('light');
                  setSearchQuery('');
                  inputRef.current?.focus();
                }}
                className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-slate-700 active:scale-95 text-gray-400 hover:text-gray-600 dark:hover:text-white cursor-pointer ml-1 shrink-0"
                aria-label="Effacer la recherche"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Results list (Takes full screen space without buttons blocking) */}
          <div className="flex-1 w-full max-w-[560px] mx-auto flex flex-col mb-3 overflow-y-auto">
            <div className="flex items-center justify-between px-1 mb-1.5">
              <span className="text-[11px] font-bold text-gray-500 dark:text-slate-400">
                {filteredProducts.length} résultat{filteredProducts.length > 1 ? 's' : ''}
              </span>
              <button
                type="button"
                onClick={() => setSearchQuery('')}
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
                  const primaryBarcode = product.barcodeMarjane || product.barcodeP2 || product.barcodeInterne;

                  return (
                    <div
                      key={product.id}
                      onClick={() => handleProductClick(product)}
                      className="w-full rounded-[14px] p-2 sm:p-2.5 shadow-2xs hover:shadow-sm active:scale-[0.99] transition-all flex items-center gap-2.5 cursor-pointer select-none border border-black/5"
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
                            className="px-1.5 py-0.5 rounded-[5px] font-black text-[10px] sm:text-[11px] shadow-2xs shrink-0"
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
                              className="px-2 py-0.5 rounded-[5px] bg-[#EA580C] hover:bg-[#C2410C] text-white text-[9.5px] font-extrabold flex items-center gap-1 shadow-2xs active:scale-95 transition cursor-pointer select-none border border-white/20"
                              title="Ajouter le code court manquant"
                            >
                              <span>Aidez-nous</span>
                            </button>
                          )}

                          <span className="text-[9.5px] text-white/85 font-medium truncate">
                            {deptConf.shortName}
                          </span>
                        </div>

                        <h3 className="text-[13px] sm:text-[14px] font-extrabold text-white truncate leading-snug">
                          {product.name}
                        </h3>

                        {primaryBarcode && (
                          <p className="text-[9.5px] font-mono text-white/80 truncate mt-0.5">
                            Code : {primaryBarcode}
                          </p>
                        )}
                      </div>

                      {/* Badge */}
                      <div className="shrink-0 flex items-center gap-0.5 px-1.5 py-0.5 rounded-[6px] bg-white/20 text-white text-[9.5px] font-bold backdrop-blur-xs">
                        <CheckCircle2 className="w-3 h-3 text-white" />
                        <span className="hidden xs:inline">Valide</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="bg-white dark:bg-slate-800 rounded-[16px] p-5 text-center border border-gray-100 dark:border-slate-700 shadow-2xs my-auto">
                <AlertCircle className="w-7 h-7 text-gray-300 dark:text-slate-500 mx-auto mb-1" />
                <h4 className="text-xs font-bold text-gray-800 dark:text-slate-200">Aucun produit trouvé</h4>
                <p className="text-[10px] text-gray-400 dark:text-slate-400 mt-0.5">
                  Vérifiez le numéro de code ou le libellé saisi.
                </p>
              </div>
            )}
          </div>
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

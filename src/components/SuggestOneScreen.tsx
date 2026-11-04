import React, { useState, useMemo, useEffect } from 'react';
import {
  ArrowLeft,
  Camera,
  Barcode,
  CheckCircle2,
  AlertTriangle,
  Search,
  Sparkles,
  Check,
  Plus,
  ShoppingBag,
  Lock,
  HeartHandshake,
  ChevronRight,
  FileText,
  Image as ImageIcon,
  Send,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Department, Product } from '../types';
import {
  DEPARTMENT_CONFIGS,
  isProductMissingCode,
  isProductMissingBarcode,
  isProductIncomplete,
  formatProductCodeBadge,
  normalizeSearchText,
  hasValidProductCode,
} from '../utils/productUtils';
import { BarcodeScannerModal } from './BarcodeScannerModal';
import { triggerHaptic } from '../utils/haptics';

// WhatsApp Contact Configuration
export const WHATSAPP_PHONE_NUMBER = '212664958466';
export const WHATSAPP_DISPLAY_NUMBER = '+212 664-958466';

/**
 * Builds WhatsApp URL for "I Need" requests
 * User can choose Screen or Text
 * Format for Text:
 * BONJOUR J'AI BESOIN DE CE CODE SVP :
 * CODE : [code]
 * NOM DE PRODUIT : [nom]
 */
export const buildINeedWhatsAppUrl = (
  mode: 'screen' | 'text',
  code: string,
  name: string
) => {
  const cleanCode = code ? code.replace(/^#\s*/, '').trim() : '';
  const cleanName = name ? name.trim() : '';

  let message = '';
  if (mode === 'text') {
    message = `BONJOUR J'AI BESOIN DE CE CODE SVP :\nCODE : ${cleanCode || '-'}\nNOM DE PRODUIT : ${cleanName || '-'}`;
  } else {
    // Screen mode
    if (cleanCode || cleanName) {
      message = `BONJOUR J'AI BESOIN DE CE CODE SVP (Capture d'écran ci-jointe) :\nCODE : ${cleanCode || '-'}\nNOM DE PRODUIT : ${cleanName || '-'}`;
    } else {
      message = `BONJOUR J'AI BESOIN DE CE CODE SVP (Capture d'écran ci-jointe)`;
    }
  }
  return `https://wa.me/${WHATSAPP_PHONE_NUMBER}?text=${encodeURIComponent(message)}`;
};

/**
 * Builds WhatsApp URL for "Aidez-nous" (Compléter un produit)
 * Sent strictly via WhatsApp message ("KHLIHA GHIR B MSG WTSP")
 * User can choose Screen or Text:
 * Format for Text:
 * BONJOUR VOILA CE PRODUIT :
 * CODE : [code]
 * NOM DE PRODUIT DEPUIS L'APP : [nom]
 * CODEBARRE : [codebarre]
 * Format for Screen:
 * BONJOUR VOILA CE PRODUIT (Capture d'écran ci-jointe) :
 * NOM DE PRODUIT DEPUIS L'APP : [nom]
 */
export const buildAidezNousWhatsAppUrl = (
  mode: 'screen' | 'text',
  productNameFromApp: string,
  code: string,
  barcode: string
) => {
  const cleanCode = code ? code.replace(/^#\s*/, '').trim() : '';
  const cleanBarcode = barcode ? barcode.replace(/\D/g, '').trim() : '';
  const appProductName = productNameFromApp ? productNameFromApp.trim() : '';

  let message = '';
  if (mode === 'text') {
    message = `BONJOUR VOILA CE PRODUIT :\nCODE : ${cleanCode || '-'}\nNOM DE PRODUIT DEPUIS L'APP : ${appProductName || '-'}\nCODEBARRE : ${cleanBarcode || '-'}`;
  } else {
    // Screen mode
    message = `BONJOUR VOILA CE PRODUIT (Capture d'écran ci-jointe) :\nNOM DE PRODUIT DEPUIS L'APP : ${appProductName || '-'}`;
  }
  return `https://wa.me/${WHATSAPP_PHONE_NUMBER}?text=${encodeURIComponent(message)}`;
};

export const openWhatsApp = (url: string) => {
  try {
    const link = document.createElement('a');
    link.href = url;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch {
    window.location.href = url;
  }
};

export const WhatsAppIcon: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
    aria-hidden="true"
  >
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
  </svg>
);

interface SuggestOneScreenProps {
  onBack: () => void;
}

export const SuggestOneScreen: React.FC<SuggestOneScreenProps> = ({ onBack }) => {
  const {
    products,
    updateProduct,
    showToast,
    suggestInitialProduct,
    setSuggestInitialProduct,
    suggestActiveView,
    setSuggestActiveView,
  } = useApp();

  // Mode toggles: 'screen' (Capture) vs 'text' (Texte)
  const [iNeedMode, setINeedMode] = useState<'screen' | 'text'>('screen');
  const [aidezMode, setAidezMode] = useState<'screen' | 'text'>('screen');

  // Form states
  const [productName, setProductName] = useState('');
  const [productCode, setProductCode] = useState('');
  const [barcode, setBarcode] = useState('');
  const [editingExistingProduct, setEditingExistingProduct] = useState<Product | null>(null);

  // Scanner modal state
  const [isScannerOpen, setIsScannerOpen] = useState(false);

  // Success state
  const [isSavedSuccess, setIsSavedSuccess] = useState(false);
  const [savedSummary, setSavedSummary] = useState<{
    title: string;
    detail1: string;
    detail2: string;
    detail3?: string;
    whatsappUrl: string;
  } | null>(null);

  // Search in incomplete products view
  const [incompleteSearchQuery, setIncompleteSearchQuery] = useState('');
  const [incompleteFilter, setIncompleteFilter] = useState<'ALL' | 'WITH_CODE_NO_BARCODE' | 'NO_CODE' | 'NO_BARCODE'>('ALL');

  // Pre-fill form if an initial product was selected
  useEffect(() => {
    if (suggestInitialProduct) {
      setEditingExistingProduct(suggestInitialProduct);
      setProductName(suggestInitialProduct.name || '');
      setProductCode(
        suggestInitialProduct.code &&
          suggestInitialProduct.code !== '-' &&
          suggestInitialProduct.code !== 'XXXX'
          ? suggestInitialProduct.code.replace(/^#\s*/, '')
          : ''
      );
      setBarcode(
        suggestInitialProduct.barcodeMarjane ||
          suggestInitialProduct.barcodeP2 ||
          suggestInitialProduct.barcodeInterne ||
          ''
      );
      setSuggestActiveView('form');
      setIsSavedSuccess(false);
    }
  }, [suggestInitialProduct, setSuggestActiveView]);

  // Products that HAVE code but MISSING barcode (User request: "fihom les codes mais bla code barres")
  const withCodeNoBarcodeProducts = useMemo(() => {
    return products.filter((p) => hasValidProductCode(p.code) && isProductMissingBarcode(p));
  }, [products]);

  // Count incomplete products (missing code OR missing barcode)
  const incompleteProducts = useMemo(() => {
    return products.filter(isProductIncomplete);
  }, [products]);

  // Filter incomplete products by search and filter type
  const filteredIncompleteProducts = useMemo(() => {
    const q = normalizeSearchText(incompleteSearchQuery);
    return incompleteProducts.filter((p) => {
      if (incompleteFilter === 'WITH_CODE_NO_BARCODE') {
        if (!hasValidProductCode(p.code) || !isProductMissingBarcode(p)) return false;
      }
      if (incompleteFilter === 'NO_CODE' && !isProductMissingCode(p)) return false;
      if (incompleteFilter === 'NO_BARCODE' && !isProductMissingBarcode(p)) return false;

      if (!q) return true;
      const matchName = normalizeSearchText(p.name).includes(q);
      const matchCode = p.code ? normalizeSearchText(p.code).includes(q) : false;
      const matchDept = normalizeSearchText(p.department).includes(q);
      return matchName || matchCode || matchDept;
    });
  }, [incompleteProducts, incompleteSearchQuery, incompleteFilter]);

  // Handle Barcode scanned via camera
  const handleScanSuccess = (scannedCode: string) => {
    const clean = scannedCode.replace(/\s+/g, '');
    setBarcode(clean);
    showToast(`Code-barres scanné : ${clean}`);
  };

  // Reset form
  const handleResetForm = () => {
    setProductName('');
    setProductCode('');
    setBarcode('');
    setEditingExistingProduct(null);
    setSuggestInitialProduct(null);
    setIsSavedSuccess(false);
    setSavedSummary(null);
  };

  // Switch to complete a specific incomplete product
  const handleSelectProductToComplete = (product: Product) => {
    triggerHaptic('light');
    setEditingExistingProduct(product);
    setSuggestInitialProduct(product);
    setProductName(product.name || '');
    setProductCode(
      product.code && product.code !== '-' && product.code !== 'XXXX'
        ? product.code.replace(/^#\s*/, '')
        : ''
    );
    setBarcode(
      product.barcodeMarjane ||
        product.barcodeP2 ||
        product.barcodeInterne ||
        ''
    );
    setSuggestActiveView('form');
    setIsSavedSuccess(false);
  };

  // Dispatch "I Need" to WhatsApp
  const handleSendINeed = () => {
    triggerHaptic('success');
    const waUrl = buildINeedWhatsAppUrl(iNeedMode, productCode, productName);
    openWhatsApp(waUrl);

    setSavedSummary({
      title: "Demande I Need envoyée via WhatsApp !",
      detail1: `Mode : ${iNeedMode === 'screen' ? 'Capture (Screen)' : 'Texte'}`,
      detail2: `Nom : ${productName.trim() || 'Non spécifié'}`,
      detail3: `Code : ${productCode.trim() || 'Non spécifié'}`,
      whatsappUrl: waUrl,
    });
    setIsSavedSuccess(true);
    showToast(`Redirection vers WhatsApp (${WHATSAPP_DISPLAY_NUMBER})...`);
  };

  // Dispatch "Aidez-nous" (Compléter produit) strictly via WhatsApp ("KHLIHA GHIR B MSG WTSP")
  const handleSendAidezNous = async () => {
    if (!editingExistingProduct) return;

    const hasExistingCode = hasValidProductCode(editingExistingProduct.code);
    const cleanCode = productCode.trim().replace(/^#\s*/, '');
    const cleanBarcode = barcode.trim().replace(/\D/g, '');

    // In text mode, ensure at least one piece of info is provided
    if (aidezMode === 'text' && !hasExistingCode && !cleanCode && !cleanBarcode) {
      triggerHaptic('warning');
      showToast('Veuillez renseigner le code court ou le code-barres.');
      return;
    }

    triggerHaptic('success');

    // Build exact WhatsApp message specified by user
    const finalCode = hasExistingCode ? editingExistingProduct.code : (cleanCode || editingExistingProduct.code || '-');
    const waUrl = buildAidezNousWhatsAppUrl(
      aidezMode,
      editingExistingProduct.name,
      finalCode,
      cleanBarcode || editingExistingProduct.barcodeMarjane || '-'
    );

    // Also update locally if text was provided so app state stays fresh
    if (cleanCode || cleanBarcode) {
      try {
        const updated: Product = {
          ...editingExistingProduct,
          code: finalCode,
          barcodeMarjane: cleanBarcode || editingExistingProduct.barcodeMarjane,
        };
        await updateProduct(updated);
      } catch {
        // Continue to WhatsApp anyway
      }
    }

    openWhatsApp(waUrl);

    setSavedSummary({
      title: "Message WhatsApp prêt à être envoyé !",
      detail1: `Produit : ${editingExistingProduct.name}`,
      detail2: `Code court : ${finalCode}`,
      detail3: `Code-barres : ${cleanBarcode || editingExistingProduct.barcodeMarjane || 'Capture jointe'}`,
      whatsappUrl: waUrl,
    });
    setIsSavedSuccess(true);
    showToast(`Redirection vers WhatsApp (${WHATSAPP_DISPLAY_NUMBER})...`);
  };

  return (
    <div className="w-full flex-1 flex flex-col max-w-[850px] mx-auto py-2 sm:py-4 px-2 sm:px-3 pb-safe min-h-[calc(100dvh-70px)]">
      {/* Top Header */}
      <div className="flex items-center justify-between gap-2 mb-3 w-full">
        <button
          type="button"
          onClick={() => {
            triggerHaptic('light');
            if (editingExistingProduct) {
              setEditingExistingProduct(null);
              setSuggestActiveView('missing');
            } else if (suggestActiveView === 'form' || suggestActiveView === 'missing') {
              handleResetForm();
              setSuggestActiveView('hub');
            } else {
              onBack();
            }
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-[12px] text-[#0759A4] dark:text-blue-400 bg-white dark:bg-slate-800 border border-[#E0E0E6]/80 dark:border-slate-700 shadow-2xs hover:bg-[#EBF4FC] dark:hover:bg-slate-700 active:scale-95 transition font-bold text-xs sm:text-sm cursor-pointer select-none"
        >
          <ArrowLeft className="w-4 h-4 text-[#0759A4] dark:text-blue-400" />
          <span>
            {suggestActiveView === 'hub'
              ? 'Accueil'
              : editingExistingProduct
              ? 'Liste'
              : 'Retour'}
          </span>
        </button>

        <div className="text-center flex-1 min-w-0 px-1">
          <h1 className="font-extrabold text-[#171717] dark:text-slate-100 text-sm sm:text-base truncate flex items-center justify-center gap-1.5">
            {suggestActiveView === 'hub' ? (
              <>
                <HeartHandshake className="w-4 h-4 text-[#0759A4] dark:text-blue-400" />
                <span>Aidez-nous</span>
              </>
            ) : suggestActiveView === 'form' ? (
              editingExistingProduct ? (
                <>
                  <HeartHandshake className="w-4 h-4 text-[#B43167]" />
                  <span>Compléter le produit (WhatsApp)</span>
                </>
              ) : (
                <>
                  <WhatsAppIcon className="w-4 h-4 text-[#25D366]" />
                  <span>I Need (WhatsApp {WHATSAPP_DISPLAY_NUMBER})</span>
                </>
              )
            ) : (
              <>
                <HeartHandshake className="w-4 h-4 text-[#B43167]" />
                <span>Compléter les produits</span>
              </>
            )}
          </h1>
          <p className="text-[10.5px] text-gray-500 dark:text-slate-400 truncate">
            {suggestActiveView === 'hub'
              ? `Support WhatsApp direct au ${WHATSAPP_DISPLAY_NUMBER}`
              : suggestActiveView === 'form'
              ? `Envoi direct sur WhatsApp au ${WHATSAPP_DISPLAY_NUMBER}`
              : incompleteFilter === 'WITH_CODE_NO_BARCODE'
              ? `${withCodeNoBarcodeProducts.length} articles avec code sans code-barres`
              : `${incompleteProducts.length} articles sans code ou code-barres`}
          </p>
        </div>

        {/* Right side spacer to keep center title balanced */}
        <div className="w-[72px]" />
      </div>

      {/* Main Content: HUB (3 Options: I Need, Avec code sans code-barres, Tous à compléter) OR Form OR Missing Products */}
      {suggestActiveView === 'hub' ? (
        /* Hub View: 3 fluid Carreaux */
        <div className="flex-1 flex flex-col justify-center items-center my-auto py-4 sm:py-6 w-full">
          <p className="text-xs text-gray-500 dark:text-slate-400 font-medium mb-5 text-center px-4">
            Sélectionnez une option pour enrichir le catalogue des codes et codes-barres :
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4 w-full max-w-[620px] justify-items-stretch items-stretch px-2">
            {/* Carreau 1: I Need (Direct WhatsApp Screen or Text workflow) */}
            <button
              type="button"
              onClick={() => {
                triggerHaptic('light');
                handleResetForm();
                setSuggestActiveView('form');
              }}
              className="w-full bg-[#155B48] rounded-[22px] p-3.5 sm:p-4 flex flex-col items-center justify-between text-center shadow-[0_4px_14px_rgba(21,91,72,0.22)] hover:scale-[1.02] active:scale-95 transition-all cursor-pointer select-none border border-emerald-400/30 relative overflow-hidden group min-h-[160px]"
            >
              <div className="w-[56px] h-[56px] sm:w-[66px] sm:h-[66px] rounded-2xl bg-white/15 flex items-center justify-center shrink-0 mb-1.5 group-hover:scale-105 transition-transform">
                <WhatsAppIcon className="w-8 h-8 sm:w-9 sm:h-9 text-white fill-current" />
              </div>
              <div>
                <span className="text-xs sm:text-sm font-black text-[#FFFFFF] leading-snug line-clamp-1 block">
                  I Need
                </span>
                <span className="text-[10px] text-emerald-100 font-medium block">
                  Demande WhatsApp
                </span>
              </div>
              <div className="flex items-center gap-1 text-[11px] font-bold text-emerald-200 mt-1 group-hover:translate-x-0.5 transition-transform">
                <span>WhatsApp</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </div>
            </button>

            {/* Carreau 2: Tous les produits à compléter */}
            <button
              type="button"
              onClick={() => {
                triggerHaptic('light');
                setIncompleteFilter('ALL');
                setSuggestActiveView('missing');
              }}
              className="w-full bg-[#B43167] rounded-[22px] p-3.5 sm:p-4 flex flex-col items-center justify-between text-center shadow-[0_4px_14px_rgba(180,49,103,0.22)] hover:scale-[1.02] active:scale-95 transition-all cursor-pointer select-none border border-rose-300/30 relative overflow-hidden group min-h-[160px]"
            >
              <div className="w-[56px] h-[56px] sm:w-[66px] sm:h-[66px] rounded-2xl bg-white/15 flex items-center justify-center shrink-0 mb-1.5 group-hover:scale-105 transition-transform relative">
                <HeartHandshake className="w-8 h-8 sm:w-9 sm:h-9 text-white stroke-[2.2]" />
              </div>
              <div>
                <span className="text-xs sm:text-sm font-black text-[#FFFFFF] leading-snug line-clamp-1 block">
                  Tous à compléter
                </span>
                <span className="text-[10px] text-rose-100 font-medium block">
                  Sans code ou code-barres
                </span>
              </div>
              <div className="flex items-center gap-1 text-[11px] font-bold text-rose-200 mt-1 group-hover:translate-x-0.5 transition-transform">
                <span>{incompleteProducts.length} articles</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </div>
            </button>

            {/* Carreau 3: Avec Code mais Sans Code-barres (DEMANDE UTILISATEUR: "ZID BLASA F AIDEZ NOUS FIHA LES PRODUIT LI FIHOM LES CODES MAIS BLA CODE BARRES") */}
            <button
              type="button"
              onClick={() => {
                triggerHaptic('light');
                setIncompleteFilter('WITH_CODE_NO_BARCODE');
                setSuggestActiveView('missing');
              }}
              className="col-span-2 sm:col-span-1 w-full bg-gradient-to-br from-[#D97706] to-[#EA580C] rounded-[22px] p-3.5 sm:p-4 flex flex-row sm:flex-col items-center justify-between text-left sm:text-center shadow-[0_4px_14px_rgba(217,119,6,0.25)] hover:scale-[1.02] active:scale-95 transition-all cursor-pointer select-none border border-amber-300/30 relative overflow-hidden group min-h-[84px] sm:min-h-[160px]"
            >
              <div className="flex sm:flex-col items-center gap-3 sm:gap-2">
                <div className="w-[50px] h-[50px] sm:w-[66px] sm:h-[66px] rounded-2xl bg-white/15 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform relative">
                  <Barcode className="w-7 h-7 sm:w-9 sm:h-9 text-white stroke-[2.2]" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5 sm:justify-center">
                    <span className="text-xs sm:text-sm font-black text-[#FFFFFF] leading-snug">
                      Avec code, sans code-barres
                    </span>
                    <span className="px-1.5 py-0.2 rounded-full bg-black/25 text-white text-[9px] font-black sm:hidden">
                      {withCodeNoBarcodeProducts.length}
                    </span>
                  </div>
                  <span className="text-[10px] text-amber-100 font-medium block">
                    فيهم الكود وبلا كودبار • Compléter
                  </span>
                </div>
              </div>
              <div className="hidden sm:flex items-center gap-1 text-[11px] font-bold text-amber-100 mt-1 group-hover:translate-x-0.5 transition-transform">
                <span>{withCodeNoBarcodeProducts.length} articles</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </div>
              <ChevronRight className="w-5 h-5 text-amber-200 sm:hidden shrink-0" />
            </button>
          </div>
        </div>
      ) : suggestActiveView === 'form' ? (
        <div className="w-full max-w-[560px] mx-auto space-y-3">
          {/* Active Edit Notice Banner */}
          {editingExistingProduct && !isSavedSuccess && (
            <div className="bg-[#EFF6FF] dark:bg-blue-950/40 border border-[#BFDBFE] dark:border-blue-800 rounded-[14px] p-2.5 sm:p-3 flex items-center justify-between gap-2 shadow-2xs">
              <div className="flex items-center gap-2 min-w-0">
                <HeartHandshake className="w-4 h-4 text-[#0759A4] dark:text-blue-400 shrink-0" />
                <p className="text-xs text-[#1E40AF] dark:text-blue-300 font-bold truncate">
                  Aidez-nous : <span className="underline">{editingExistingProduct.name}</span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSuggestActiveView('missing')}
                className="text-[11px] font-bold text-[#0759A4] dark:text-blue-400 hover:underline shrink-0 cursor-pointer"
              >
                ← Liste Aidez-nous
              </button>
            </div>
          )}

          {isSavedSuccess && savedSummary ? (
            /* Saved Success Screen */
            <div className="bg-white dark:bg-slate-900 border-2 border-emerald-500/30 dark:border-emerald-500/40 rounded-[20px] p-5 text-center shadow-sm space-y-3 animate-in zoom-in-95 duration-200">
              <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-950/70 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6 stroke-[2.5]" />
              </div>
              <div>
                <h3 className="text-sm font-black text-gray-900 dark:text-white">
                  {savedSummary.title}
                </h3>
                <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
                  Numéro destinataire : <span className="font-bold text-[#155B48] dark:text-emerald-400">{WHATSAPP_DISPLAY_NUMBER}</span>
                </p>
              </div>

              {/* Summary Card */}
              <div className="bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-[14px] p-3 text-left space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-400 font-medium">Info 1 :</span>
                  <span className="font-bold text-gray-800 dark:text-slate-200">{savedSummary.detail1}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400 font-medium">Info 2 :</span>
                  <span className="font-mono font-bold text-[#0759A4] dark:text-blue-400">{savedSummary.detail2}</span>
                </div>
                {savedSummary.detail3 && (
                  <div className="flex justify-between">
                    <span className="text-gray-400 font-medium">Info 3 :</span>
                    <span className="font-mono font-bold text-emerald-700 dark:text-emerald-400">{savedSummary.detail3}</span>
                  </div>
                )}
              </div>

              {/* Direct WhatsApp Action Button */}
              {savedSummary.whatsappUrl && (
                <a
                  href={savedSummary.whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full h-[48px] rounded-[14px] bg-[#25D366] hover:bg-[#20ba59] active:scale-[0.98] text-white font-black text-xs sm:text-sm shadow-md shadow-emerald-600/25 flex items-center justify-center gap-2 transition select-none cursor-pointer"
                >
                  <WhatsAppIcon className="w-5 h-5 fill-current" />
                  <span>Ouvrir WhatsApp ({WHATSAPP_DISPLAY_NUMBER})</span>
                </a>
              )}

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleResetForm}
                  className="flex-1 py-2.5 px-3 rounded-[12px] bg-[#155B48] text-white font-bold text-xs shadow-xs hover:bg-[#104838] active:scale-95 transition cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{editingExistingProduct ? 'Modifier un autre' : 'Nouvelle demande'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handleResetForm();
                    if (editingExistingProduct) {
                      setSuggestActiveView('missing');
                    } else {
                      setSuggestActiveView('hub');
                    }
                  }}
                  className="flex-1 py-2.5 px-3 rounded-[12px] bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-200 font-bold text-xs transition cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>{editingExistingProduct ? 'Retour à la liste' : 'Retour au menu'}</span>
                </button>
              </div>
            </div>
          ) : editingExistingProduct ? (
            /* ============================================================ */
            /* CASE 1: AIDEZ-NOUS (COMPLÉTER UN PRODUIT VIA WHATSAPP)       */
            /* Prompt: "O HTA FACH IBGHI Y3AWN F LES PRODUIT KHLIHA GHIR   */
            /* B MSG WTSP, SWA SCREEN SWA TEXT :                            */
            /* BONJOUR VOILA CE PRODUIT                                     */
            /* SWA YSIFTO SCREEN SWA CODE / NOME DE PRODUIT DEPUIS L'APP /  */
            /* CODEBARRE"                                                   */
            /* ============================================================ */
            <div className="bg-white dark:bg-slate-900 rounded-[20px] border border-gray-200/80 dark:border-slate-800 p-3.5 sm:p-5 shadow-2xs space-y-4">
              {/* Product Identity Box */}
              <div className="flex items-center gap-3 bg-gray-50 dark:bg-slate-800/80 rounded-[14px] p-3 border border-gray-200/80 dark:border-slate-700">
                <div className="w-14 h-14 rounded-[10px] bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 flex items-center justify-center overflow-hidden shrink-0">
                  {editingExistingProduct.imageUrl ? (
                    <img
                      src={editingExistingProduct.imageUrl}
                      alt={editingExistingProduct.name}
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <ShoppingBag className="w-7 h-7 text-gray-400 opacity-50" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                    <Lock className="w-3 h-3 text-gray-400 shrink-0" />
                    <span>NOM DE PRODUIT DEPUIS L'APP</span>
                  </div>
                  <h3 className="text-sm sm:text-base font-black text-gray-900 dark:text-white truncate">
                    {editingExistingProduct.name}
                  </h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] px-2 py-0.5 rounded-[5px] bg-[#0759A4] text-white font-mono font-bold">
                      {formatProductCodeBadge(editingExistingProduct.code)}
                    </span>
                    <span className="text-[10px] text-gray-500 dark:text-slate-400 truncate">
                      {DEPARTMENT_CONFIGS[editingExistingProduct.department]?.shortName || editingExistingProduct.department}
                    </span>
                  </div>
                </div>
              </div>

              {/* Mode Selector: Screen vs Text */}
              <div className="space-y-1.5">
                <label className="block text-xs font-black text-gray-800 dark:text-slate-200">
                  Comment voulez-vous nous aider ? (Choisissez le mode)
                </label>
                <div className="grid grid-cols-2 p-1 bg-gray-100 dark:bg-slate-800 rounded-[14px] border border-gray-200/80 dark:border-slate-700 gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic('light');
                      setAidezMode('screen');
                    }}
                    className={`flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-[11px] text-xs font-black transition cursor-pointer select-none ${
                      aidezMode === 'screen'
                        ? 'bg-[#155B48] text-white shadow-xs'
                        : 'text-gray-600 dark:text-slate-300 hover:text-gray-900 dark:hover:text-white'
                    }`}
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>1. Par Capture (Screen)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic('light');
                      setAidezMode('text');
                    }}
                    className={`flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-[11px] text-xs font-black transition cursor-pointer select-none ${
                      aidezMode === 'text'
                        ? 'bg-[#0759A4] text-white shadow-xs'
                        : 'text-gray-600 dark:text-slate-300 hover:text-gray-900 dark:hover:text-white'
                    }`}
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>2. Par Texte (Code/Barre)</span>
                  </button>
                </div>
              </div>

              {/* MODE 1: SCREEN WORKFLOW */}
              {aidezMode === 'screen' ? (
                <div className="space-y-3">
                  <div className="bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 rounded-[16px] p-3.5 space-y-2.5">
                    <div className="flex items-start gap-2.5">
                      <div className="w-6 h-6 rounded-full bg-[#155B48] text-white flex items-center justify-center font-black text-xs shrink-0">
                        1
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-xs font-black text-gray-900 dark:text-white">
                          Prenez une photo ou capture
                        </h4>
                        <p className="text-[11px] text-gray-600 dark:text-slate-300 mt-0.5">
                          Photographiez l'étiquette prix, le code court ou le code-barres en rayon pour cet article.
                        </p>
                      </div>
                    </div>

                    <div className="border-t border-emerald-200/60 dark:border-emerald-800/40" />

                    <div className="flex items-start gap-2.5">
                      <div className="w-6 h-6 rounded-full bg-[#25D366] text-white flex items-center justify-center font-black text-xs shrink-0">
                        2
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-xs font-black text-gray-900 dark:text-white">
                          Envoyez sur WhatsApp ({WHATSAPP_DISPLAY_NUMBER})
                        </h4>
                        <p className="text-[11px] text-gray-600 dark:text-slate-300 mt-0.5">
                          Le message sera pré-rempli avec le nom exact du produit depuis l'appli.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Message Preview */}
                  <div className="bg-gray-50 dark:bg-slate-800/60 rounded-[12px] p-2.5 border border-gray-200 dark:border-slate-700 text-left">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">
                      Aperçu du message WhatsApp généré :
                    </span>
                    <pre className="text-[11px] font-mono text-gray-700 dark:text-slate-200 whitespace-pre-wrap leading-relaxed">
{`BONJOUR VOILA CE PRODUIT (Capture d'écran ci-jointe) :
NOM DE PRODUIT DEPUIS L'APP : ${editingExistingProduct.name}`}
                    </pre>
                  </div>

                  {/* Submit Button */}
                  <button
                    type="button"
                    onClick={handleSendAidezNous}
                    className="w-full h-[50px] rounded-[14px] bg-[#25D366] hover:bg-[#20ba59] active:scale-[0.98] text-white font-black text-xs sm:text-sm shadow-md shadow-emerald-600/25 flex items-center justify-center gap-2 transition cursor-pointer select-none"
                  >
                    <WhatsAppIcon className="w-5 h-5 fill-current" />
                    <span>Envoyer la capture sur WhatsApp ({WHATSAPP_DISPLAY_NUMBER})</span>
                  </button>
                </div>
              ) : (
                /* MODE 2: TEXT WORKFLOW */
                <div className="space-y-3">
                  {/* Code input */}
                  <div>
                    <label className="block text-xs font-black text-gray-800 dark:text-slate-200 mb-1">
                      CODE {hasValidProductCode(editingExistingProduct.code) ? '(Déjà présent)' : '(Manquant)'}
                    </label>
                    <input
                      type="text"
                      value={productCode}
                      onChange={(e) => setProductCode(e.target.value)}
                      placeholder="ex: 6037"
                      className="w-full h-[42px] px-3 rounded-[12px] border border-gray-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white focus:border-[#0759A4] outline-none text-xs font-mono font-bold placeholder:text-gray-400"
                    />
                  </div>

                  {/* Barcode input with Scanner & Manual options */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-black text-gray-800 dark:text-slate-200">
                      CODEBARRE
                    </label>

                    {/* Camera Scanner Button */}
                    <button
                      type="button"
                      onClick={() => {
                        triggerHaptic('light');
                        setIsScannerOpen(true);
                      }}
                      className="w-full h-[42px] rounded-[12px] bg-[#0759A4] hover:bg-[#064a88] active:scale-[0.98] text-white flex items-center justify-center gap-2 font-bold text-xs shadow-2xs transition cursor-pointer select-none"
                    >
                      <Camera className="w-4 h-4 text-white" />
                      <span>Scanner avec la caméra</span>
                    </button>

                    {/* Manual input */}
                    <div className="relative">
                      <Barcode className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        inputMode="numeric"
                        value={barcode}
                        onChange={(e) => setBarcode(e.target.value.replace(/\D/g, ''))}
                        placeholder="Ou saisir les chiffres du code-barres..."
                        className="w-full h-[42px] pl-9 pr-3 rounded-[12px] border border-gray-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white focus:border-[#0759A4] outline-none text-xs font-mono font-bold placeholder:text-gray-400"
                      />
                    </div>
                  </div>

                  {/* Message Preview */}
                  <div className="bg-gray-50 dark:bg-slate-800/60 rounded-[12px] p-2.5 border border-gray-200 dark:border-slate-700 text-left">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">
                      Aperçu du message WhatsApp généré :
                    </span>
                    <pre className="text-[11px] font-mono text-gray-700 dark:text-slate-200 whitespace-pre-wrap leading-relaxed">
{`BONJOUR VOILA CE PRODUIT :
CODE : ${productCode.trim() || '-'}
NOM DE PRODUIT DEPUIS L'APP : ${editingExistingProduct.name}
CODEBARRE : ${barcode.trim() || '-'}`}
                    </pre>
                  </div>

                  {/* Submit Button */}
                  <button
                    type="button"
                    onClick={handleSendAidezNous}
                    className="w-full h-[50px] rounded-[14px] bg-[#25D366] hover:bg-[#20ba59] active:scale-[0.98] text-white font-black text-xs sm:text-sm shadow-md shadow-emerald-600/25 flex items-center justify-center gap-2 transition cursor-pointer select-none"
                  >
                    <WhatsAppIcon className="w-5 h-5 fill-current" />
                    <span>Envoyer par WhatsApp ({WHATSAPP_DISPLAY_NUMBER})</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            /* ============================================================ */
            /* CASE 2: I NEED (PICKER DEMANDE WHATSAPP DIRECTE)            */
            /* Prompt: "KHLI L UTILISATEUR YKHTAR WACH BSCREEN OLA TEXT     */
            /* TAYKHTAR TEXT KHAS YTSAYB TEXT HAKDA                         */
            /* BONJOUR J'AI BESOIN DE CE CODE SVP                           */
            /* SWA YSIFT M3AH SCREEN SWA CODE NOM DE PRODUIT"               */
            /* ============================================================ */
            <div className="bg-white dark:bg-slate-900 rounded-[22px] border border-gray-200/90 dark:border-slate-800 p-4 sm:p-6 shadow-sm space-y-4 transition-colors">
              {/* Header Badge */}
              <div className="text-center space-y-1">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-[#155B48] dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-xs font-black">
                  <WhatsAppIcon className="w-3.5 h-3.5 fill-current" />
                  <span>I Need • Support Pickeur Direct</span>
                </div>
                <h2 className="text-lg sm:text-xl font-black text-gray-900 dark:text-white">
                  Besoin d'un code pour un article ?
                </h2>
                <p className="text-xs text-gray-500 dark:text-slate-400 max-w-sm mx-auto">
                  Choisissez comment vous souhaitez transmettre la demande au <span className="font-bold text-[#155B48] dark:text-emerald-400">{WHATSAPP_DISPLAY_NUMBER}</span> :
                </p>
              </div>

              {/* Mode Toggle: Screen vs Text */}
              <div className="grid grid-cols-2 p-1 bg-gray-100 dark:bg-slate-800 rounded-[14px] border border-gray-200/80 dark:border-slate-700 gap-1">
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic('light');
                    setINeedMode('screen');
                  }}
                  className={`flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-[11px] text-xs font-black transition cursor-pointer select-none ${
                    iNeedMode === 'screen'
                      ? 'bg-[#155B48] text-white shadow-xs'
                      : 'text-gray-600 dark:text-slate-300 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>1. Par Capture (Screen)</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic('light');
                    setINeedMode('text');
                  }}
                  className={`flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-[11px] text-xs font-black transition cursor-pointer select-none ${
                    iNeedMode === 'text'
                      ? 'bg-[#0759A4] text-white shadow-xs'
                      : 'text-gray-600 dark:text-slate-300 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>2. Par Texte (Message)</span>
                </button>
              </div>

              {/* I NEED: SCREEN WORKFLOW */}
              {iNeedMode === 'screen' ? (
                <div className="space-y-3">
                  <div className="bg-gradient-to-br from-emerald-50/70 to-blue-50/60 dark:from-emerald-950/30 dark:to-slate-800/60 border border-emerald-200/80 dark:border-emerald-800/60 rounded-[18px] p-3.5 sm:p-4 space-y-3">
                    {/* Step 1 */}
                    <div className="flex items-start gap-3">
                      <div className="w-7 h-7 rounded-full bg-[#155B48] text-white flex items-center justify-center font-black text-xs shrink-0 shadow-2xs">
                        1
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-xs sm:text-sm font-black text-gray-900 dark:text-white">
                          Screen product page
                        </h4>
                        <p className="text-[11px] text-gray-600 dark:text-slate-300 mt-0.5 leading-snug">
                          Prenez une capture d'écran (screenshot) de la fiche du produit sur votre application de préparation ou du rayon.
                        </p>
                      </div>
                    </div>

                    <div className="w-full border-t border-emerald-200/60 dark:border-slate-700/80" />

                    {/* Step 2 */}
                    <div className="flex items-start gap-3">
                      <div className="w-7 h-7 rounded-full bg-[#25D366] text-white flex items-center justify-center font-black text-xs shrink-0 shadow-2xs">
                        2
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-xs sm:text-sm font-black text-gray-900 dark:text-white">
                          Envoyee sure whatsapp
                        </h4>
                        <p className="text-[11px] text-gray-600 dark:text-slate-300 mt-0.5 leading-snug">
                          Cliquez sur le bouton vert pour ouvrir WhatsApp au <span className="font-bold text-[#155B48] dark:text-emerald-400">{WHATSAPP_DISPLAY_NUMBER}</span> et envoyer votre capture.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Optional info */}
                  <div className="p-3 bg-gray-50 dark:bg-slate-800/70 rounded-[14px] border border-gray-200/70 dark:border-slate-700 space-y-2">
                    <span className="block text-[11px] font-bold text-gray-500 dark:text-slate-400">
                      Optionnel : Préciser le nom ou code si vous le souhaitez
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <input
                        type="text"
                        value={productName}
                        onChange={(e) => setProductName(e.target.value)}
                        placeholder="NOM DE PRODUIT (optionnel)..."
                        className="w-full h-[40px] px-3 rounded-[10px] border border-gray-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white text-xs font-bold outline-none focus:border-[#0759A4]"
                      />
                      <input
                        type="text"
                        value={productCode}
                        onChange={(e) => setProductCode(e.target.value)}
                        placeholder="CODE (optionnel)..."
                        className="w-full h-[40px] px-3 rounded-[10px] border border-gray-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white text-xs font-mono font-bold outline-none focus:border-[#0759A4]"
                      />
                    </div>
                  </div>

                  {/* Message Preview */}
                  <div className="bg-gray-50 dark:bg-slate-800/60 rounded-[12px] p-2.5 border border-gray-200 dark:border-slate-700 text-left">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">
                      Aperçu du message WhatsApp généré :
                    </span>
                    <pre className="text-[11px] font-mono text-gray-700 dark:text-slate-200 whitespace-pre-wrap leading-relaxed">
{productCode.trim() || productName.trim()
  ? `BONJOUR J'AI BESOIN DE CE CODE SVP (Capture d'écran ci-jointe) :
CODE : ${productCode.trim() || '-'}
NOM DE PRODUIT : ${productName.trim() || '-'}`
  : `BONJOUR J'AI BESOIN DE CE CODE SVP (Capture d'écran ci-jointe)`}
                    </pre>
                  </div>

                  {/* Submit Button */}
                  <button
                    type="button"
                    onClick={handleSendINeed}
                    className="w-full h-[52px] rounded-[16px] bg-[#25D366] hover:bg-[#20ba59] active:scale-[0.98] text-white font-black text-xs sm:text-sm shadow-md shadow-emerald-600/25 flex items-center justify-center gap-2.5 transition select-none cursor-pointer"
                  >
                    <WhatsAppIcon className="w-5 h-5 fill-current" />
                    <span>Envoyee sure whatsapp ({WHATSAPP_DISPLAY_NUMBER})</span>
                  </button>
                </div>
              ) : (
                /* I NEED: TEXT WORKFLOW */
                <div className="space-y-3">
                  <div className="space-y-2.5">
                    <div>
                      <label className="block text-xs font-black text-gray-800 dark:text-slate-200 mb-1">
                        NOM DE PRODUIT
                      </label>
                      <input
                        type="text"
                        value={productName}
                        onChange={(e) => setProductName(e.target.value)}
                        placeholder="ex: Pain complet, Tomate ronde..."
                        className="w-full h-[42px] px-3 rounded-[12px] border border-gray-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white focus:border-[#0759A4] outline-none text-xs font-bold placeholder:text-gray-400"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-black text-gray-800 dark:text-slate-200 mb-1">
                        CODE
                      </label>
                      <input
                        type="text"
                        value={productCode}
                        onChange={(e) => setProductCode(e.target.value)}
                        placeholder="ex: 6037 (ou ? si inconnu)"
                        className="w-full h-[42px] px-3 rounded-[12px] border border-gray-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white focus:border-[#0759A4] outline-none text-xs font-mono font-bold placeholder:text-gray-400"
                      />
                    </div>
                  </div>

                  {/* Message Preview */}
                  <div className="bg-gray-50 dark:bg-slate-800/60 rounded-[12px] p-2.5 border border-gray-200 dark:border-slate-700 text-left">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">
                      Aperçu du message WhatsApp généré :
                    </span>
                    <pre className="text-[11px] font-mono text-gray-700 dark:text-slate-200 whitespace-pre-wrap leading-relaxed">
{`BONJOUR J'AI BESOIN DE CE CODE SVP :
CODE : ${productCode.trim() || '-'}
NOM DE PRODUIT : ${productName.trim() || '-'}`}
                    </pre>
                  </div>

                  {/* Submit Button */}
                  <button
                    type="button"
                    onClick={handleSendINeed}
                    className="w-full h-[52px] rounded-[16px] bg-[#25D366] hover:bg-[#20ba59] active:scale-[0.98] text-white font-black text-xs sm:text-sm shadow-md shadow-emerald-600/25 flex items-center justify-center gap-2.5 transition select-none cursor-pointer"
                  >
                    <WhatsAppIcon className="w-5 h-5 fill-current" />
                    <span>Envoyer la demande sur WhatsApp ({WHATSAPP_DISPLAY_NUMBER})</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        /* VIEW 2: Produits sans code ou sans code-barres ("kibano fiha ghir les produit bla code ola bla codebarre") */
        <div className="w-full flex-1 flex flex-col space-y-2.5">
          {/* Header of Missing Products View */}
          <div className="bg-white dark:bg-slate-900 rounded-[16px] border border-gray-200/80 dark:border-slate-800 p-3 shadow-2xs space-y-2">
            <div className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                incompleteFilter === 'WITH_CODE_NO_BARCODE'
                  ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400'
                  : 'bg-rose-50 dark:bg-rose-950/60 text-[#B43167]'
              }`}>
                {incompleteFilter === 'WITH_CODE_NO_BARCODE' ? (
                  <Barcode className="w-4 h-4 stroke-[2.5]" />
                ) : (
                  <HeartHandshake className="w-4 h-4 stroke-[2.5]" />
                )}
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="text-xs sm:text-sm font-black text-gray-900 dark:text-white leading-tight">
                    {incompleteFilter === 'WITH_CODE_NO_BARCODE'
                      ? 'Avec code & sans code-barres'
                      : 'Compléter les produits'}
                  </h3>
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                    incompleteFilter === 'WITH_CODE_NO_BARCODE'
                      ? 'bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300'
                      : 'bg-rose-100 dark:bg-rose-900/60 text-[#B43167] dark:text-rose-300'
                  }`}>
                    {incompleteFilter === 'WITH_CODE_NO_BARCODE'
                      ? withCodeNoBarcodeProducts.length
                      : incompleteProducts.length}
                  </span>
                </div>
                <p className="text-[10px] text-gray-500 dark:text-slate-400">
                  {incompleteFilter === 'WITH_CODE_NO_BARCODE'
                    ? `فيهم الكود وبلا كودبار • ${withCodeNoBarcodeProducts.length} articles avec code à compléter via WhatsApp`
                    : `Tous les articles nécessitant un code ou un code-barres via WhatsApp (${WHATSAPP_DISPLAY_NUMBER})`}
                </p>
              </div>
            </div>

            {/* In-view Search Bar */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={incompleteSearchQuery}
                onChange={(e) => setIncompleteSearchQuery(e.target.value)}
                placeholder="Rechercher dans les produits à compléter..."
                className="w-full h-[36px] pl-8 pr-3 rounded-[10px] bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-xs font-medium outline-none focus:border-[#0759A4] dark:text-white focus:bg-white dark:focus:bg-slate-800"
              />
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-1">
              <button
                type="button"
                onClick={() => {
                  triggerHaptic('light');
                  setIncompleteFilter('ALL');
                }}
                className={`px-2.5 py-1 rounded-full text-[10.5px] font-bold transition cursor-pointer shrink-0 ${
                  incompleteFilter === 'ALL'
                    ? 'bg-[#171717] dark:bg-blue-600 text-white shadow-xs'
                    : 'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-700'
                }`}
              >
                Tous ({incompleteProducts.length})
              </button>

              {/* Dedicated filter: Avec code sans code-barres */}
              <button
                type="button"
                onClick={() => {
                  triggerHaptic('light');
                  setIncompleteFilter('WITH_CODE_NO_BARCODE');
                }}
                className={`px-2.5 py-1 rounded-full text-[10.5px] font-bold transition cursor-pointer shrink-0 flex items-center gap-1 ${
                  incompleteFilter === 'WITH_CODE_NO_BARCODE'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/60 border border-amber-300 dark:border-amber-800'
                }`}
              >
                <Barcode className="w-3 h-3 text-current" />
                <span>Avec code sans code-barres ({withCodeNoBarcodeProducts.length})</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  triggerHaptic('light');
                  setIncompleteFilter('NO_CODE');
                }}
                className={`px-2.5 py-1 rounded-full text-[10.5px] font-bold transition cursor-pointer shrink-0 ${
                  incompleteFilter === 'NO_CODE'
                    ? 'bg-amber-500 text-white'
                    : 'bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/60'
                }`}
              >
                Sans code ({incompleteProducts.filter(isProductMissingCode).length})
              </button>
              <button
                type="button"
                onClick={() => {
                  triggerHaptic('light');
                  setIncompleteFilter('NO_BARCODE');
                }}
                className={`px-2.5 py-1 rounded-full text-[10.5px] font-bold transition cursor-pointer shrink-0 ${
                  incompleteFilter === 'NO_BARCODE'
                    ? 'bg-rose-500 text-white'
                    : 'bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-900/60'
                }`}
              >
                Sans code-barres ({incompleteProducts.filter(isProductMissingBarcode).length})
              </button>
            </div>
          </div>

          {/* Products Grid: Category colored cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 sm:gap-2.5 pb-6">
            {filteredIncompleteProducts.length > 0 ? (
              filteredIncompleteProducts.map((p) => {
                const missingCode = isProductMissingCode(p);
                const missingBarcode = isProductMissingBarcode(p);
                const codeBadge = formatProductCodeBadge(p.code);
                const conf = DEPARTMENT_CONFIGS[p.department] || DEPARTMENT_CONFIGS['Fruits et légumes'];
                const primaryBarcode = p.barcodeMarjane || p.barcodeP2 || p.barcodeInterne;

                return (
                  <div
                    key={p.id}
                    onClick={() => handleSelectProductToComplete(p)}
                    className="rounded-[14px] sm:rounded-[16px] p-2 sm:p-2.5 flex flex-col justify-between shadow-2xs hover:shadow-md active:scale-[0.98] transition-all cursor-pointer select-none border border-black/5 relative group"
                    style={{ backgroundColor: conf.accentColor }}
                  >
                    {/* 1. White Image Thumbnail Box */}
                    <div className="relative w-full aspect-square rounded-[12px] bg-white border border-black/5 flex items-center justify-center overflow-hidden mb-1.5 p-1.5 shadow-2xs">
                      {p.imageUrl ? (
                        <img
                          src={p.imageUrl}
                          alt={p.name}
                          loading="lazy"
                          decoding="async"
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-contain"
                        />
                      ) : (
                        <ShoppingBag className="w-8 h-8 opacity-40 text-gray-400" />
                      )}

                      {/* Missing Pill Overlay */}
                      <div className="absolute top-1 right-1 flex flex-col gap-0.5 items-end">
                        {missingCode && (
                          <span className="px-1.5 py-0.5 rounded-[5px] bg-[#EA580C] text-white font-black text-[8px] sm:text-[9px] shadow-xs">
                            Sans code
                          </span>
                        )}
                        {missingBarcode && (
                          <span className="px-1.5 py-0.5 rounded-[5px] bg-rose-500 text-white font-black text-[8px] sm:text-[9px] shadow-xs">
                            Sans code-barres
                          </span>
                        )}
                      </div>
                    </div>

                    {/* 2. Code Badge: White Background, Category Color Text */}
                    <div className="mb-1 flex items-center gap-1">
                      <span
                        className="inline-block text-[10px] sm:text-[11px] font-mono font-black px-1.5 py-0.5 rounded-[5px] bg-white shadow-2xs tracking-wider"
                        style={{ color: conf.accentColor }}
                      >
                        {codeBadge}
                      </span>
                      <span className="text-[9px] text-white/85 font-medium truncate">
                        {conf.shortName}
                      </span>
                    </div>

                    {/* 3. Product Name: White Text */}
                    <h3
                      className="text-[13px] sm:text-[14px] md:text-[15px] font-extrabold text-white leading-snug line-clamp-2 mt-auto tracking-tight"
                      title={p.name}
                    >
                      {p.name}
                    </h3>

                    {/* 4. Barcode info & Quick Action Pill */}
                    <div className="mt-2 pt-1 border-t border-white/20 flex items-center justify-between gap-1">
                      <span className="text-[9px] text-white/80 font-mono truncate">
                        {primaryBarcode || 'Sans code-barres'}
                      </span>
                      <span className="px-1.5 py-0.5 rounded-[6px] bg-white text-gray-900 text-[9.5px] font-black shadow-2xs group-hover:scale-105 transition-transform shrink-0 flex items-center gap-0.5">
                        <WhatsAppIcon className="w-2.5 h-2.5 text-[#25D366]" />
                        <span>Aider</span>
                      </span>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="col-span-2 sm:col-span-3 md:col-span-4 bg-white dark:bg-slate-900 rounded-[16px] p-6 text-center border border-gray-100 dark:border-slate-800 shadow-2xs mt-3">
                <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-1.5" />
                <h4 className="text-xs font-bold text-gray-800 dark:text-slate-200">
                  Aucun article trouvé dans Aidez-nous
                </h4>
                <p className="text-[10px] text-gray-400 dark:text-slate-400 mt-0.5">
                  Tous les produits filtrés possèdent déjà un code et un code-barres.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Barcode Camera Scanner Modal */}
      <BarcodeScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScanSuccess={handleScanSuccess}
      />
    </div>
  );
};

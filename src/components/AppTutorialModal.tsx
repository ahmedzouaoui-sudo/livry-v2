import React, { useState } from 'react';
import {
  X,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
  ThumbsUp,
  ThumbsDown,
  Camera,
  Check,
  Lightbulb,
} from 'lucide-react';
import { triggerHaptic } from '../utils/haptics';
import { WHATSAPP_PHONE_NUMBER, WHATSAPP_DISPLAY_NUMBER, WhatsAppIcon } from './SuggestOneScreen';

export const TUTORIAL_STORAGE_KEY = 'finder_livry_picking_tuto_seen_v1';

interface AppTutorialModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenSuggest?: () => void;
  onOpenTips?: () => void;
}

export const AppTutorialModal: React.FC<AppTutorialModalProps> = ({
  isOpen,
  onClose,
  onOpenSuggest,
  onOpenTips,
}) => {
  const [currentSlide, setCurrentSlide] = useState<1 | 2 | 3>(1);

  if (!isOpen) return null;

  const handleFinishOrClose = () => {
    try {
      localStorage.setItem(TUTORIAL_STORAGE_KEY, 'true');
    } catch {
      // ignore
    }
    onClose();
  };

  const nextSlide = () => {
    triggerHaptic('light');
    if (currentSlide < 3) {
      setCurrentSlide((prev) => (prev + 1) as 1 | 2 | 3);
    } else {
      handleFinishOrClose();
    }
  };

  const prevSlide = () => {
    triggerHaptic('light');
    if (currentSlide > 1) {
      setCurrentSlide((prev) => (prev - 1) as 1 | 2 | 3);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-[540px] max-h-[92vh] bg-white dark:bg-slate-900 rounded-[24px] shadow-2xl border border-gray-200 dark:border-slate-800 flex flex-col overflow-hidden text-gray-900 dark:text-slate-100 animate-in zoom-in-95 duration-200">
        
        {/* Top Header Bar */}
        <div className="flex items-center justify-between px-4 sm:px-5 py-3 border-b border-gray-100 dark:border-slate-800 bg-gray-50/80 dark:bg-slate-800/60 shrink-0">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-[#0759A4] text-white flex items-center justify-center text-xs font-black">
              {currentSlide}
            </span>
            <div className="text-left">
              <h3 className="text-xs sm:text-sm font-black text-gray-900 dark:text-white leading-tight">
                Guide d'utilisation Pickeur (B Darija)
              </h3>
              <p className="text-[10px] text-gray-500 dark:text-slate-400">
                Marhala {currentSlide} mn 3
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              triggerHaptic('light');
              handleFinishOrClose();
            }}
            className="p-1.5 rounded-full text-gray-400 hover:text-gray-700 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-slate-700 transition cursor-pointer"
            aria-label="Sed l'guide"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-gray-100 dark:bg-slate-800 h-1.5 shrink-0">
          <div
            className="h-full bg-gradient-to-r from-[#0759A4] via-[#155B48] to-emerald-500 transition-all duration-300"
            style={{ width: `${(currentSlide / 3) * 100}%` }}
          />
        </div>

        {/* Slide Content Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {/* ========================================================= */}
          {/* SLIDE 1 : IMTA YKHADMO B'L'APP                            */}
          {/* ========================================================= */}
          {currentSlide === 1 && (
            <div className="space-y-3.5 animate-in fade-in duration-200">
              <div className="text-center space-y-1">
                <span className="inline-block px-2.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/60 text-[#0759A4] dark:text-blue-300 border border-blue-200 dark:border-blue-800 text-[11px] font-black uppercase tracking-wider">
                  Qawa3id s-sarima d l'khadma
                </span>
                <h2 className="text-base sm:text-lg font-black text-gray-900 dark:text-white leading-tight">
                  Imta khaskom tkhadmo b'had l'application ?
                </h2>
                <p className="text-xs text-gray-600 dark:text-slate-300 font-medium">
                  Khadmo b'had l'app <span className="font-black text-[#0759A4] dark:text-blue-400">GHIR o GHIR</span> f had 2 d l'halat :
                </p>
              </div>

              {/* 2 CAS AUTORISÉS EN DARIJA */}
              <div className="space-y-2">
                <div className="flex items-start gap-2.5 p-3 rounded-[14px] bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800">
                  <div className="w-6 h-6 rounded-full bg-[#155B48] text-white flex items-center justify-center text-xs font-black shrink-0 mt-0.5">
                    1
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-xs font-black text-emerald-950 dark:text-emerald-200">
                      Fach makikhrjouch les tickets mn balance (mizan) d Marjane
                    </h4>
                    <p className="text-[11px] text-emerald-800 dark:text-emerald-300/90 mt-0.5 leading-snug">
                      Rouleau bloqué ola ticket matatkhrojch mn l'mizan bach tscanniha.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-2.5 p-3 rounded-[14px] bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800">
                  <div className="w-6 h-6 rounded-full bg-[#155B48] text-white flex items-center justify-center text-xs font-black shrink-0 mt-0.5">
                    2
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-xs font-black text-emerald-950 dark:text-emerald-200">
                      Fach kikoun khaser lmizan o deja 3andk le produit f yddik
                    </h4>
                    <p className="text-[11px] text-emerald-800 dark:text-emerald-300/90 mt-0.5 leading-snug">
                      Lmizan en panne o <span className="font-bold underline">déjà haz le produit physique f yddik</span> wajed bghiti tvalideh.
                    </p>
                  </div>
                </div>
              </div>

              {/* AVERTISSEMENT STRICT ROUGE EN DARIJA */}
              <div className="flex items-start gap-2.5 p-3 rounded-[14px] bg-rose-50 dark:bg-rose-950/50 border-2 border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-200">
                <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                <div className="text-xs leading-snug space-y-0.5">
                  <strong className="block font-black text-rose-700 dark:text-rose-300 uppercase tracking-tight text-[11px]">
                    ⛔ ATTENTION STRICTE (Khatt a7mer) :
                  </strong>
                  <p className="text-[11px] font-semibold text-rose-900 dark:text-rose-200">
                    Mn ghir had 2 d l'cas, <span className="underline font-black">MATSCANNICH</span> o nta ma3ndkch l'produit f yddik li at-validéh f l'app Marjane Picking !
                  </p>
                </div>
              </div>

              {/* IMAGE TICKET BALANCE MARJANE */}
              <div className="bg-gray-50 dark:bg-slate-800/60 rounded-[16px] p-2.5 border border-gray-200 dark:border-slate-700 space-y-1.5">
                <span className="text-[10px] font-extrabold text-gray-500 dark:text-slate-400 uppercase tracking-wider block text-center">
                  Mital : Ticket d'pesée balance Marjane
                </span>
                <div className="w-full max-h-[180px] rounded-[12px] bg-white flex items-center justify-center overflow-hidden border border-gray-200 p-1">
                  <img
                    src="/assets/aistudio/image_2026-11-01_090829473_0eae3a7f.png"
                    alt="Ticket de pesée balance Marjane"
                    className="max-h-[170px] w-auto object-contain select-none"
                    loading="eager"
                  />
                </div>
                <p className="text-[10px] text-gray-500 dark:text-slate-400 text-center italic">
                  Fach had ticket makatkhrjch, 9elleb 3la l'produit fl'app bach tlqa l'code-barres.
                </p>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* SLIDE 2 : RECHERCHE & SYSTÈME LIKE / DISLIKE              */}
          {/* ========================================================= */}
          {currentSlide === 2 && (
            <div className="space-y-3.5 animate-in fade-in duration-200">
              <div className="text-center space-y-1">
                <span className="inline-block px-2.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/60 text-[#0759A4] dark:text-blue-300 border border-blue-200 dark:border-blue-800 text-[11px] font-black uppercase tracking-wider">
                  Qlab o Vote (Like / Dislike)
                </span>
                <h2 className="text-base sm:text-lg font-black text-gray-900 dark:text-white leading-tight">
                  Kifach tqellbo o tsowwto (Like / Dislike)
                </h2>
                <p className="text-xs text-gray-600 dark:text-slate-300 font-medium">
                  Qleb b'sor3a 3la l'produit o sowwet bach t3awen s-shabek :
                </p>
              </div>

              {/* IMAGE PRODUIT AVEC 1 ET 2 */}
              <div className="bg-gray-50 dark:bg-slate-800/60 rounded-[16px] p-2.5 border border-gray-200 dark:border-slate-700 space-y-1.5">
                <span className="text-[10px] font-extrabold text-gray-500 dark:text-slate-400 uppercase tracking-wider block text-center">
                  Repères f fiche produit d picking (1 o 2)
                </span>
                <div className="w-full max-h-[150px] rounded-[12px] bg-white flex items-center justify-center overflow-hidden border border-gray-200 p-2">
                  <img
                    src="/assets/aistudio/PRODUIT_5f7ef00f.png"
                    alt="Fiche produit picking (1: Code court, 2: Nom du produit)"
                    className="max-h-[135px] w-auto object-contain select-none"
                    loading="eager"
                  />
                </div>
              </div>

              {/* 2 MANIÈRES DE CHERCHER */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2.5 rounded-[12px] bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800">
                  <div className="flex items-center gap-1.5 font-black text-[#0759A4] dark:text-blue-300 mb-0.5">
                    <span className="w-5 h-5 rounded-full bg-[#0759A4] text-white flex items-center justify-center text-[10px]">
                      1
                    </span>
                    <span>Qlab b Code d'article</span>
                  </div>
                  <p className="text-[11px] text-gray-600 dark:text-slate-300 leading-snug">
                    Dkhel l'code sghir d rayon (mital f sora: <span className="font-mono font-bold">2285</span> ola <span className="font-mono font-bold">6037</span>).
                  </p>
                </div>

                <div className="p-2.5 rounded-[12px] bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800">
                  <div className="flex items-center gap-1.5 font-black text-[#0759A4] dark:text-blue-300 mb-0.5">
                    <span className="w-5 h-5 rounded-full bg-[#0759A4] text-white flex items-center justify-center text-[10px]">
                      2
                    </span>
                    <span>Qlab b Smia d l'produit</span>
                  </div>
                  <p className="text-[11px] text-gray-600 dark:text-slate-300 leading-snug">
                    Kteb smit l'produit (mital: <span className="font-bold">Pâte feuilletée fraîche</span>).
                  </p>
                </div>
              </div>

              {/* LOGIQUE LIKE / DISLIKE EN DARIJA */}
              <div className="p-3 rounded-[14px] bg-amber-50/70 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 space-y-2">
                <h4 className="text-xs font-black text-amber-950 dark:text-amber-200 flex items-center gap-1.5">
                  <span>3awnona nlqaw les codesbarres li khdamin :</span>
                </h4>
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div className="flex items-start gap-1.5 p-2 rounded-[10px] bg-white dark:bg-slate-800 border border-emerald-200 dark:border-emerald-800">
                    <ThumbsUp className="w-4 h-4 text-emerald-600 fill-emerald-600 shrink-0 mt-0.5" />
                    <span className="text-gray-700 dark:text-slate-200 font-medium">
                      <strong className="text-emerald-700 dark:text-emerald-400">Code khdam ?</strong> Khli <strong>Like</strong>. Ila fate 15 likes kithawel l cas d marjane b'l'khder !
                    </span>
                  </div>
                  <div className="flex items-start gap-1.5 p-2 rounded-[10px] bg-white dark:bg-slate-800 border border-rose-200 dark:border-rose-800">
                    <ThumbsDown className="w-4 h-4 text-rose-600 fill-rose-600 shrink-0 mt-0.5" />
                    <span className="text-gray-700 dark:text-slate-200 font-medium">
                      <strong className="text-rose-700 dark:text-rose-400">Makhdamch ?</strong> Dir <strong>Dislike</strong>. Ila wsel 15 dislikes kitmsah auto mn l'dashboard.
                    </span>
                  </div>
                </div>
              </div>

              {/* ASTUCES CALLOUT EN DARIJA */}
              <div className="p-2.5 rounded-[12px] bg-gray-50 dark:bg-slate-800/80 border border-gray-200 dark:border-slate-700 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Lightbulb className="w-4 h-4 text-amber-500 fill-amber-500 shrink-0" />
                  <p className="text-[11px] text-gray-700 dark:text-slate-300 font-medium leading-snug">
                    Ghadi tlqaw des astuces 3la lkhadma dyalna f <strong>Astuces</strong>.
                  </p>
                </div>
                {onOpenTips && (
                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic('light');
                      handleFinishOrClose();
                      onOpenTips();
                    }}
                    className="px-2.5 py-1 rounded-[8px] bg-amber-500 text-white font-bold text-[10px] hover:bg-amber-600 transition shrink-0 cursor-pointer"
                  >
                    Chouf Astuces
                  </button>
                )}
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* SLIDE 3 : AIDEZ-NOUS VIA WHATSAPP (SCREEN OU TEXTE)       */}
          {/* ========================================================= */}
          {currentSlide === 3 && (
            <div className="space-y-3.5 animate-in fade-in duration-200">
              <div className="text-center space-y-1">
                <span className="inline-block px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-[#155B48] dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-[11px] font-black uppercase tracking-wider">
                  Ta3awon dyalna kamlin
                </span>
                <h2 className="text-base sm:text-lg font-black text-gray-900 dark:text-white leading-tight">
                  3awnona nlqaw les codes li makatlqawhomch f app
                </h2>
                <p className="text-xs text-gray-600 dark:text-slate-300 font-medium">
                  Swa b'Screen ola tdakhlo les informations manuelment o tsiftihom lina f WhatsApp :
                </p>
              </div>

              {/* 2 CHOIX PROPOSÉS EN DARIJA */}
              <div className="space-y-2">
                {/* Choix 1 : Par Capture (Screen) */}
                <div className="flex items-start gap-2.5 p-3 rounded-[14px] bg-white dark:bg-slate-800 border-2 border-emerald-300 dark:border-emerald-700 shadow-2xs">
                  <div className="w-7 h-7 rounded-full bg-[#155B48] text-white flex items-center justify-center shrink-0">
                    <Camera className="w-3.5 h-3.5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-xs font-black text-gray-900 dark:text-white">
                      1. Swa b'Screen (Capture d'écran)
                    </h4>
                    <p className="text-[11px] text-gray-600 dark:text-slate-300 mt-0.5 leading-snug">
                      Khoud capture d'écran l'produit ola sewwer l'étiquette f rayon, o siftha lina f WhatsApp.
                    </p>
                  </div>
                </div>

                {/* Choix 2 : Par Texte / Manuel */}
                <div className="flex items-start gap-2.5 p-3 rounded-[14px] bg-white dark:bg-slate-800 border-2 border-blue-300 dark:border-blue-700 shadow-2xs">
                  <div className="w-7 h-7 rounded-full bg-[#0759A4] text-white flex items-center justify-center shrink-0">
                    <Check className="w-3.5 h-3.5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-xs font-black text-gray-900 dark:text-white">
                      2. Swa b'Message manuel f WhatsApp
                    </h4>
                    <p className="text-[11px] text-gray-600 dark:text-slate-300 mt-0.5 leading-snug">
                      Dkhol l'bouton « Aidez-nous » dakhlo les informations manuelment (Code, Nom, Code-barre) o siftou lina direct f WhatsApp.
                    </p>
                  </div>
                </div>
              </div>

              {/* MESSAGE FORMAT PREVIEW */}
              <div className="bg-gray-50 dark:bg-slate-800/80 rounded-[14px] p-3 border border-gray-200 dark:border-slate-700 space-y-1">
                <span className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider block">
                  Format d'message li kitemchi f WhatsApp :
                </span>
                <pre className="text-[10.5px] font-mono text-gray-700 dark:text-slate-200 whitespace-pre-wrap leading-tight bg-white dark:bg-slate-900 p-2 rounded-[8px] border border-gray-200 dark:border-slate-700">
{`BONJOUR J'AI BESOIN DE CE CODE SVP :
CODE : [code]
NOM DE PRODUIT : [nom]`}
                </pre>
              </div>

              {/* DIRECT WHATSAPP ACTION BUTTON */}
              <a
                href={`https://wa.me/${WHATSAPP_PHONE_NUMBER}?text=${encodeURIComponent("BONJOUR J'AI BESOIN DE CE CODE SVP (Capture d'écran ci-jointe)")}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => {
                  triggerHaptic('success');
                  handleFinishOrClose();
                }}
                className="w-full h-[48px] rounded-[14px] bg-[#25D366] hover:bg-[#20ba59] active:scale-[0.98] text-white font-black text-xs sm:text-sm shadow-md shadow-emerald-600/25 flex items-center justify-center gap-2 transition cursor-pointer select-none"
              >
                <WhatsAppIcon className="w-5 h-5 fill-current" />
                <span>Sift f WhatsApp direct ({WHATSAPP_DISPLAY_NUMBER})</span>
              </a>
            </div>
          )}
        </div>

        {/* Footer Navigation Bar */}
        <div className="flex items-center justify-between px-4 sm:px-5 py-3 border-t border-gray-100 dark:border-slate-800 bg-gray-50/80 dark:bg-slate-800/60 shrink-0">
          {/* Indicator Dots */}
          <div className="flex items-center gap-1.5">
            {[1, 2, 3].map((step) => (
              <button
                key={step}
                type="button"
                onClick={() => {
                  triggerHaptic('light');
                  setCurrentSlide(step as 1 | 2 | 3);
                }}
                className={`h-2 rounded-full transition-all cursor-pointer ${
                  currentSlide === step
                    ? 'w-6 bg-[#0759A4]'
                    : 'w-2 bg-gray-300 dark:bg-slate-600 hover:bg-gray-400'
                }`}
                aria-label={`Mchi l'marhala ${step}`}
              />
            ))}
          </div>

          {/* Buttons: Rej3a & Zid lqdam / Fhemt */}
          <div className="flex items-center gap-2">
            {currentSlide > 1 && (
              <button
                type="button"
                onClick={prevSlide}
                className="px-3 py-1.5 rounded-[10px] bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 text-xs font-bold text-gray-700 dark:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-600 active:scale-95 transition flex items-center gap-1 cursor-pointer select-none"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Rej3a</span>
              </button>
            )}

            <button
              type="button"
              onClick={nextSlide}
              className={`px-4 py-1.5 rounded-[10px] text-xs font-black shadow-xs active:scale-95 transition flex items-center gap-1 cursor-pointer select-none ${
                currentSlide === 3
                  ? 'bg-[#155B48] text-white hover:bg-[#104838]'
                  : 'bg-[#0759A4] text-white hover:bg-[#064a88]'
              }`}
            >
              <span>{currentSlide === 3 ? 'Fhemt صافي' : 'Zid lqdam'}</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

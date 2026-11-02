import React, { useState, useEffect, useCallback } from 'react';
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
  Tv,
  Sparkles,
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

  const handleFinishOrClose = useCallback(() => {
    try {
      localStorage.setItem(TUTORIAL_STORAGE_KEY, 'true');
    } catch {
      // ignore
    }
    onClose();
  }, [onClose]);

  const nextSlide = useCallback(() => {
    triggerHaptic('light');
    if (currentSlide < 3) {
      setCurrentSlide((prev) => (prev + 1) as 1 | 2 | 3);
    } else {
      handleFinishOrClose();
    }
  }, [currentSlide, handleFinishOrClose]);

  const prevSlide = useCallback(() => {
    triggerHaptic('light');
    if (currentSlide > 1) {
      setCurrentSlide((prev) => (prev - 1) as 1 | 2 | 3);
    }
  }, [currentSlide]);

  // Keyboard navigation like PowerPoint (Left / Right arrows, Escape)
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'Space') {
        e.preventDefault();
        nextSlide();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        prevSlide();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        handleFinishOrClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, nextSlide, prevSlide, handleFinishOrClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 w-full h-full bg-[#070B14] text-slate-100 flex flex-col select-none overflow-hidden animate-in fade-in duration-200">
      
      {/* 1. TOP POWERPOINT / PRESENTATION TOOLBAR */}
      <div className="h-14 sm:h-16 px-4 sm:px-6 bg-[#0E1526] border-b border-slate-800 flex items-center justify-between shrink-0 shadow-lg">
        {/* Left: Presentation Branding & Status */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-[10px] bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white shadow-md shadow-orange-500/20">
            <Tv className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs sm:text-sm font-black text-white tracking-wide">
                GUIDE PICKEUR MARJANE
              </span>
              <span className="px-2 py-0.5 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-300 text-[10px] font-mono font-bold uppercase hidden sm:inline-block">
                Diaporama
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Diapositive {currentSlide} sur 3 • B Darija
            </p>
          </div>
        </div>

        {/* Center: Slide Jump Pills (PowerPoint Style) */}
        <div className="hidden md:flex items-center gap-2 bg-slate-900/90 p-1 rounded-full border border-slate-800">
          {[
            { id: 1, title: '1. Imta tkhdem b\'l\'app' },
            { id: 2, title: '2. Qlab o Like/Dislike' },
            { id: 3, title: '3. Aidez-nous WhatsApp' },
          ].map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => {
                triggerHaptic('light');
                setCurrentSlide(s.id as 1 | 2 | 3);
              }}
              className={`px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
                currentSlide === s.id
                  ? 'bg-[#0759A4] text-white shadow-md shadow-blue-500/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              {s.title}
            </button>
          ))}
        </div>

        {/* Right: Keyboard Shortcut Info & Close / Exit button */}
        <div className="flex items-center gap-3">
          <div className="hidden lg:flex items-center gap-1.5 text-[10px] font-mono text-slate-400 bg-slate-900/80 px-2.5 py-1 rounded-[8px] border border-slate-800">
            <span>← / → Flèches</span>
            <span>•</span>
            <span>Échap pour quitter</span>
          </div>

          <button
            type="button"
            onClick={() => {
              triggerHaptic('light');
              handleFinishOrClose();
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-[12px] bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition text-xs font-bold border border-slate-700 cursor-pointer active:scale-95"
            title="Quitter la présentation"
          >
            <span className="hidden sm:inline">Quitter</span>
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 2. MAIN PRESENTATION SLIDE CANVAS (CENTERED WIDESCREEN SLIDE) */}
      <div className="flex-1 w-full max-w-6xl mx-auto p-3 sm:p-6 md:p-8 flex items-center justify-center overflow-y-auto">
        <div className="w-full bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100 rounded-[28px] shadow-2xl border border-slate-200 dark:border-slate-800 p-4 sm:p-7 md:p-9 flex flex-col justify-between min-h-[500px] max-h-[85vh] overflow-y-auto relative transition-all">

          {/* ========================================================= */}
          {/* SLIDE 1 : IMTA YKHADMO B'L'APP                            */}
          {/* ========================================================= */}
          {currentSlide === 1 && (
            <div className="space-y-4 sm:space-y-6 animate-in fade-in zoom-in-95 duration-200">
              {/* Slide Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 dark:border-slate-800 pb-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1 rounded-full bg-blue-100 dark:bg-blue-950/80 text-[#0759A4] dark:text-blue-300 text-xs font-black uppercase tracking-wider">
                      Diapositive 1 • Qawa3id s-sarima
                    </span>
                    <span className="text-xs text-slate-400 font-semibold hidden sm:inline">
                      Guide Pickeur
                    </span>
                  </div>
                  <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-gray-950 dark:text-white tracking-tight">
                    Imta khaskom tkhadmo b'had l'application ?
                  </h1>
                </div>

                <div className="px-3 py-1 rounded-[12px] bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-300 text-xs font-black self-start sm:self-auto">
                  2 Halat Faqat (Deux cas autorisés)
                </div>
              </div>

              {/* Slide Body: 2 Cas + Strict Warning + Image */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-stretch">
                {/* Left Column: 2 Cases & Warning */}
                <div className="md:col-span-7 space-y-3 flex flex-col justify-center">
                  <p className="text-xs sm:text-sm font-semibold text-gray-700 dark:text-slate-300">
                    Khadmo b'had l'app <span className="font-black text-[#0759A4] dark:text-blue-400 underline">GHIR o GHIR</span> f had 2 d l'halat :
                  </p>

                  <div className="space-y-2.5">
                    {/* Cas 1 */}
                    <div className="p-3 sm:p-4 rounded-[18px] bg-emerald-50/90 dark:bg-emerald-950/40 border-2 border-emerald-300 dark:border-emerald-700/80 flex items-start gap-3 shadow-xs">
                      <div className="w-8 h-8 rounded-full bg-[#155B48] text-white flex items-center justify-center font-black text-sm shrink-0 shadow-sm">
                        1
                      </div>
                      <div>
                        <h3 className="text-sm font-black text-emerald-950 dark:text-emerald-100">
                          Fach makikhrjouch les tickets mn balance (mizan) d Marjane
                        </h3>
                        <p className="text-xs text-emerald-800 dark:text-emerald-300/90 mt-1 leading-relaxed">
                          Rouleau bloqué ola ticket matatkhrojch mn l'mizan bach tscanniha.
                        </p>
                      </div>
                    </div>

                    {/* Cas 2 */}
                    <div className="p-3 sm:p-4 rounded-[18px] bg-emerald-50/90 dark:bg-emerald-950/40 border-2 border-emerald-300 dark:border-emerald-700/80 flex items-start gap-3 shadow-xs">
                      <div className="w-8 h-8 rounded-full bg-[#155B48] text-white flex items-center justify-center font-black text-sm shrink-0 shadow-sm">
                        2
                      </div>
                      <div>
                        <h3 className="text-sm font-black text-emerald-950 dark:text-emerald-100">
                          Fach kikoun khaser lmizan o deja 3andk le produit f yddik
                        </h3>
                        <p className="text-xs text-emerald-800 dark:text-emerald-300/90 mt-1 leading-relaxed">
                          Lmizan en panne o <span className="font-bold underline">déjà haz le produit physique f yddik</span> wajed bghiti tvalideh.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Warning Strict */}
                  <div className="p-3 sm:p-4 rounded-[18px] bg-rose-50 dark:bg-rose-950/50 border-2 border-rose-400 dark:border-rose-700 text-rose-950 dark:text-rose-100 flex items-start gap-3 shadow-xs">
                    <ShieldAlert className="w-6 h-6 text-rose-600 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <strong className="block text-xs font-black text-rose-700 dark:text-rose-300 uppercase tracking-tight">
                        ⛔ ATTENTION STRICTE (Khatt a7mer) :
                      </strong>
                      <p className="text-xs font-semibold leading-relaxed">
                        Mn ghir had 2 d l'cas, <span className="underline font-black text-rose-700 dark:text-rose-300">MATSCANNICH</span> o nta ma3ndkch l'produit f yddik li at-validéh f l'app Marjane Picking !
                      </p>
                    </div>
                  </div>
                </div>

                {/* Right Column: Ticket Image Preview */}
                <div className="md:col-span-5 flex flex-col items-center justify-center bg-gray-50 dark:bg-slate-800/80 rounded-[20px] p-3 sm:p-4 border border-gray-200 dark:border-slate-700 space-y-2">
                  <span className="text-[11px] font-extrabold text-gray-500 dark:text-slate-400 uppercase tracking-wider block text-center">
                    Mital : Ticket d'pesée balance Marjane
                  </span>
                  <div className="w-full max-h-[220px] rounded-[16px] bg-white flex items-center justify-center p-2 shadow-xs border border-gray-200 dark:border-slate-600 overflow-hidden">
                    <img
                      src="/assets/aistudio/image_2026-11-01_090829473_0eae3a7f.png"
                      alt="Ticket de pesée balance Marjane"
                      className="max-h-[200px] w-auto object-contain select-none"
                      loading="eager"
                    />
                  </div>
                  <p className="text-[11px] text-gray-600 dark:text-slate-400 text-center italic leading-snug">
                    Fach had ticket makatkhrjch, 9elleb 3la l'produit fl'app bach tlqa l'code-barres wajed.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* SLIDE 2 : RECHERCHE & SYSTÈME LIKE / DISLIKE              */}
          {/* ========================================================= */}
          {currentSlide === 2 && (
            <div className="space-y-4 sm:space-y-6 animate-in fade-in zoom-in-95 duration-200">
              {/* Slide Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 dark:border-slate-800 pb-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1 rounded-full bg-blue-100 dark:bg-blue-950/80 text-[#0759A4] dark:text-blue-300 text-xs font-black uppercase tracking-wider">
                      Diapositive 2 • Qlab o Sowwet
                    </span>
                    <span className="text-xs text-slate-400 font-semibold hidden sm:inline">
                      Recherche Rapide
                    </span>
                  </div>
                  <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-gray-950 dark:text-white tracking-tight">
                    Qlab b Code ola b Smia, o sowwet b Like / Dislike
                  </h1>
                </div>

                <div className="px-3 py-1 rounded-[12px] bg-blue-50 dark:bg-blue-950/50 border border-blue-300 dark:border-blue-700 text-[#0759A4] dark:text-blue-300 text-xs font-black self-start sm:self-auto">
                  Mo3awana Jma3iya
                </div>
              </div>

              {/* Slide Body: Image + 2 Search ways + Likes/Dislikes */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-stretch">
                {/* Left Column: Image Repères 1 & 2 */}
                <div className="md:col-span-5 flex flex-col items-center justify-center bg-gray-50 dark:bg-slate-800/80 rounded-[20px] p-3 sm:p-4 border border-gray-200 dark:border-slate-700 space-y-2">
                  <span className="text-[11px] font-extrabold text-gray-500 dark:text-slate-400 uppercase tracking-wider block text-center">
                    Repères f fiche produit d picking (1 o 2)
                  </span>
                  <div className="w-full max-h-[170px] rounded-[16px] bg-white flex items-center justify-center p-3 shadow-xs border border-gray-200 dark:border-slate-600 overflow-hidden">
                    <img
                      src="/assets/aistudio/PRODUIT_5f7ef00f.png"
                      alt="Fiche produit picking (1: Code court, 2: Nom du produit)"
                      className="max-h-[150px] w-auto object-contain select-none"
                      loading="eager"
                    />
                  </div>
                  <p className="text-[11px] text-gray-600 dark:text-slate-400 text-center leading-snug">
                    <span className="font-bold text-blue-600 dark:text-blue-400">(1)</span> Code d'article court •{' '}
                    <span className="font-bold text-blue-600 dark:text-blue-400">(2)</span> Smia d'produit
                  </p>
                </div>

                {/* Right Column: Search Details & Voting Rules */}
                <div className="md:col-span-7 space-y-3 flex flex-col justify-center">
                  {/* 2 Search Methods Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div className="p-3 rounded-[16px] bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800">
                      <div className="flex items-center gap-2 font-black text-[#0759A4] dark:text-blue-300 text-xs mb-1">
                        <span className="w-6 h-6 rounded-full bg-[#0759A4] text-white flex items-center justify-center text-xs">
                          1
                        </span>
                        <span>Qlab b Code d'article</span>
                      </div>
                      <p className="text-xs text-gray-700 dark:text-slate-300 leading-snug">
                        Dkhel l'code sghir d rayon (mital: <span className="font-mono font-bold">2285</span>, <span className="font-mono font-bold">6037</span>).
                      </p>
                    </div>

                    <div className="p-3 rounded-[16px] bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800">
                      <div className="flex items-center gap-2 font-black text-[#0759A4] dark:text-blue-300 text-xs mb-1">
                        <span className="w-6 h-6 rounded-full bg-[#0759A4] text-white flex items-center justify-center text-xs">
                          2
                        </span>
                        <span>Qlab b Smia d l'produit</span>
                      </div>
                      <p className="text-xs text-gray-700 dark:text-slate-300 leading-snug">
                        Kteb smit l'produit (mital: <span className="font-bold">Pâte feuilletée</span>).
                      </p>
                    </div>
                  </div>

                  {/* Like / Dislike Community System */}
                  <div className="p-3.5 rounded-[18px] bg-amber-50/80 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700/80 space-y-2">
                    <h4 className="text-xs font-black text-amber-950 dark:text-amber-200 flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-amber-600" />
                      <span>3awnona nlqaw les codesbarres li khdamin :</span>
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      <div className="flex items-start gap-2 p-2.5 rounded-[12px] bg-white dark:bg-slate-800 border border-emerald-300 dark:border-emerald-700">
                        <ThumbsUp className="w-4 h-4 text-emerald-600 fill-emerald-600 shrink-0 mt-0.5" />
                        <span className="text-gray-800 dark:text-slate-200 font-medium text-[11px] leading-snug">
                          <strong className="text-emerald-700 dark:text-emerald-400">Code khdam ?</strong> Khli <strong>Like</strong>. Ila fate 15 likes kithawel l cas d marjane b'l'khder !
                        </span>
                      </div>
                      <div className="flex items-start gap-2 p-2.5 rounded-[12px] bg-white dark:bg-slate-800 border border-rose-300 dark:border-rose-700">
                        <ThumbsDown className="w-4 h-4 text-rose-600 fill-rose-600 shrink-0 mt-0.5" />
                        <span className="text-gray-800 dark:text-slate-200 font-medium text-[11px] leading-snug">
                          <strong className="text-rose-700 dark:text-rose-400">Makhdamch ?</strong> Dir <strong>Dislike</strong>. Ila wsel 15 dislikes kitmsah auto mn l'dashboard.
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Tips Quick Access */}
                  <div className="p-2.5 rounded-[14px] bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <Lightbulb className="w-4 h-4 text-amber-500 fill-amber-500 shrink-0" />
                      <p className="text-xs text-gray-700 dark:text-slate-300 font-medium">
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
                        className="px-3 py-1 rounded-[10px] bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs transition shrink-0 cursor-pointer"
                      >
                        Chouf Astuces
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* SLIDE 3 : AIDEZ-NOUS VIA WHATSAPP (SCREEN OU TEXTE)       */}
          {/* ========================================================= */}
          {currentSlide === 3 && (
            <div className="space-y-4 sm:space-y-6 animate-in fade-in zoom-in-95 duration-200">
              {/* Slide Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 dark:border-slate-800 pb-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-[#155B48] dark:text-emerald-300 text-xs font-black uppercase tracking-wider">
                      Diapositive 3 • Aidez-nous WhatsApp
                    </span>
                    <span className="text-xs text-slate-400 font-semibold hidden sm:inline">
                      Ta3awon
                    </span>
                  </div>
                  <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-gray-950 dark:text-white tracking-tight">
                    3awnona nlqaw les codes li makatlqawhomch f app
                  </h1>
                </div>

                <div className="px-3 py-1 rounded-[12px] bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-300 dark:border-emerald-700 text-[#155B48] dark:text-emerald-300 text-xs font-black self-start sm:self-auto">
                  Swa b Screen swa b Texte
                </div>
              </div>

              {/* Slide Body: 2 Choices + Preview + Direct Button */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-stretch">
                {/* Left Column: 2 Ways to Contribute */}
                <div className="md:col-span-7 space-y-3 flex flex-col justify-center">
                  <p className="text-xs sm:text-sm font-semibold text-gray-700 dark:text-slate-300">
                    Swa b'Screen ola tdakhlo les informations manuelment o tsiftihom lina f WhatsApp :
                  </p>

                  <div className="space-y-2.5">
                    {/* Choice 1 : Capture */}
                    <div className="p-3 sm:p-4 rounded-[18px] bg-white dark:bg-slate-800 border-2 border-emerald-300 dark:border-emerald-700 shadow-xs flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-[#155B48] text-white flex items-center justify-center shrink-0">
                        <Camera className="w-4 h-4 text-white" />
                      </div>
                      <div>
                        <h3 className="text-sm font-black text-gray-900 dark:text-white">
                          1. Swa b'Screen (Capture d'écran)
                        </h3>
                        <p className="text-xs text-gray-600 dark:text-slate-300 mt-1 leading-relaxed">
                          Khoud capture d'écran l'produit ola sewwer l'étiquette f rayon, o siftha lina direct f WhatsApp.
                        </p>
                      </div>
                    </div>

                    {/* Choice 2 : Text / Manual */}
                    <div className="p-3 sm:p-4 rounded-[18px] bg-white dark:bg-slate-800 border-2 border-blue-300 dark:border-blue-700 shadow-xs flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-[#0759A4] text-white flex items-center justify-center shrink-0">
                        <Check className="w-4 h-4 text-white" />
                      </div>
                      <div>
                        <h3 className="text-sm font-black text-gray-900 dark:text-white">
                          2. Swa b'Message manuel f WhatsApp
                        </h3>
                        <p className="text-xs text-gray-600 dark:text-slate-300 mt-1 leading-relaxed">
                          Dkhol l'bouton « Aidez-nous » dakhlo les informations (Code, Nom, Code-barre) o siftou lina direct f WhatsApp.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Column: Message Preview & WhatsApp Action */}
                <div className="md:col-span-5 flex flex-col justify-between bg-gray-50 dark:bg-slate-800/80 rounded-[20px] p-3 sm:p-4 border border-gray-200 dark:border-slate-700 space-y-3">
                  <div className="space-y-2">
                    <span className="text-[11px] font-extrabold text-gray-500 dark:text-slate-400 uppercase tracking-wider block">
                      Format d'message li kitemchi f WhatsApp :
                    </span>
                    <pre className="text-xs font-mono text-gray-800 dark:text-slate-200 whitespace-pre-wrap leading-relaxed bg-white dark:bg-slate-900 p-3 rounded-[12px] border border-gray-200 dark:border-slate-700 shadow-2xs">
{`BONJOUR J'AI BESOIN DE CE CODE SVP :
CODE : [code]
NOM DE PRODUIT : [nom]`}
                    </pre>
                  </div>

                  <a
                    href={`https://wa.me/${WHATSAPP_PHONE_NUMBER}?text=${encodeURIComponent("BONJOUR J'AI BESOIN DE CE CODE SVP (Capture d'écran ci-jointe)")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => {
                      triggerHaptic('success');
                      handleFinishOrClose();
                    }}
                    className="w-full h-[50px] rounded-[16px] bg-[#25D366] hover:bg-[#20ba59] active:scale-[0.98] text-white font-black text-xs sm:text-sm shadow-md shadow-emerald-600/30 flex items-center justify-center gap-2 transition cursor-pointer select-none"
                  >
                    <WhatsAppIcon className="w-5 h-5 fill-current" />
                    <span>Sift f WhatsApp direct ({WHATSAPP_DISPLAY_NUMBER})</span>
                  </a>
                </div>
              </div>
            </div>
          )}

          {/* Slide Bottom Bar inside slide canvas */}
          <div className="pt-4 mt-4 border-t border-gray-100 dark:border-slate-800 flex items-center justify-between text-xs text-gray-500 dark:text-slate-400">
            <span>Marjane Picking Team • Version Pickeur</span>
            <span>Diapositive {currentSlide} / 3</span>
          </div>
        </div>
      </div>

      {/* 3. BOTTOM POWERPOINT PRESENTER BAR (REMOTE CONTROL) */}
      <div className="h-16 sm:h-20 px-4 sm:px-8 bg-[#0E1526] border-t border-slate-800 flex items-center justify-between shrink-0 shadow-2xl">
        {/* Previous Button */}
        <div>
          {currentSlide > 1 ? (
            <button
              type="button"
              onClick={prevSlide}
              className="px-4 sm:px-5 py-2.5 rounded-[14px] bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-200 font-bold text-xs sm:text-sm flex items-center gap-2 border border-slate-700 cursor-pointer transition select-none shadow-md"
            >
              <ChevronLeft className="w-5 h-5" />
              <span>Précédent (Rej3a)</span>
            </button>
          ) : (
            <div className="w-24" />
          )}
        </div>

        {/* Slide Indicator Dots with numbers */}
        <div className="flex items-center gap-2">
          {[1, 2, 3].map((step) => (
            <button
              key={step}
              type="button"
              onClick={() => {
                triggerHaptic('light');
                setCurrentSlide(step as 1 | 2 | 3);
              }}
              className={`h-3 rounded-full transition-all cursor-pointer ${
                currentSlide === step
                  ? 'w-8 bg-[#0759A4] shadow-md shadow-blue-500/30'
                  : 'w-3 bg-slate-700 hover:bg-slate-600'
              }`}
              aria-label={`Aller à la diapositive ${step}`}
            />
          ))}
        </div>

        {/* Next / Finish Button */}
        <div>
          <button
            type="button"
            onClick={nextSlide}
            className={`px-5 sm:px-6 py-2.5 rounded-[14px] font-black text-xs sm:text-sm flex items-center gap-2 cursor-pointer transition select-none active:scale-95 shadow-lg ${
              currentSlide === 3
                ? 'bg-[#155B48] hover:bg-[#104838] text-white shadow-emerald-900/40'
                : 'bg-[#0759A4] hover:bg-[#064a88] text-white shadow-blue-900/40'
            }`}
          >
            <span>{currentSlide === 3 ? 'Fhemt صافي (Terminer)' : 'Suivant (Zid lqdam)'}</span>
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

    </div>
  );
};

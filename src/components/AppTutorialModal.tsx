import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  Lightbulb,
  Sparkles,
  BookOpen,
  Barcode,
  Scale,
  Play,
  Edit3,
  Save,
  RotateCcw,
  Eye,
} from 'lucide-react';
import { triggerHaptic } from '../utils/haptics';
import { WHATSAPP_PHONE_NUMBER, WhatsAppIcon, openWhatsApp } from './SuggestOneScreen';
import { useApp } from '../context/AppContext';
import { GuideConfig } from '../types';
import { sanitizeImageUrl } from '../utils/securityUtils';

export const TUTORIAL_STORAGE_KEY = 'livry_finder_tutorial_seen_v1';

interface AppTutorialModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenSuggest?: () => void;
  onOpenTips?: () => void;
  initialSlide?: number;
  defaultEditMode?: boolean;
}

export const AppTutorialModal: React.FC<AppTutorialModalProps> = ({
  isOpen,
  onClose,
  onOpenTips,
  initialSlide = 0,
  defaultEditMode = false,
}) => {
  const { role, guideConfig, updateGuideConfig, resetGuideConfig, showToast } = useApp();

  const [currentSlide, setCurrentSlide] = useState(initialSlide);
  const [isEditingGuide, setIsEditingGuide] = useState(false);
  const [draftConfig, setDraftConfig] = useState<GuideConfig>(guideConfig);
  const [isSavingGuide, setIsSavingGuide] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);

  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [touchEndX, setTouchEndX] = useState<number | null>(null);
  const [mouseStartX, setMouseStartX] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const totalSlides = 3;

  useEffect(() => {
    if (isOpen) {
      setCurrentSlide(Math.max(0, Math.min(totalSlides - 1, initialSlide)));
      setDraftConfig(guideConfig);
      setIsEditingGuide(role === 'Admin' && defaultEditMode);
      setConfirmReset(false);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
      setIsEditingGuide(false);
      setConfirmReset(false);
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen, initialSlide, defaultEditMode, role, guideConfig]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isEditingGuide) {
        if (e.key === 'Escape') {
          setIsEditingGuide(false);
        }
        return;
      }
      if (e.key === 'ArrowRight') {
        handleNext();
      } else if (e.key === 'ArrowLeft') {
        handlePrev();
      } else if (e.key === 'Escape') {
        handleClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  if (!isOpen) return null;

  const activeConfig = isEditingGuide ? draftConfig : guideConfig;
  const activeStep = activeConfig.steps[currentSlide] || activeConfig.steps[0];

  const markAsSeen = () => {
    try {
      localStorage.setItem(TUTORIAL_STORAGE_KEY, 'true');
    } catch {
      // ignore
    }
  };

  const handleClose = () => {
    triggerHaptic('light');
    markAsSeen();
    onClose();
  };

  const handleNext = () => {
    triggerHaptic('light');
    if (currentSlide < totalSlides - 1) {
      setCurrentSlide((prev) => prev + 1);
    } else {
      markAsSeen();
      onClose();
    }
  };

  const handlePrev = () => {
    triggerHaptic('light');
    if (currentSlide > 0) {
      setCurrentSlide((prev) => prev - 1);
    }
  };

  // Touch Swipe handlers (disabled while editing so inputs work cleanly)
  const onTouchStart = (e: React.TouchEvent) => {
    if (isEditingGuide) return;
    setTouchEndX(null);
    setTouchStartX(e.targetTouches[0].clientX);
  };
  const onTouchMove = (e: React.TouchEvent) => {
    if (isEditingGuide) return;
    setTouchEndX(e.targetTouches[0].clientX);
  };
  const onTouchEnd = () => {
    if (isEditingGuide || !touchStartX || !touchEndX) return;
    const distance = touchStartX - touchEndX;
    if (distance > 45) {
      if (currentSlide < totalSlides - 1) setCurrentSlide((p) => p + 1);
    } else if (distance < -45) {
      if (currentSlide > 0) setCurrentSlide((p) => p - 1);
    }
  };

  // Mouse drag support for Desktop (disabled while editing)
  const onMouseDown = (e: React.MouseEvent) => {
    if (isEditingGuide) return;
    setMouseStartX(e.clientX);
  };
  const onMouseUp = (e: React.MouseEvent) => {
    if (isEditingGuide || mouseStartX === null) return;
    const distance = mouseStartX - e.clientX;
    if (distance > 55 && currentSlide < totalSlides - 1) {
      setCurrentSlide((p) => p + 1);
    } else if (distance < -55 && currentSlide > 0) {
      setCurrentSlide((p) => p - 1);
    }
    setMouseStartX(null);
  };

  const handleUpdateStepField = (
    stepIndex: number,
    field: keyof GuideConfig['steps'][0],
    value: string
  ) => {
    setDraftConfig((prev) => {
      const nextSteps = [...prev.steps] as GuideConfig['steps'];
      nextSteps[stepIndex] = {
        ...nextSteps[stepIndex],
        [field]: value,
      };
      return { ...prev, steps: nextSteps };
    });
  };

  const handleSaveGuide = async () => {
    triggerHaptic('medium');
    setIsSavingGuide(true);
    try {
      const sanitizedDraft: GuideConfig = {
        ...draftConfig,
        slide1: {
          ...draftConfig.slide1,
          beforeImageUrl:
            sanitizeImageUrl(draftConfig.slide1.beforeImageUrl) ||
            guideConfig.slide1.beforeImageUrl,
        },
        slide2: {
          ...draftConfig.slide2,
          showcaseImageUrl:
            sanitizeImageUrl(draftConfig.slide2.showcaseImageUrl) ||
            guideConfig.slide2.showcaseImageUrl,
        },
      };
      const res = await updateGuideConfig(sanitizedDraft);
      if (res.success) {
        triggerHaptic('success');
        setDraftConfig(res.config);
        setIsEditingGuide(false);
        showToast('✅ Guide mis à jour & publié pour tous !');
      } else {
        triggerHaptic('warning');
        showToast(`⚠️ Sauvegarde locale effectuée (${res.error || 'Cloud indisponible'})`);
        setIsEditingGuide(false);
      }
    } finally {
      setIsSavingGuide(false);
    }
  };

  const handleResetGuide = async () => {
    triggerHaptic('warning');
    setIsSavingGuide(true);
    try {
      const res = await resetGuideConfig();
      setDraftConfig(res.config);
      setConfirmReset(false);
      setIsEditingGuide(false);
      showToast('🔄 Guide réinitialisé par défaut');
    } finally {
      setIsSavingGuide(false);
    }
  };

  return (
    <div
      ref={containerRef}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      onMouseDown={onMouseDown}
      onMouseUp={onMouseUp}
      className={`fixed inset-0 z-[100] w-full h-dvh overflow-y-auto flex flex-col text-white animate-in fade-in duration-200 ${
        isEditingGuide ? '' : 'select-none'
      }`}
      style={{
        background:
          'radial-gradient(ellipse 80% 70% at 45% 40%, rgba(168, 22, 68, 0.48) 0%, rgba(7, 89, 164, 0.32) 48%, rgba(7, 10, 20, 0.99) 100%)',
      }}
    >
      {/* Subtle Full-Page Ambient Gloss */}
      <div
        className="pointer-events-none fixed inset-0 bg-gradient-to-b from-white/[0.05] via-transparent to-black/50"
        aria-hidden="true"
      />

      {/* Full-Page Top Navigation Bar */}
      <div className="sticky top-0 z-20 flex items-center justify-between px-4 sm:px-8 lg:px-12 py-3.5 border-b border-white/10 bg-black/30 backdrop-blur-xl shrink-0 gap-3 flex-wrap">
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/12 backdrop-blur-md border border-white/20 text-[11px] font-bold text-white/95">
            <BookOpen className="w-3.5 h-3.5 text-rose-400" />
            <span>{activeStep.badge}</span>
            <ArrowRight className="w-3 h-3 text-rose-400 hidden xs:inline" />
          </div>

          <span className="hidden md:inline text-xs font-bold text-white/55">
            {activeConfig.topBrandTitle}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Admin Inline Edit Toggle */}
          {role === 'Admin' && (
            <button
              type="button"
              onClick={() => {
                triggerHaptic('light');
                if (!isEditingGuide) {
                  setDraftConfig(guideConfig);
                  setIsEditingGuide(true);
                } else {
                  setIsEditingGuide(false);
                }
              }}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-black transition cursor-pointer border ${
                isEditingGuide
                  ? 'bg-emerald-500 text-white border-emerald-400 shadow-lg'
                  : 'bg-white/12 hover:bg-white/20 text-white border-white/20'
              }`}
              title="Modifier le contenu du Guide directement"
            >
              {isEditingGuide ? (
                <>
                  <Eye className="w-3.5 h-3.5" />
                  <span>Aperçu Plein Écran</span>
                </>
              ) : (
                <>
                  <Edit3 className="w-3.5 h-3.5 text-amber-300" />
                  <span>Modifier le Guide</span>
                </>
              )}
            </button>
          )}

          {/* Step counter */}
          <span className="text-xs font-mono font-bold text-white/65 tabular-nums px-2">
            0{currentSlide + 1} / 0{totalSlides}
          </span>

          <button
            type="button"
            onClick={handleClose}
            className="w-9 h-9 rounded-full bg-white/12 hover:bg-white/25 border border-white/20 text-white flex items-center justify-center transition cursor-pointer active:scale-90"
            aria-label="Fermer le guide"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Mobile & Tablet Step Tabs */}
      <div className="relative z-10 lg:hidden flex items-center gap-1.5 px-4 py-2.5 border-b border-white/10 bg-black/25 backdrop-blur-md overflow-x-auto no-scrollbar shrink-0">
        {activeConfig.steps.map((step) => {
          const isActive = currentSlide === step.id;
          return (
            <button
              key={step.id}
              type="button"
              onClick={() => {
                triggerHaptic('light');
                setCurrentSlide(step.id);
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] transition cursor-pointer shrink-0 ${
                isActive
                  ? 'bg-white/15 border border-white/25 text-white font-black shadow-xs'
                  : 'text-white/50 hover:text-white/80 font-bold'
              }`}
            >
              {isActive && (
                <Play className="w-2.5 h-2.5 text-rose-500 fill-rose-500 shrink-0" />
              )}
              <span>{step.shortLabel}</span>
            </button>
          );
        })}
      </div>

      {/* Main Edge-to-Edge Stage */}
      <div className="relative z-10 flex-1 w-full max-w-7xl mx-auto px-4 sm:px-8 lg:px-12 py-6 sm:py-10 flex flex-col justify-center">
        {/* Optional Admin Guide Editor Panel */}
        {role === 'Admin' && isEditingGuide && (
          <div className="mb-8 rounded-3xl bg-slate-950/85 backdrop-blur-2xl border border-white/20 p-4 sm:p-6 shadow-2xl space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
              <div>
                <h3 className="text-sm sm:text-base font-black text-white flex items-center gap-2">
                  <Edit3 className="w-4 h-4 text-amber-300" />
                  <span>Éditeur du Guide (Étape 0{currentSlide + 1})</span>
                </h3>
                <p className="text-[11px] text-white/65">
                  Modifiez les titres, descriptions, captures et boutons — synchronisé instantanément pour tous les Pickeurs.
                </p>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {!confirmReset ? (
                  <button
                    type="button"
                    onClick={() => setConfirmReset(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/18 border border-white/15 text-xs font-bold text-white/80 cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Réinitialiser</span>
                  </button>
                ) : (
                  <div className="flex items-center gap-1.5 bg-red-950/80 border border-red-400/40 px-2.5 py-1 rounded-xl">
                    <span className="text-[11px] font-bold text-red-200">Confirmer reset ?</span>
                    <button
                      type="button"
                      onClick={handleResetGuide}
                      disabled={isSavingGuide}
                      className="px-2 py-0.5 rounded bg-red-600 text-white text-[11px] font-black cursor-pointer"
                    >
                      Oui
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmReset(false)}
                      className="px-2 py-0.5 rounded bg-white/10 text-white text-[11px] font-bold cursor-pointer"
                    >
                      Non
                    </button>
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleSaveGuide}
                  disabled={isSavingGuide}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white text-xs font-black shadow-lg cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{isSavingGuide ? 'Publication...' : 'Enregistrer & Publier'}</span>
                </button>
              </div>
            </div>

            {/* Step Selector Pills inside Editor */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] font-bold text-white/55">Étape en cours :</span>
              {draftConfig.steps.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setCurrentSlide(s.id)}
                  className={`px-3 py-1 rounded-xl text-xs font-black transition cursor-pointer ${
                    currentSlide === s.id
                      ? 'bg-[#0759A4] text-white'
                      : 'bg-white/10 text-white/70 hover:bg-white/15'
                  }`}
                >
                  Étape 0{s.id + 1} · {s.shortLabel}
                </button>
              ))}
            </div>

            {/* Step General Fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
              <div>
                <label className="block text-[10.5px] font-bold text-white/65 mb-1">
                  Titre Global du Guide (Barre haute)
                </label>
                <input
                  type="text"
                  value={draftConfig.topBrandTitle}
                  onChange={(e) =>
                    setDraftConfig({ ...draftConfig, topBrandTitle: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-xl bg-white/10 border border-white/15 text-white outline-none focus:border-sky-400"
                />
              </div>

              <div>
                <label className="block text-[10.5px] font-bold text-white/65 mb-1">
                  Badge de l&apos;étape
                </label>
                <input
                  type="text"
                  value={draftConfig.steps[currentSlide].badge}
                  onChange={(e) => handleUpdateStepField(currentSlide, 'badge', e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white/10 border border-white/15 text-white outline-none focus:border-sky-400"
                />
              </div>

              <div>
                <label className="block text-[10.5px] font-bold text-white/65 mb-1">
                  Nom court dans le Sommaire
                </label>
                <input
                  type="text"
                  value={draftConfig.steps[currentSlide].shortLabel}
                  onChange={(e) => handleUpdateStepField(currentSlide, 'shortLabel', e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white/10 border border-white/15 text-white outline-none focus:border-sky-400"
                />
              </div>

              <div>
                <label className="block text-[10.5px] font-bold text-white/65 mb-1">
                  Grand Titre (Ligne 1)
                </label>
                <input
                  type="text"
                  value={draftConfig.steps[currentSlide].headlineLine1}
                  onChange={(e) =>
                    handleUpdateStepField(currentSlide, 'headlineLine1', e.target.value)
                  }
                  className="w-full px-3 py-2 rounded-xl bg-white/10 border border-white/15 text-white outline-none focus:border-sky-400"
                />
              </div>

              <div>
                <label className="block text-[10.5px] font-bold text-white/65 mb-1">
                  Sous-Titre Accent (Ligne 2)
                </label>
                <input
                  type="text"
                  value={draftConfig.steps[currentSlide].headlineLine2}
                  onChange={(e) =>
                    handleUpdateStepField(currentSlide, 'headlineLine2', e.target.value)
                  }
                  className="w-full px-3 py-2 rounded-xl bg-white/10 border border-white/15 text-white outline-none focus:border-sky-400"
                />
              </div>

              <div>
                <label className="block text-[10.5px] font-bold text-white/65 mb-1">
                  Bouton Principal (CTA)
                </label>
                <input
                  type="text"
                  value={draftConfig.steps[currentSlide].primaryCtaLabel}
                  onChange={(e) =>
                    handleUpdateStepField(currentSlide, 'primaryCtaLabel', e.target.value)
                  }
                  className="w-full px-3 py-2 rounded-xl bg-white/10 border border-white/15 text-white outline-none focus:border-sky-400"
                />
              </div>

              <div className="sm:col-span-2 lg:col-span-3">
                <label className="block text-[10.5px] font-bold text-white/65 mb-1">
                  Description de l&apos;étape
                </label>
                <textarea
                  rows={2}
                  value={draftConfig.steps[currentSlide].description}
                  onChange={(e) =>
                    handleUpdateStepField(currentSlide, 'description', e.target.value)
                  }
                  className="w-full px-3 py-2 rounded-xl bg-white/10 border border-white/15 text-white outline-none focus:border-sky-400"
                />
              </div>
            </div>

            {/* Slide-Specific Visual Fields */}
            {currentSlide === 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs pt-3 border-t border-white/10">
                <div>
                  <label className="block text-[10.5px] font-bold text-rose-300 mb-1">
                    Badge Avant
                  </label>
                  <input
                    type="text"
                    value={draftConfig.slide1.beforeBadge}
                    onChange={(e) =>
                      setDraftConfig({
                        ...draftConfig,
                        slide1: { ...draftConfig.slide1, beforeBadge: e.target.value },
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-white/10 border border-white/15 text-white outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10.5px] font-bold text-rose-300 mb-1">
                    URL Image Ticket Mizan
                  </label>
                  <input
                    type="text"
                    value={draftConfig.slide1.beforeImageUrl}
                    onChange={(e) =>
                      setDraftConfig({
                        ...draftConfig,
                        slide1: { ...draftConfig.slide1, beforeImageUrl: e.target.value },
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-white/10 border border-white/15 text-white font-mono outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10.5px] font-bold text-rose-300 mb-1">
                    Légende Avant
                  </label>
                  <input
                    type="text"
                    value={draftConfig.slide1.beforeCaption}
                    onChange={(e) =>
                      setDraftConfig({
                        ...draftConfig,
                        slide1: { ...draftConfig.slide1, beforeCaption: e.target.value },
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-white/10 border border-white/15 text-white outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10.5px] font-bold text-emerald-300 mb-1">
                    Badge Après
                  </label>
                  <input
                    type="text"
                    value={draftConfig.slide1.afterBadge}
                    onChange={(e) =>
                      setDraftConfig({
                        ...draftConfig,
                        slide1: { ...draftConfig.slide1, afterBadge: e.target.value },
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-white/10 border border-white/15 text-white outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10.5px] font-bold text-emerald-300 mb-1">
                    Exemple Code-barres
                  </label>
                  <input
                    type="text"
                    value={draftConfig.slide1.afterBarcodeSample}
                    onChange={(e) =>
                      setDraftConfig({
                        ...draftConfig,
                        slide1: { ...draftConfig.slide1, afterBarcodeSample: e.target.value },
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-white/10 border border-white/15 text-white font-mono outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10.5px] font-bold text-emerald-300 mb-1">
                    Légende Après
                  </label>
                  <input
                    type="text"
                    value={draftConfig.slide1.afterCaption}
                    onChange={(e) =>
                      setDraftConfig({
                        ...draftConfig,
                        slide1: { ...draftConfig.slide1, afterCaption: e.target.value },
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-white/10 border border-white/15 text-white outline-none"
                  />
                </div>
                <div className="sm:col-span-2 lg:col-span-3">
                  <label className="block text-[10.5px] font-bold text-amber-300 mb-1">
                    Bandeau inférieur (Floating Pill)
                  </label>
                  <input
                    type="text"
                    value={draftConfig.slide1.floatingPillText}
                    onChange={(e) =>
                      setDraftConfig({
                        ...draftConfig,
                        slide1: { ...draftConfig.slide1, floatingPillText: e.target.value },
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-white/10 border border-white/15 text-white outline-none"
                  />
                </div>
              </div>
            )}

            {currentSlide === 1 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-3 border-t border-white/10">
                <div className="sm:col-span-2">
                  <label className="block text-[10.5px] font-bold text-sky-300 mb-1">
                    URL Image Fiche Produit
                  </label>
                  <input
                    type="text"
                    value={draftConfig.slide2.showcaseImageUrl}
                    onChange={(e) =>
                      setDraftConfig({
                        ...draftConfig,
                        slide2: { ...draftConfig.slide2, showcaseImageUrl: e.target.value },
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-white/10 border border-white/15 text-white font-mono outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10.5px] font-bold text-sky-300 mb-1">
                    Repère 1 — Titre
                  </label>
                  <input
                    type="text"
                    value={draftConfig.slide2.repere1Title}
                    onChange={(e) =>
                      setDraftConfig({
                        ...draftConfig,
                        slide2: { ...draftConfig.slide2, repere1Title: e.target.value },
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-white/10 border border-white/15 text-white outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10.5px] font-bold text-sky-300 mb-1">
                    Repère 1 — Texte
                  </label>
                  <input
                    type="text"
                    value={draftConfig.slide2.repere1Text}
                    onChange={(e) =>
                      setDraftConfig({
                        ...draftConfig,
                        slide2: { ...draftConfig.slide2, repere1Text: e.target.value },
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-white/10 border border-white/15 text-white outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10.5px] font-bold text-emerald-300 mb-1">
                    Repère 2 — Titre
                  </label>
                  <input
                    type="text"
                    value={draftConfig.slide2.repere2Title}
                    onChange={(e) =>
                      setDraftConfig({
                        ...draftConfig,
                        slide2: { ...draftConfig.slide2, repere2Title: e.target.value },
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-white/10 border border-white/15 text-white outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10.5px] font-bold text-emerald-300 mb-1">
                    Repère 2 — Texte
                  </label>
                  <input
                    type="text"
                    value={draftConfig.slide2.repere2Text}
                    onChange={(e) =>
                      setDraftConfig({
                        ...draftConfig,
                        slide2: { ...draftConfig.slide2, repere2Text: e.target.value },
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-white/10 border border-white/15 text-white outline-none"
                  />
                </div>
              </div>
            )}

            {currentSlide === 2 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-3 border-t border-white/10">
                <div>
                  <label className="block text-[10.5px] font-bold text-amber-300 mb-1">
                    Carte 1 — Titre (Astuces)
                  </label>
                  <input
                    type="text"
                    value={draftConfig.slide3.card1Title}
                    onChange={(e) =>
                      setDraftConfig({
                        ...draftConfig,
                        slide3: { ...draftConfig.slide3, card1Title: e.target.value },
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-white/10 border border-white/15 text-white outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10.5px] font-bold text-amber-300 mb-1">
                    Carte 1 — Description
                  </label>
                  <input
                    type="text"
                    value={draftConfig.slide3.card1Subtitle}
                    onChange={(e) =>
                      setDraftConfig({
                        ...draftConfig,
                        slide3: { ...draftConfig.slide3, card1Subtitle: e.target.value },
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-white/10 border border-white/15 text-white outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10.5px] font-bold text-emerald-300 mb-1">
                    Carte 2 — Titre (WhatsApp)
                  </label>
                  <input
                    type="text"
                    value={draftConfig.slide3.card2Title}
                    onChange={(e) =>
                      setDraftConfig({
                        ...draftConfig,
                        slide3: { ...draftConfig.slide3, card2Title: e.target.value },
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-white/10 border border-white/15 text-white outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10.5px] font-bold text-emerald-300 mb-1">
                    Carte 2 — Sous-titre
                  </label>
                  <input
                    type="text"
                    value={draftConfig.slide3.card2Subtitle}
                    onChange={(e) =>
                      setDraftConfig({
                        ...draftConfig,
                        slide3: { ...draftConfig.slide3, card2Subtitle: e.target.value },
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-white/10 border border-white/15 text-white outline-none"
                  />
                </div>
              </div>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          {/* LEFT / MAIN STAGE (7 cols on lg) */}
          <div className="lg:col-span-7 flex flex-col justify-center">
            {/* SLIDE 1 : Diagonal Split Showcase */}
            {currentSlide === 0 && (
              <div className="space-y-5 animate-in fade-in slide-in-from-right-3 duration-200">
                <div className="space-y-2">
                  <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-white leading-[1.08]">
                    {activeStep.headlineLine1}
                    <span className="block text-rose-400">{activeStep.headlineLine2}</span>
                  </h2>
                  <p className="text-sm sm:text-base text-white/75 leading-relaxed max-w-xl">
                    {activeStep.description}
                  </p>
                </div>

                {/* Diagonal Split Visual Card */}
                <div className="relative rounded-[26px] overflow-hidden border border-white/20 bg-black/45 backdrop-blur-xl shadow-2xl min-h-[270px] sm:min-h-[320px] flex flex-col justify-between p-4 sm:p-6">
                  <div className="grid grid-cols-2 gap-3.5 relative z-10 items-stretch">
                    {/* Left Side: Before (Balance Ticket Failure) */}
                    <div className="rounded-[18px] bg-gradient-to-br from-rose-950/85 to-slate-950/85 border border-rose-500/35 p-3 sm:p-4 flex flex-col items-center text-center justify-between backdrop-blur-md">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-500/20 border border-rose-400/40 text-rose-200 text-[10px] font-black">
                        <AlertTriangle className="w-3 h-3 text-rose-400" />
                        <span>{activeConfig.slide1.beforeBadge}</span>
                      </span>

                      <div className="my-2.5 w-full h-28 sm:h-36 rounded-xl bg-white p-2 shadow-inner flex items-center justify-center overflow-hidden">
                        <img
                          src={activeConfig.slide1.beforeImageUrl}
                          alt="Ticket Balance Marjane"
                          className="w-full h-full object-contain"
                        />
                      </div>

                      <p className="text-[11px] font-bold text-rose-200 leading-tight">
                        {activeConfig.slide1.beforeCaption}
                      </p>
                    </div>

                    {/* Right Side: After (Livry Finder Exact Code) */}
                    <div className="rounded-[18px] bg-gradient-to-br from-[#0759A4]/60 to-emerald-950/80 border border-emerald-400/40 p-3 sm:p-4 flex flex-col items-center text-center justify-between backdrop-blur-md">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/25 border border-emerald-400/45 text-emerald-200 text-[10px] font-black">
                        <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                        <span>{activeConfig.slide1.afterBadge}</span>
                      </span>

                      <div className="my-2.5 w-full h-28 sm:h-36 rounded-xl bg-white p-2.5 shadow-inner flex flex-col items-center justify-center gap-1.5">
                        <Barcode className="w-16 h-14 text-slate-900 stroke-[1.6]" />
                        <span className="font-mono text-[11px] font-black text-[#0759A4] tracking-wider">
                          {activeConfig.slide1.afterBarcodeSample}
                        </span>
                      </div>

                      <p className="text-[11px] font-bold text-emerald-200 leading-tight">
                        {activeConfig.slide1.afterCaption}
                      </p>
                    </div>
                  </div>

                  {/* Signature Diagonal Glowing Magenta/Rose Divider */}
                  <svg
                    className="pointer-events-none absolute inset-0 w-full h-full z-20"
                    viewBox="0 0 100 100"
                    preserveAspectRatio="none"
                    aria-hidden="true"
                  >
                    <defs>
                      <linearGradient id="guideDiagonalSlash" x1="0%" y1="100%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#E11D48" stopOpacity="0.9" />
                        <stop offset="50%" stopColor="#EC4899" stopOpacity="1" />
                        <stop offset="100%" stopColor="#F43F5E" stopOpacity="0.85" />
                      </linearGradient>
                    </defs>
                    <line
                      x1="34"
                      y1="100"
                      x2="66"
                      y2="0"
                      stroke="url(#guideDiagonalSlash)"
                      strokeWidth="1.2"
                    />
                  </svg>

                  {/* Floating Frosted Pill at Bottom */}
                  <div className="relative z-30 mt-3.5 flex justify-center">
                    <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/15 backdrop-blur-md border border-white/25 text-[11px] font-bold text-white shadow-lg">
                      <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                      <span>{activeConfig.slide1.floatingPillText}</span>
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* SLIDE 2 : Fiche Produit Marjane */}
            {currentSlide === 1 && (
              <div className="space-y-5 animate-in fade-in slide-in-from-right-3 duration-200">
                <div className="space-y-2">
                  <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-white leading-[1.08]">
                    {activeStep.headlineLine1}
                    <span className="block text-sky-300">{activeStep.headlineLine2}</span>
                  </h2>
                  <p className="text-sm sm:text-base text-white/75 leading-relaxed max-w-xl">
                    {activeStep.description}
                  </p>
                </div>

                {/* Frosted Glass Showcase Card for Annotated Image */}
                <div className="rounded-[26px] bg-white/[0.08] backdrop-blur-xl border border-white/20 p-4 shadow-2xl space-y-3.5">
                  <div className="rounded-[18px] overflow-hidden bg-white p-2 shadow-inner flex items-center justify-center max-h-[240px]">
                    <img
                      src={activeConfig.slide2.showcaseImageUrl}
                      alt="Fiche Produit Marjane"
                      className="w-full max-h-[220px] object-contain"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {/* Repère 1 */}
                    <div className="rounded-[16px] bg-white/[0.08] border border-white/15 p-3 flex items-start gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-[#0759A4] text-white font-black text-xs flex items-center justify-center shrink-0">
                        1
                      </div>
                      <div className="text-xs leading-snug text-white/85">
                        <span className="font-black text-white block mb-0.5">
                          {activeConfig.slide2.repere1Title}
                        </span>
                        <span>{activeConfig.slide2.repere1Text}</span>
                      </div>
                    </div>

                    {/* Repère 2 */}
                    <div className="rounded-[16px] bg-white/[0.08] border border-white/15 p-3 flex items-start gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-emerald-500 text-white font-black text-xs flex items-center justify-center shrink-0">
                        2
                      </div>
                      <div className="text-xs leading-snug text-white/85">
                        <span className="font-black text-white block mb-0.5 flex items-center gap-1">
                          <Scale className="w-3.5 h-3.5 text-emerald-300" />
                          <span>{activeConfig.slide2.repere2Title}</span>
                        </span>
                        <span>{activeConfig.slide2.repere2Text}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* SLIDE 3 : Astuces & WhatsApp Direct */}
            {currentSlide === 2 && (
              <div className="space-y-5 animate-in fade-in slide-in-from-right-3 duration-200">
                <div className="space-y-2">
                  <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-white leading-[1.08]">
                    {activeStep.headlineLine1}
                    <span className="block text-amber-300">{activeStep.headlineLine2}</span>
                  </h2>
                  <p className="text-sm sm:text-base text-white/75 leading-relaxed max-w-xl">
                    {activeStep.description}
                  </p>
                </div>

                <div className="space-y-3">
                  {/* Card 1: Astuces */}
                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic('medium');
                      markAsSeen();
                      onClose();
                      if (onOpenTips) onOpenTips();
                    }}
                    className="w-full text-left rounded-[22px] bg-white/[0.09] hover:bg-white/[0.15] backdrop-blur-xl border border-amber-400/35 p-4 flex items-center gap-3.5 transition cursor-pointer group active:scale-[0.99]"
                  >
                    <div className="w-12 h-12 rounded-[16px] bg-amber-500/20 border border-amber-400/40 text-amber-300 flex items-center justify-center shrink-0">
                      <Lightbulb className="w-6 h-6" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm sm:text-base font-black text-white flex items-center gap-1.5">
                        <span>{activeConfig.slide3.card1Title}</span>
                        <ArrowRight className="w-4 h-4 text-amber-300 group-hover:translate-x-1 transition-transform" />
                      </h4>
                      <p className="text-xs text-white/75 mt-0.5 leading-snug">
                        {activeConfig.slide3.card1Subtitle}
                      </p>
                    </div>
                  </button>

                  {/* Card 2: WhatsApp Direct */}
                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic('medium');
                      const url = `https://wa.me/${WHATSAPP_PHONE_NUMBER}?text=${encodeURIComponent("BONJOUR J'AI BESOIN D'AIDE SUR LIVRY FINDER :")}`;
                      openWhatsApp(url);
                    }}
                    className="w-full text-left rounded-[22px] bg-emerald-500/15 hover:bg-emerald-500/25 backdrop-blur-xl border border-emerald-400/40 p-4 flex items-center gap-3.5 transition cursor-pointer group active:scale-[0.99]"
                  >
                    <div className="w-12 h-12 rounded-[16px] bg-[#25D366] text-white flex items-center justify-center shrink-0 shadow-lg shadow-emerald-900/30">
                      <WhatsAppIcon className="w-6 h-6 fill-current" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm sm:text-base font-black text-white flex items-center gap-1.5">
                        <span>{activeConfig.slide3.card2Title}</span>
                        <ArrowRight className="w-4 h-4 text-emerald-300 group-hover:translate-x-1 transition-transform" />
                      </h4>
                      <p className="text-xs text-emerald-200/95 mt-0.5 font-mono font-bold tabular-nums">
                        {activeConfig.slide3.card2PhoneDisplay} · {activeConfig.slide3.card2Subtitle}
                      </p>
                    </div>
                  </button>
                </div>
              </div>
            )}

            {/* Primary White Button & Secondary Glass Outline Button */}
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={handleNext}
                className="px-6 py-3 rounded-xl bg-white hover:bg-white/90 text-slate-950 font-black text-xs sm:text-sm shadow-[0_8px_28px_rgba(255,255,255,0.22)] active:scale-95 transition cursor-pointer flex items-center gap-2"
              >
                {currentSlide < totalSlides - 1 ? (
                  <>
                    <span>{activeStep.primaryCtaLabel}</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                ) : (
                  <>
                    <span>{activeStep.primaryCtaLabel}</span>
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  </>
                )}
              </button>

              {currentSlide > 0 ? (
                <button
                  type="button"
                  onClick={handlePrev}
                  className="px-5 py-3 rounded-xl bg-white/10 hover:bg-white/18 backdrop-blur-md border border-white/25 text-white font-bold text-xs sm:text-sm active:scale-95 transition cursor-pointer flex items-center gap-1.5"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>{activeStep.secondaryCtaLabel || 'Précédent'}</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic('light');
                    markAsSeen();
                    onClose();
                    if (onOpenTips) onOpenTips();
                  }}
                  className="px-5 py-3 rounded-xl bg-amber-400/25 hover:bg-amber-400/35 backdrop-blur-md border border-amber-300/40 text-white font-bold text-xs sm:text-sm active:scale-95 transition cursor-pointer flex items-center gap-1.5"
                >
                  <Play className="w-3 h-3 fill-white" />
                  <span>{activeStep.secondaryCtaLabel || "Chouf l'Astuces"}</span>
                </button>
              )}
            </div>
          </div>

          {/* RIGHT INTERACTIVE WORKFLOW SELECTOR RAIL (Desktop) */}
          <div className="hidden lg:flex lg:col-span-5 flex-col justify-center pl-8 border-l border-white/15 space-y-4">
            <span className="text-[11px] font-black uppercase tracking-[0.22em] text-white/45 px-2">
              Sommaire du Guide
            </span>

            <div className="flex flex-col space-y-2.5">
              {activeConfig.steps.map((step) => {
                const isActive = currentSlide === step.id;
                return (
                  <button
                    key={step.id}
                    type="button"
                    onClick={() => {
                      triggerHaptic('light');
                      setCurrentSlide(step.id);
                    }}
                    className={`group flex items-center gap-3.5 text-left py-3 px-4 rounded-2xl transition-all cursor-pointer ${
                      isActive
                        ? 'bg-white/[0.1] backdrop-blur-md border border-white/20 shadow-xl'
                        : 'hover:bg-white/[0.05] border border-transparent'
                    }`}
                  >
                    <span
                      className={`transition-all duration-200 flex items-center justify-center w-4 shrink-0 ${
                        isActive ? 'opacity-100 scale-100' : 'opacity-0 scale-75 group-hover:opacity-45'
                      }`}
                    >
                      <Play className="w-3.5 h-3.5 text-rose-500 fill-rose-500" />
                    </span>
                    <span
                      className={`text-xl xl:text-2xl tracking-tight transition-colors ${
                        isActive
                          ? 'text-white font-black'
                          : 'text-white/40 group-hover:text-white/80 font-bold'
                      }`}
                    >
                      {step.shortLabel}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="pt-4 px-3">
              <p className="text-xs text-white/50 font-medium">{activeConfig.footerHint}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

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
  Plus,
  Trash2,
  Camera,
  ChevronLeft,
  ChevronRight,
  Type as TypeIcon,
  Image as ImageIcon,
  FileText,
  ArrowUp,
  ArrowDown,
  Palette,
  Layout,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Copy,
} from 'lucide-react';
import { triggerHaptic } from '../utils/haptics';
import { WHATSAPP_PHONE_NUMBER, WhatsAppIcon, openWhatsApp } from './SuggestOneScreen';
import { useApp } from '../context/AppContext';
import { GuideConfig, GuideStepConfig, TipArticleBlock } from '../types';
import { sanitizeImageUrl } from '../utils/securityUtils';
import { compressImageFileToDataUrl } from '../utils/imageCompress';

export const TUTORIAL_STORAGE_KEY = 'livry_finder_tutorial_seen_v1';

interface AppTutorialModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenSuggest?: () => void;
  onOpenTips?: () => void;
  initialSlide?: number;
  defaultEditMode?: boolean;
}

const ACCENT_TEXT_CLASSES: Record<NonNullable<GuideStepConfig['accentColor']>, string> = {
  rose: 'text-rose-400',
  sky: 'text-sky-300',
  amber: 'text-amber-300',
  emerald: 'text-emerald-300',
};

const GUIDE_THEME_GRADIENTS: Record<NonNullable<GuideConfig['themePreset']>, string> = {
  'rose-blue':
    'radial-gradient(ellipse 80% 70% at 45% 40%, rgba(168, 22, 68, 0.48) 0%, rgba(7, 89, 164, 0.32) 48%, rgba(7, 10, 20, 0.99) 100%)',
  ocean:
    'radial-gradient(ellipse 80% 70% at 45% 35%, rgba(7, 89, 164, 0.62) 0%, rgba(14, 116, 144, 0.34) 50%, rgba(6, 11, 24, 0.99) 100%)',
  emerald:
    'radial-gradient(ellipse 80% 70% at 45% 35%, rgba(16, 185, 129, 0.36) 0%, rgba(7, 89, 164, 0.32) 50%, rgba(6, 15, 20, 0.99) 100%)',
  amber:
    'radial-gradient(ellipse 80% 70% at 45% 35%, rgba(217, 119, 6, 0.42) 0%, rgba(124, 45, 18, 0.32) 50%, rgba(10, 10, 18, 0.99) 100%)',
  midnight:
    'radial-gradient(ellipse 80% 70% at 45% 35%, rgba(51, 65, 85, 0.45) 0%, rgba(15, 23, 42, 0.85) 55%, rgba(3, 7, 18, 1) 100%)',
};

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
  const [editorTab, setEditorTab] = useState<'step' | 'style' | 'blocks' | 'global'>('step');
  const [draftConfig, setDraftConfig] = useState<GuideConfig>(guideConfig);
  const [isSavingGuide, setIsSavingGuide] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [uploadingTarget, setUploadingTarget] = useState<string | null>(null);

  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [touchEndX, setTouchEndX] = useState<number | null>(null);
  const [mouseStartX, setMouseStartX] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const wasOpenRef = useRef(false);

  const activeConfig = isEditingGuide ? draftConfig : guideConfig;
  const totalSlides = Math.max(1, activeConfig.steps.length);
  const safeSlideIndex = Math.max(0, Math.min(totalSlides - 1, currentSlide));
  const activeStep = activeConfig.steps[safeSlideIndex] || activeConfig.steps[0];

  // Only initialize draft & slide when transitioning closed -> open (never wipe active edits mid-session!)
  useEffect(() => {
    if (isOpen && !wasOpenRef.current) {
      wasOpenRef.current = true;
      const count = Math.max(1, guideConfig.steps.length);
      setCurrentSlide(Math.max(0, Math.min(count - 1, initialSlide)));
      setDraftConfig(guideConfig);
      setIsEditingGuide(role === 'Admin' && defaultEditMode);
      setConfirmReset(false);
      document.body.style.overflow = 'hidden';
    } else if (!isOpen && wasOpenRef.current) {
      wasOpenRef.current = false;
      document.body.style.overflow = '';
      setIsEditingGuide(false);
      setConfirmReset(false);
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen, initialSlide, defaultEditMode, role, guideConfig]);

  useEffect(() => {
    if (currentSlide >= totalSlides) {
      setCurrentSlide(Math.max(0, totalSlides - 1));
    }
  }, [currentSlide, totalSlides]);

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
        setCurrentSlide((prev) => (prev < totalSlides - 1 ? prev + 1 : prev));
      } else if (e.key === 'ArrowLeft') {
        setCurrentSlide((prev) => (prev > 0 ? prev - 1 : prev));
      } else if (e.key === 'Escape') {
        try {
          localStorage.setItem(TUTORIAL_STORAGE_KEY, 'true');
        } catch {}
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isEditingGuide, totalSlides, onClose]);

  if (!isOpen) return null;

  const markAsSeen = () => {
    try {
      localStorage.setItem(TUTORIAL_STORAGE_KEY, 'true');
    } catch {}
  };

  const handleClose = () => {
    triggerHaptic('light');
    markAsSeen();
    onClose();
  };

  const handleNext = () => {
    triggerHaptic('light');
    if (safeSlideIndex < totalSlides - 1) {
      setCurrentSlide(safeSlideIndex + 1);
    } else {
      markAsSeen();
      onClose();
    }
  };

  const handlePrev = () => {
    triggerHaptic('light');
    if (safeSlideIndex > 0) {
      setCurrentSlide(safeSlideIndex - 1);
    }
  };

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
    if (distance > 45 && safeSlideIndex < totalSlides - 1) {
      setCurrentSlide(safeSlideIndex + 1);
    } else if (distance < -45 && safeSlideIndex > 0) {
      setCurrentSlide(safeSlideIndex - 1);
    }
  };

  const onMouseDown = (e: React.MouseEvent) => {
    if (isEditingGuide) return;
    setMouseStartX(e.clientX);
  };
  const onMouseUp = (e: React.MouseEvent) => {
    if (isEditingGuide || mouseStartX === null) return;
    const distance = mouseStartX - e.clientX;
    if (distance > 55 && safeSlideIndex < totalSlides - 1) {
      setCurrentSlide(safeSlideIndex + 1);
    } else if (distance < -55 && safeSlideIndex > 0) {
      setCurrentSlide(safeSlideIndex - 1);
    }
    setMouseStartX(null);
  };

  const handleUpdateStepField = <K extends keyof GuideStepConfig>(
    stepIndex: number,
    field: K,
    value: GuideStepConfig[K]
  ) => {
    setDraftConfig((prev) => {
      const nextSteps = prev.steps.map((s, idx) =>
        idx === stepIndex ? { ...s, [field]: value } : s
      );
      return { ...prev, steps: nextSteps };
    });
  };

  const handleAddStep = () => {
    if (draftConfig.steps.length >= 15) {
      showToast('Maximum 15 étapes autorisées.');
      return;
    }
    triggerHaptic('light');
    const nextIdx = draftConfig.steps.length;
    const newStep: GuideStepConfig = {
      id: nextIdx,
      shortLabel: `Nouvelle étape ${nextIdx + 1}`,
      badge: `Étape ${String(nextIdx + 1).padStart(2, '0')} · Astuce`,
      headlineLine1: 'Nouveau Titre',
      headlineLine2: 'Sous-titre clair',
      description: 'Expliquez ici l’astuce ou la procédure pour les Pickeurs.',
      primaryCtaLabel: 'Étape Suivante',
      secondaryCtaLabel: 'Précédent',
      layoutKind: 'free',
      accentColor: 'emerald',
      customBlocks: [],
    };
    setDraftConfig((prev) => ({
      ...prev,
      steps: [...prev.steps, newStep],
    }));
    setCurrentSlide(nextIdx);
  };

  const handleMoveStep = (index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= draftConfig.steps.length) return;
    triggerHaptic('light');
    setDraftConfig((prev) => {
      const arr = [...prev.steps];
      const [item] = arr.splice(index, 1);
      arr.splice(target, 0, item);
      const reindexed = arr.map((s, idx) => ({ ...s, id: idx }));
      return { ...prev, steps: reindexed };
    });
    setCurrentSlide(target);
  };

  const handleDeleteStep = (index: number) => {
    if (draftConfig.steps.length <= 1) {
      showToast('Le guide doit contenir au moins 1 étape.');
      return;
    }
    triggerHaptic('warning');
    setDraftConfig((prev) => {
      const filtered = prev.steps.filter((_, i) => i !== index);
      const reindexed = filtered.map((s, idx) => ({ ...s, id: idx }));
      return { ...prev, steps: reindexed };
    });
    setCurrentSlide(Math.max(0, Math.min(index, draftConfig.steps.length - 2)));
  };

  const handleUploadImage = async (
    file: File,
    targetKey: string,
    onDone: (dataUrl: string) => void
  ) => {
    setUploadingTarget(targetKey);
    try {
      const compressed = await compressImageFileToDataUrl(file, 960, 0.8);
      onDone(compressed);
      triggerHaptic('success');
      showToast('📸 Image importée et optimisée !');
    } catch (err: any) {
      showToast(`⚠️ Erreur image : ${err?.message || 'format non supporté'}`);
    } finally {
      setUploadingTarget(null);
    }
  };

  // Extra custom content blocks inside any step
  const stepBlocks = draftConfig.steps[safeSlideIndex]?.customBlocks || [];

  const handleAddStepBlock = (type: TipArticleBlock['type']) => {
    triggerHaptic('light');
    const newBlock: TipArticleBlock = {
      id: `gblk-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      type,
      heading: type === 'image' ? '' : 'Titre de section',
      text: type === 'image' ? '' : 'Votre texte explicatif ici...',
      imageUrl: '',
      caption: '',
    };
    handleUpdateStepField(safeSlideIndex, 'customBlocks', [...stepBlocks, newBlock]);
  };

  const handleUpdateStepBlock = (
    blockIdx: number,
    patch: Partial<TipArticleBlock>
  ) => {
    const next = stepBlocks.map((b, i) => (i === blockIdx ? { ...b, ...patch } : b));
    handleUpdateStepField(safeSlideIndex, 'customBlocks', next);
  };

  const handleMoveStepBlock = (blockIdx: number, dir: -1 | 1) => {
    const target = blockIdx + dir;
    if (target < 0 || target >= stepBlocks.length) return;
    const next = [...stepBlocks];
    const [moved] = next.splice(blockIdx, 1);
    next.splice(target, 0, moved);
    handleUpdateStepField(safeSlideIndex, 'customBlocks', next);
  };

  const handleDeleteStepBlock = (blockIdx: number) => {
    const next = stepBlocks.filter((_, i) => i !== blockIdx);
    handleUpdateStepField(safeSlideIndex, 'customBlocks', next);
  };

  const handleSaveGuide = async () => {
    triggerHaptic('medium');
    setIsSavingGuide(true);
    try {
      const sanitizedDraft: GuideConfig = {
        ...draftConfig,
        globalBgImageUrl: draftConfig.globalBgImageUrl
          ? sanitizeImageUrl(draftConfig.globalBgImageUrl)
          : undefined,
        steps: draftConfig.steps.map((s, idx) => ({
          ...s,
          id: idx,
          customImageUrl: s.customImageUrl ? sanitizeImageUrl(s.customImageUrl) : undefined,
          backgroundImageUrl: s.backgroundImageUrl
            ? sanitizeImageUrl(s.backgroundImageUrl)
            : undefined,
          customBlocks: (s.customBlocks || []).map((b) => ({
            ...b,
            imageUrl: b.imageUrl ? sanitizeImageUrl(b.imageUrl) : undefined,
          })),
        })),
        slide1: {
          ...draftConfig.slide1,
          beforeImageUrl:
            sanitizeImageUrl(draftConfig.slide1.beforeImageUrl) ||
            guideConfig.slide1.beforeImageUrl,
          afterImageUrl: draftConfig.slide1.afterImageUrl
            ? sanitizeImageUrl(draftConfig.slide1.afterImageUrl) || ''
            : '',
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
        showToast('✅ Guide mis à jour & sauvegardé sur Supabase !');
      } else {
        triggerHaptic('warning');
        showToast(`⚠️ Sauvegarde locale effectuée (${res.error || 'Cloud indisponible'})`);
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
      setCurrentSlide(0);
      setIsEditingGuide(false);
      showToast('🔄 Guide réinitialisé par défaut');
    } finally {
      setIsSavingGuide(false);
    }
  };

  const stepLayout =
    activeStep.layoutKind ||
    (safeSlideIndex === 0
      ? 'comparison'
      : safeSlideIndex === 1
        ? 'showcase'
        : safeSlideIndex === 2
          ? 'actions'
          : 'free');

  const accentClass =
    ACCENT_TEXT_CLASSES[activeStep.accentColor || (safeSlideIndex === 0 ? 'rose' : safeSlideIndex === 1 ? 'sky' : safeSlideIndex === 2 ? 'amber' : 'emerald')];

  const draftCurrentStep = draftConfig.steps[safeSlideIndex] || draftConfig.steps[0];
  const draftStepLayout =
    draftCurrentStep.layoutKind ||
    (safeSlideIndex === 0
      ? 'comparison'
      : safeSlideIndex === 1
        ? 'showcase'
        : safeSlideIndex === 2
          ? 'actions'
          : 'free');

  const handleApplyStepStyleToAll = () => {
    triggerHaptic('medium');
    const src = draftCurrentStep;
    setDraftConfig((prev) => ({
      ...prev,
      steps: prev.steps.map((st) => ({
        ...st,
        backgroundType: src.backgroundType,
        backgroundColor: src.backgroundColor,
        gradientFrom: src.gradientFrom,
        gradientTo: src.gradientTo,
        gradientAngle: src.gradientAngle,
        backgroundImageUrl: src.backgroundImageUrl,
        backgroundOverlayOpacity: src.backgroundOverlayOpacity,
        titleColor: src.titleColor,
        subtitleColor: src.subtitleColor,
        textColor: src.textColor,
        badgeBgColor: src.badgeBgColor,
        badgeTextColor: src.badgeTextColor,
        ctaBgColor: src.ctaBgColor,
        ctaTextColor: src.ctaTextColor,
        secondaryCtaBgColor: src.secondaryCtaBgColor,
        secondaryCtaTextColor: src.secondaryCtaTextColor,
        cardBgColor: src.cardBgColor,
        mediaPosition: src.mediaPosition,
        textAlign: src.textAlign,
        contentVerticalAlign: src.contentVerticalAlign,
        headlineSize: src.headlineSize,
        imageSize: src.imageSize,
        imageFit: src.imageFit,
        imageRounded: src.imageRounded,
      })),
    }));
    showToast('🎨 Style appliqué à toutes les étapes du Guide !');
  };

  // Resolve active full-page background (Step override > Global override > Theme preset)
  const effectiveBgType =
    activeStep.backgroundType && activeStep.backgroundType !== 'theme'
      ? activeStep.backgroundType
      : activeConfig.globalBgType || 'theme';

  const resolvedBgStyle: React.CSSProperties = (() => {
    if (activeStep.backgroundType && activeStep.backgroundType !== 'theme') {
      if (activeStep.backgroundType === 'solid') {
        return { background: activeStep.backgroundColor || '#0f172a' };
      }
      if (activeStep.backgroundType === 'gradient') {
        const angle = activeStep.gradientAngle ?? 135;
        const from = activeStep.gradientFrom || '#0759A4';
        const to = activeStep.gradientTo || '#0f172a';
        return { background: `linear-gradient(${angle}deg, ${from}, ${to})` };
      }
      if (activeStep.backgroundType === 'image') {
        return { background: activeStep.backgroundColor || '#090d16' };
      }
    }
    if (activeConfig.globalBgType && activeConfig.globalBgType !== 'theme') {
      if (activeConfig.globalBgType === 'solid') {
        return { background: activeConfig.globalBgColor || '#0f172a' };
      }
      if (activeConfig.globalBgType === 'gradient') {
        const angle = activeConfig.globalGradientAngle ?? 135;
        const from = activeConfig.globalGradientFrom || '#0759A4';
        const to = activeConfig.globalGradientTo || '#0f172a';
        return { background: `linear-gradient(${angle}deg, ${from}, ${to})` };
      }
      if (activeConfig.globalBgType === 'image') {
        return { background: activeConfig.globalBgColor || '#090d16' };
      }
    }
    return {
      background:
        GUIDE_THEME_GRADIENTS[activeConfig.themePreset || 'rose-blue'] ||
        GUIDE_THEME_GRADIENTS['rose-blue'],
    };
  })();

  const activeBgImageUrl =
    activeStep.backgroundType === 'image'
      ? sanitizeImageUrl(activeStep.backgroundImageUrl)
      : activeStep.backgroundType === 'theme' && activeConfig.globalBgType === 'image'
        ? sanitizeImageUrl(activeConfig.globalBgImageUrl)
        : undefined;

  const activeBgOverlayOpacity =
    activeStep.backgroundType === 'image'
      ? (activeStep.backgroundOverlayOpacity ?? 55) / 100
      : activeConfig.globalBgType === 'image'
        ? (activeConfig.globalOverlayOpacity ?? 50) / 100
        : 0.45;

  const sidebarPos = activeConfig.summarySidebarPosition || 'right';
  const mediaPos = activeStep.mediaPosition || 'bottom';
  const textAlign = activeStep.textAlign || 'left';
  const verticalAlign = activeStep.contentVerticalAlign || 'center';
  const headlineSize = activeStep.headlineSize || 'md';
  const imageSize = activeStep.imageSize || 'md';
  const imageFitClass = activeStep.imageFit === 'cover' ? 'object-cover' : 'object-contain';
  const imageRadiusClass =
    activeStep.imageRounded === 'none'
      ? 'rounded-none'
      : activeStep.imageRounded === 'md'
        ? 'rounded-md'
        : activeStep.imageRounded === '2xl'
          ? 'rounded-2xl'
          : 'rounded-xl';

  const imgBoxMaxHeightClass =
    imageSize === 'sm'
      ? 'max-h-36 sm:max-h-40'
      : imageSize === 'lg'
        ? 'max-h-72 sm:max-h-80'
        : imageSize === 'xl'
          ? 'max-h-80 sm:max-h-[420px]'
          : 'max-h-52 sm:max-h-60';

  const headlineSizeClass =
    headlineSize === 'sm'
      ? 'text-2xl sm:text-3xl lg:text-4xl'
      : headlineSize === 'lg'
        ? 'text-4xl sm:text-5xl lg:text-6xl'
        : 'text-3xl sm:text-4xl lg:text-5xl';

  const textAlignClass =
    textAlign === 'center' ? 'text-center items-center' : textAlign === 'right' ? 'text-right items-end' : 'text-left items-start';

  const verticalAlignClass =
    verticalAlign === 'top' ? 'justify-start' : verticalAlign === 'bottom' ? 'justify-end' : 'justify-center';

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
      style={resolvedBgStyle}
    >
      {/* Optional Full-Page / Per-Step Background Image */}
      {effectiveBgType === 'image' && activeBgImageUrl && (
        <img
          src={activeBgImageUrl}
          alt=""
          className="pointer-events-none fixed inset-0 w-full h-full object-cover"
          aria-hidden="true"
        />
      )}

      {/* Subtle Full-Page Ambient Overlay / Contrast Scrim */}
      <div
        className="pointer-events-none fixed inset-0"
        style={{
          background:
            effectiveBgType === 'image'
              ? `rgba(5, 8, 18, ${activeBgOverlayOpacity})`
              : 'linear-gradient(to bottom, rgba(255,255,255,0.04), transparent, rgba(0,0,0,0.45))',
        }}
        aria-hidden="true"
      />

      {/* Full-Page Top Navigation Bar */}
      <div
        className="sticky top-0 z-20 flex items-center justify-between px-4 sm:px-8 lg:px-12 py-3.5 border-b border-white/10 backdrop-blur-xl shrink-0 gap-3 flex-wrap"
        style={{
          backgroundColor: activeConfig.headerBgColor || 'rgba(0, 0, 0, 0.3)',
          color: activeConfig.headerTextColor || undefined,
        }}
      >
        <div className="flex items-center gap-2.5 flex-wrap">
          {!activeStep.hideBadge && (
            <div
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full backdrop-blur-md border border-white/20 text-[11px] font-bold"
              style={{
                backgroundColor: activeStep.badgeBgColor || 'rgba(255, 255, 255, 0.12)',
                color: activeStep.badgeTextColor || 'rgba(255, 255, 255, 0.95)',
              }}
            >
              <BookOpen className="w-3.5 h-3.5 text-rose-400" />
              <span>{activeStep.badge}</span>
              <ArrowRight className="w-3 h-3 text-rose-400 hidden xs:inline" />
            </div>
          )}

          <span
            className="hidden md:inline text-xs font-bold"
            style={{ color: activeConfig.headerTextColor || 'rgba(255, 255, 255, 0.65)' }}
          >
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
              title="Modifier le contenu du Guide librement"
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
            {String(safeSlideIndex + 1).padStart(2, '0')} / {String(totalSlides).padStart(2, '0')}
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
        {activeConfig.steps.map((step, idx) => {
          const isActive = safeSlideIndex === idx;
          return (
            <button
              key={`${step.id}-${idx}`}
              type="button"
              onClick={() => {
                triggerHaptic('light');
                setCurrentSlide(idx);
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] transition cursor-pointer shrink-0 ${
                isActive
                  ? 'bg-white/15 border border-white/25 text-white font-black shadow-xs'
                  : 'text-white/50 hover:text-white/80 font-bold'
              }`}
            >
              {isActive && <Play className="w-2.5 h-2.5 text-rose-500 fill-rose-500 shrink-0" />}
              <span>{step.shortLabel}</span>
            </button>
          );
        })}
      </div>

      {/* Main Edge-to-Edge Stage */}
      <div className="relative z-10 flex-1 w-full max-w-7xl mx-auto px-4 sm:px-8 lg:px-12 py-6 sm:py-10 flex flex-col justify-center">
        {/* Admin Full Free Editor Panel */}
        {role === 'Admin' && isEditingGuide && (
          <div className="mb-8 rounded-3xl bg-slate-950/90 backdrop-blur-2xl border border-white/20 p-4 sm:p-6 shadow-2xl space-y-5">
            {/* Header + Save / Reset */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
              <div>
                <h3 className="text-sm sm:text-base font-black text-white flex items-center gap-2">
                  <Edit3 className="w-4 h-4 text-amber-300" />
                  <span>
                    Éditeur Libre du Guide (Étape {String(safeSlideIndex + 1).padStart(2, '0')} /{' '}
                    {String(totalSlides).padStart(2, '0')})
                  </span>
                </h3>
                <p className="text-[11px] text-white/65">
                  Ajoutez/réorganisez les étapes, changez textes, images (upload ou lien) et blocs articles librement — sauvegardé sur Supabase.
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
                  <span>{isSavingGuide ? 'Publication Supabase...' : 'Enregistrer & Publier'}</span>
                </button>
              </div>
            </div>

            {/* Dynamic Steps Management Bar */}
            <div className="flex items-center gap-2 flex-wrap bg-white/[0.04] border border-white/10 p-2.5 rounded-2xl">
              <span className="text-[11px] font-bold text-white/60 px-1">Étapes :</span>
              {draftConfig.steps.map((s, idx) => (
                <div
                  key={`${s.id}-${idx}`}
                  className={`inline-flex items-center rounded-xl overflow-hidden border ${
                    safeSlideIndex === idx
                      ? 'bg-[#0759A4] border-sky-400 text-white'
                      : 'bg-white/10 border-white/15 text-white/75'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => setCurrentSlide(idx)}
                    className="px-2.5 py-1 text-xs font-black cursor-pointer hover:bg-white/10"
                  >
                    0{idx + 1} · {s.shortLabel || 'Étape'}
                  </button>
                  {safeSlideIndex === idx && (
                    <div className="flex items-center border-l border-white/20 bg-black/20">
                      <button
                        type="button"
                        onClick={() => handleMoveStep(idx, -1)}
                        disabled={idx === 0}
                        className="p-1 hover:bg-white/15 disabled:opacity-30 cursor-pointer"
                        title="Déplacer avant"
                      >
                        <ChevronLeft className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMoveStep(idx, 1)}
                        disabled={idx === draftConfig.steps.length - 1}
                        className="p-1 hover:bg-white/15 disabled:opacity-30 cursor-pointer"
                        title="Déplacer après"
                      >
                        <ChevronRight className="w-3 h-3" />
                      </button>
                      {draftConfig.steps.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleDeleteStep(idx)}
                          className="p-1 text-rose-300 hover:bg-rose-600 hover:text-white cursor-pointer"
                          title="Supprimer cette étape"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))}

              <button
                type="button"
                onClick={handleAddStep}
                className="inline-flex items-center gap-1 px-3 py-1 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/35 border border-emerald-400/40 text-emerald-200 text-xs font-black cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Ajouter Étape</span>
              </button>
            </div>

            {/* Editor Mode Tabs (4 comprehensive tabs) */}
            <div className="flex items-center gap-1.5 flex-wrap border-b border-white/10 pb-3">
              <button
                type="button"
                onClick={() => setEditorTab('step')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black cursor-pointer transition ${
                  editorTab === 'step'
                    ? 'bg-white text-slate-950 shadow-sm'
                    : 'bg-white/10 text-white/75 hover:bg-white/15'
                }`}
              >
                <Layout className="w-3.5 h-3.5" />
                <span>1. Contenu, Images &amp; Disposition</span>
              </button>
              <button
                type="button"
                onClick={() => setEditorTab('style')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black cursor-pointer transition ${
                  editorTab === 'style'
                    ? 'bg-white text-slate-950 shadow-sm'
                    : 'bg-white/10 text-white/75 hover:bg-white/15'
                }`}
              >
                <Palette className="w-3.5 h-3.5" />
                <span>2. Couleurs &amp; Fond (Page / Étape)</span>
              </button>
              <button
                type="button"
                onClick={() => setEditorTab('blocks')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black cursor-pointer transition ${
                  editorTab === 'blocks'
                    ? 'bg-white text-slate-950 shadow-sm'
                    : 'bg-white/10 text-white/75 hover:bg-white/15'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>3. Blocs Texte &amp; Photos ({stepBlocks.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setEditorTab('global')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black cursor-pointer transition ${
                  editorTab === 'global'
                    ? 'bg-white text-slate-950 shadow-sm'
                    : 'bg-white/10 text-white/75 hover:bg-white/15'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>4. Page Globale, Barre &amp; Sommaire</span>
              </button>
            </div>

            {/* TAB 1: Step General & Style Fields */}
            {editorTab === 'step' && (
            <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
              <div>
                <label className="block text-[10.5px] font-bold text-white/65 mb-1">
                  Modèle d&apos;affichage de l&apos;étape
                </label>
                <select
                  value={draftStepLayout}
                  onChange={(e) =>
                    handleUpdateStepField(
                      safeSlideIndex,
                      'layoutKind',
                      e.target.value as GuideStepConfig['layoutKind']
                    )
                  }
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/15 text-white outline-none focus:border-sky-400"
                >
                  <option value="comparison">Comparaison Avant / Après</option>
                  <option value="showcase">Image Produit + 2 Repères</option>
                  <option value="actions">Cartes Astuces & WhatsApp</option>
                  <option value="free">Page Libre (Image + Blocs)</option>
                </select>
              </div>

              <div>
                <label className="block text-[10.5px] font-bold text-white/65 mb-1">
                  Couleur d&apos;accent (Sous-titre)
                </label>
                <select
                  value={draftCurrentStep.accentColor || 'rose'}
                  onChange={(e) =>
                    handleUpdateStepField(
                      safeSlideIndex,
                      'accentColor',
                      e.target.value as GuideStepConfig['accentColor']
                    )
                  }
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/15 text-white outline-none focus:border-sky-400"
                >
                  <option value="rose">Rose / Magenta</option>
                  <option value="sky">Bleu Ciel</option>
                  <option value="amber">Ambre / Or</option>
                  <option value="emerald">Émeraude / Vert</option>
                </select>
              </div>

              <div>
                <label className="block text-[10.5px] font-bold text-white/65 mb-1">
                  Badge de l&apos;étape
                </label>
                <input
                  type="text"
                  value={draftCurrentStep.badge}
                  onChange={(e) => handleUpdateStepField(safeSlideIndex, 'badge', e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white/10 border border-white/15 text-white outline-none focus:border-sky-400"
                />
              </div>

              <div>
                <label className="block text-[10.5px] font-bold text-white/65 mb-1">
                  Nom court dans le Sommaire
                </label>
                <input
                  type="text"
                  value={draftCurrentStep.shortLabel}
                  onChange={(e) =>
                    handleUpdateStepField(safeSlideIndex, 'shortLabel', e.target.value)
                  }
                  className="w-full px-3 py-2 rounded-xl bg-white/10 border border-white/15 text-white outline-none focus:border-sky-400"
                />
              </div>

              <div>
                <label className="block text-[10.5px] font-bold text-white/65 mb-1">
                  Grand Titre (Ligne 1)
                </label>
                <input
                  type="text"
                  value={draftCurrentStep.headlineLine1}
                  onChange={(e) =>
                    handleUpdateStepField(safeSlideIndex, 'headlineLine1', e.target.value)
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
                  value={draftCurrentStep.headlineLine2}
                  onChange={(e) =>
                    handleUpdateStepField(safeSlideIndex, 'headlineLine2', e.target.value)
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
                  value={draftCurrentStep.primaryCtaLabel}
                  onChange={(e) =>
                    handleUpdateStepField(safeSlideIndex, 'primaryCtaLabel', e.target.value)
                  }
                  className="w-full px-3 py-2 rounded-xl bg-white/10 border border-white/15 text-white outline-none focus:border-sky-400"
                />
              </div>

              <div>
                <label className="block text-[10.5px] font-bold text-white/65 mb-1">
                  Bouton Secondaire
                </label>
                <input
                  type="text"
                  value={draftCurrentStep.secondaryCtaLabel}
                  onChange={(e) =>
                    handleUpdateStepField(safeSlideIndex, 'secondaryCtaLabel', e.target.value)
                  }
                  className="w-full px-3 py-2 rounded-xl bg-white/10 border border-white/15 text-white outline-none focus:border-sky-400"
                />
              </div>

              <div className="sm:col-span-2 lg:col-span-4">
                <label className="block text-[10.5px] font-bold text-white/65 mb-1">
                  Description de l&apos;étape
                </label>
                <textarea
                  rows={2}
                  value={draftCurrentStep.description}
                  onChange={(e) =>
                    handleUpdateStepField(safeSlideIndex, 'description', e.target.value)
                  }
                  className="w-full px-3 py-2 rounded-xl bg-white/10 border border-white/15 text-white outline-none focus:border-sky-400"
                />
              </div>

              {/* Placement, Alignment & Image Geometry Controls */}
              <div className="sm:col-span-2 lg:col-span-4 pt-3 border-t border-white/10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div>
                  <label className="block text-[10.5px] font-bold text-sky-300 mb-1">
                    Position de l&apos;image / visuel
                  </label>
                  <select
                    value={draftCurrentStep.mediaPosition || 'bottom'}
                    onChange={(e) =>
                      handleUpdateStepField(
                        safeSlideIndex,
                        'mediaPosition',
                        e.target.value as GuideStepConfig['mediaPosition']
                      )
                    }
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/15 text-white outline-none focus:border-sky-400"
                  >
                    <option value="bottom">En dessous du texte (Classique)</option>
                    <option value="top">Au-dessus du texte</option>
                    <option value="left">À gauche du texte</option>
                    <option value="right">À droite du texte</option>
                    <option value="hidden">Masquer le visuel principal</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10.5px] font-bold text-sky-300 mb-1">
                    Alignement du texte &amp; boutons
                  </label>
                  <div className="grid grid-cols-3 gap-1">
                    {(
                      [
                        { id: 'left', icon: AlignLeft, label: 'Gauche' },
                        { id: 'center', icon: AlignCenter, label: 'Centre' },
                        { id: 'right', icon: AlignRight, label: 'Droite' },
                      ] as const
                    ).map((opt) => {
                      const Icon = opt.icon;
                      const active = (draftCurrentStep.textAlign || 'left') === opt.id;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => handleUpdateStepField(safeSlideIndex, 'textAlign', opt.id)}
                          className={`py-2 px-2 rounded-xl border text-[11px] font-bold flex items-center justify-center gap-1 cursor-pointer ${
                            active
                              ? 'bg-sky-500 border-sky-400 text-white'
                              : 'bg-white/10 border-white/15 text-white/75 hover:bg-white/15'
                          }`}
                        >
                          <Icon className="w-3.5 h-3.5" />
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="block text-[10.5px] font-bold text-sky-300 mb-1">
                    Taille Titre / Position verticale
                  </label>
                  <div className="grid grid-cols-2 gap-1.5">
                    <select
                      value={draftCurrentStep.headlineSize || 'md'}
                      onChange={(e) =>
                        handleUpdateStepField(
                          safeSlideIndex,
                          'headlineSize',
                          e.target.value as GuideStepConfig['headlineSize']
                        )
                      }
                      className="px-2 py-2 rounded-xl bg-slate-900 border border-white/15 text-white outline-none"
                    >
                      <option value="sm">Titre S</option>
                      <option value="md">Titre M</option>
                      <option value="lg">Titre L</option>
                    </select>
                    <select
                      value={draftCurrentStep.contentVerticalAlign || 'center'}
                      onChange={(e) =>
                        handleUpdateStepField(
                          safeSlideIndex,
                          'contentVerticalAlign',
                          e.target.value as GuideStepConfig['contentVerticalAlign']
                        )
                      }
                      className="px-2 py-2 rounded-xl bg-slate-900 border border-white/15 text-white outline-none"
                    >
                      <option value="top">Haut</option>
                      <option value="center">Centré</option>
                      <option value="bottom">Bas</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[10.5px] font-bold text-sky-300 mb-1">
                    Image : Taille / Cadrage / Coins
                  </label>
                  <div className="grid grid-cols-3 gap-1">
                    <select
                      value={draftCurrentStep.imageSize || 'md'}
                      onChange={(e) =>
                        handleUpdateStepField(
                          safeSlideIndex,
                          'imageSize',
                          e.target.value as GuideStepConfig['imageSize']
                        )
                      }
                      className="px-1.5 py-2 rounded-xl bg-slate-900 border border-white/15 text-white outline-none text-[11px]"
                    >
                      <option value="sm">Petit</option>
                      <option value="md">Moyen</option>
                      <option value="lg">Grand</option>
                      <option value="xl">Max</option>
                    </select>
                    <select
                      value={draftCurrentStep.imageFit || 'contain'}
                      onChange={(e) =>
                        handleUpdateStepField(
                          safeSlideIndex,
                          'imageFit',
                          e.target.value as GuideStepConfig['imageFit']
                        )
                      }
                      className="px-1.5 py-2 rounded-xl bg-slate-900 border border-white/15 text-white outline-none text-[11px]"
                    >
                      <option value="contain">Entier</option>
                      <option value="cover">Remplir</option>
                    </select>
                    <select
                      value={draftCurrentStep.imageRounded || 'xl'}
                      onChange={(e) =>
                        handleUpdateStepField(
                          safeSlideIndex,
                          'imageRounded',
                          e.target.value as GuideStepConfig['imageRounded']
                        )
                      }
                      className="px-1.5 py-2 rounded-xl bg-slate-900 border border-white/15 text-white outline-none text-[11px]"
                    >
                      <option value="none">Carré</option>
                      <option value="md">Doux</option>
                      <option value="xl">Arrondi</option>
                      <option value="2xl">Très rond</option>
                    </select>
                  </div>
                </div>

                <div className="sm:col-span-2 lg:col-span-4 flex flex-wrap items-center gap-4 pt-1">
                  <label className="inline-flex items-center gap-2 cursor-pointer text-[11px] font-bold text-white/80">
                    <input
                      type="checkbox"
                      checked={Boolean(draftCurrentStep.hideBadge)}
                      onChange={(e) =>
                        handleUpdateStepField(safeSlideIndex, 'hideBadge', e.target.checked)
                      }
                      className="rounded accent-sky-500"
                    />
                    <span>Masquer le badge en haut</span>
                  </label>
                  <label className="inline-flex items-center gap-2 cursor-pointer text-[11px] font-bold text-white/80">
                    <input
                      type="checkbox"
                      checked={Boolean(draftCurrentStep.hidePrimaryCta)}
                      onChange={(e) =>
                        handleUpdateStepField(safeSlideIndex, 'hidePrimaryCta', e.target.checked)
                      }
                      className="rounded accent-sky-500"
                    />
                    <span>Masquer le bouton principal</span>
                  </label>
                  <label className="inline-flex items-center gap-2 cursor-pointer text-[11px] font-bold text-white/80">
                    <input
                      type="checkbox"
                      checked={Boolean(draftCurrentStep.hideSecondaryCta)}
                      onChange={(e) =>
                        handleUpdateStepField(safeSlideIndex, 'hideSecondaryCta', e.target.checked)
                      }
                      className="rounded accent-sky-500"
                    />
                    <span>Masquer le bouton secondaire</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Layout-Specific Visual Fields (With File Image Upload!) */}
            {draftStepLayout === 'comparison' && (
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
                    Image Avant (Importer ou Lien URL)
                  </label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      value={
                        draftConfig.slide1.beforeImageUrl.startsWith('data:')
                          ? '(Image locale importée)'
                          : draftConfig.slide1.beforeImageUrl
                      }
                      onChange={(e) =>
                        setDraftConfig({
                          ...draftConfig,
                          slide1: { ...draftConfig.slide1, beforeImageUrl: e.target.value },
                        })
                      }
                      className="flex-1 min-w-0 px-2.5 py-2 rounded-xl bg-white/10 border border-white/15 text-white font-mono outline-none"
                    />
                    <label className="px-2.5 py-2 rounded-xl bg-rose-500/30 hover:bg-rose-500/45 border border-rose-400/40 text-white cursor-pointer shrink-0 flex items-center gap-1">
                      <Camera className="w-3.5 h-3.5" />
                      <span>{uploadingTarget === 's1_before' ? '...' : 'Photo'}</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            handleUploadImage(file, 's1_before', (url) =>
                              setDraftConfig((prev) => ({
                                ...prev,
                                slide1: { ...prev.slide1, beforeImageUrl: url },
                              }))
                            );
                          }
                          e.target.value = '';
                        }}
                      />
                    </label>
                  </div>
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
                    Image Après (optionnelle) ou Code-barres
                  </label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      value={draftConfig.slide1.afterBarcodeSample}
                      onChange={(e) =>
                        setDraftConfig({
                          ...draftConfig,
                          slide1: { ...draftConfig.slide1, afterBarcodeSample: e.target.value },
                        })
                      }
                      placeholder="Code ex: 2000014 018315"
                      className="flex-1 min-w-0 px-2.5 py-2 rounded-xl bg-white/10 border border-white/15 text-white font-mono outline-none"
                    />
                    <label className="px-2.5 py-2 rounded-xl bg-emerald-500/30 hover:bg-emerald-500/45 border border-emerald-400/40 text-white cursor-pointer shrink-0 flex items-center gap-1">
                      <Camera className="w-3.5 h-3.5" />
                      <span>{uploadingTarget === 's1_after' ? '...' : 'Photo'}</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            handleUploadImage(file, 's1_after', (url) =>
                              setDraftConfig((prev) => ({
                                ...prev,
                                slide1: { ...prev.slide1, afterImageUrl: url },
                              }))
                            );
                          }
                          e.target.value = '';
                        }}
                      />
                    </label>
                    {draftConfig.slide1.afterImageUrl && (
                      <button
                        type="button"
                        onClick={() =>
                          setDraftConfig((prev) => ({
                            ...prev,
                            slide1: { ...prev.slide1, afterImageUrl: '' },
                          }))
                        }
                        className="p-2 rounded-xl bg-red-500/25 text-red-200 hover:bg-red-500/45 cursor-pointer"
                        title="Revenir à l'icône code-barres"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
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

            {draftStepLayout === 'showcase' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-3 border-t border-white/10">
                <div className="sm:col-span-2">
                  <label className="block text-[10.5px] font-bold text-sky-300 mb-1">
                    Image Fiche Produit (Importer photo ou coller URL)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={
                        draftConfig.slide2.showcaseImageUrl.startsWith('data:')
                          ? '(Image locale importée)'
                          : draftConfig.slide2.showcaseImageUrl
                      }
                      onChange={(e) =>
                        setDraftConfig({
                          ...draftConfig,
                          slide2: { ...draftConfig.slide2, showcaseImageUrl: e.target.value },
                        })
                      }
                      className="flex-1 px-3 py-2 rounded-xl bg-white/10 border border-white/15 text-white font-mono outline-none"
                    />
                    <label className="px-3 py-2 rounded-xl bg-sky-500/30 hover:bg-sky-500/45 border border-sky-400/40 text-white font-bold cursor-pointer shrink-0 flex items-center gap-1.5">
                      <Camera className="w-3.5 h-3.5" />
                      <span>{uploadingTarget === 's2_img' ? 'Import...' : 'Importer Photo'}</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            handleUploadImage(file, 's2_img', (url) =>
                              setDraftConfig((prev) => ({
                                ...prev,
                                slide2: { ...prev.slide2, showcaseImageUrl: url },
                              }))
                            );
                          }
                          e.target.value = '';
                        }}
                      />
                    </label>
                  </div>
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

            {draftStepLayout === 'actions' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs pt-3 border-t border-white/10">
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
                <div className="sm:col-span-2">
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
                <div>
                  <label className="block text-[10.5px] font-bold text-emerald-300 mb-1">
                    Numéro WhatsApp affiché
                  </label>
                  <input
                    type="text"
                    value={draftConfig.slide3.card2PhoneDisplay}
                    onChange={(e) =>
                      setDraftConfig({
                        ...draftConfig,
                        slide3: { ...draftConfig.slide3, card2PhoneDisplay: e.target.value },
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-white/10 border border-white/15 text-white font-mono outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10.5px] font-bold text-emerald-300 mb-1">
                    Numéro lien WhatsApp (ex: 2127...)
                  </label>
                  <input
                    type="text"
                    value={draftConfig.slide3.card2WhatsappNumber || WHATSAPP_PHONE_NUMBER}
                    onChange={(e) =>
                      setDraftConfig({
                        ...draftConfig,
                        slide3: { ...draftConfig.slide3, card2WhatsappNumber: e.target.value },
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-white/10 border border-white/15 text-white font-mono outline-none"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-[10.5px] font-bold text-emerald-300 mb-1">
                    Message pré-rempli WhatsApp
                  </label>
                  <input
                    type="text"
                    value={
                      draftConfig.slide3.card2WhatsappMessage ||
                      "BONJOUR J'AI BESOIN D'AIDE SUR LIVRY FINDER :"
                    }
                    onChange={(e) =>
                      setDraftConfig({
                        ...draftConfig,
                        slide3: { ...draftConfig.slide3, card2WhatsappMessage: e.target.value },
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-white/10 border border-white/15 text-white outline-none"
                  />
                </div>
              </div>
            )}

            {draftStepLayout === 'free' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-3 border-t border-white/10">
                <div>
                  <label className="block text-[10.5px] font-bold text-emerald-300 mb-1">
                    Image Principale de l&apos;étape (Importer ou URL)
                  </label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      value={
                        (draftCurrentStep.customImageUrl || '').startsWith('data:')
                          ? '(Image locale importée)'
                          : draftCurrentStep.customImageUrl || ''
                      }
                      onChange={(e) =>
                        handleUpdateStepField(safeSlideIndex, 'customImageUrl', e.target.value)
                      }
                      placeholder="https://... ou importer une photo"
                      className="flex-1 min-w-0 px-3 py-2 rounded-xl bg-white/10 border border-white/15 text-white font-mono outline-none"
                    />
                    <label className="px-3 py-2 rounded-xl bg-emerald-500/30 hover:bg-emerald-500/45 border border-emerald-400/40 text-white font-bold cursor-pointer shrink-0 flex items-center gap-1">
                      <Camera className="w-3.5 h-3.5" />
                      <span>{uploadingTarget === 'free_img' ? '...' : 'Photo'}</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            handleUploadImage(file, 'free_img', (url) =>
                              handleUpdateStepField(safeSlideIndex, 'customImageUrl', url)
                            );
                          }
                          e.target.value = '';
                        }}
                      />
                    </label>
                  </div>
                </div>
                <div>
                  <label className="block text-[10.5px] font-bold text-emerald-300 mb-1">
                    Légende sous l&apos;image
                  </label>
                  <input
                    type="text"
                    value={draftCurrentStep.customImageCaption || ''}
                    onChange={(e) =>
                      handleUpdateStepField(safeSlideIndex, 'customImageCaption', e.target.value)
                    }
                    placeholder="Explication courte de l'image..."
                    className="w-full px-3 py-2 rounded-xl bg-white/10 border border-white/15 text-white outline-none"
                  />
                </div>
              </div>
            )}

            {/* Optional Custom Hero Image usable on ANY step layout */}
            {draftStepLayout !== 'free' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-3 border-t border-white/10">
                <div>
                  <label className="block text-[10.5px] font-bold text-amber-300 mb-1">
                    Photo personnalisée additionnelle sur cette étape (optionnelle)
                  </label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      value={
                        (draftCurrentStep.customImageUrl || '').startsWith('data:')
                          ? '(Image locale importée)'
                          : draftCurrentStep.customImageUrl || ''
                      }
                      onChange={(e) =>
                        handleUpdateStepField(safeSlideIndex, 'customImageUrl', e.target.value)
                      }
                      placeholder="https://... ou importer"
                      className="flex-1 min-w-0 px-3 py-2 rounded-xl bg-white/10 border border-white/15 text-white font-mono outline-none"
                    />
                    <label className="px-3 py-2 rounded-xl bg-amber-500/30 hover:bg-amber-500/45 border border-amber-400/40 text-white font-bold cursor-pointer shrink-0 flex items-center gap-1">
                      <Camera className="w-3.5 h-3.5" />
                      <span>{uploadingTarget === 'step_extra_img' ? '...' : 'Photo'}</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            handleUploadImage(file, 'step_extra_img', (url) =>
                              handleUpdateStepField(safeSlideIndex, 'customImageUrl', url)
                            );
                          }
                          e.target.value = '';
                        }}
                      />
                    </label>
                    {draftCurrentStep.customImageUrl && (
                      <button
                        type="button"
                        onClick={() => handleUpdateStepField(safeSlideIndex, 'customImageUrl', '')}
                        className="p-2 rounded-xl bg-red-500/25 text-red-200 hover:bg-red-500/45 cursor-pointer"
                        title="Retirer cette photo"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
                <div>
                  <label className="block text-[10.5px] font-bold text-amber-300 mb-1">
                    Légende photo additionnelle
                  </label>
                  <input
                    type="text"
                    value={draftCurrentStep.customImageCaption || ''}
                    onChange={(e) =>
                      handleUpdateStepField(safeSlideIndex, 'customImageCaption', e.target.value)
                    }
                    placeholder="Légende optionnelle..."
                    className="w-full px-3 py-2 rounded-xl bg-white/10 border border-white/15 text-white outline-none"
                  />
                </div>
              </div>
            )}

            </div>
            )}

            {/* TAB 2: Per-Step Full Colors & Background Studio */}
            {editorTab === 'style' && (
              <div className="space-y-4 text-xs">
                <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-white/10">
                  <span className="text-[11px] font-bold text-white/75">
                    Personnalisez le fond, les couleurs de textes, badges, cartes et boutons de l&apos;étape 0{safeSlideIndex + 1}
                  </span>
                  <button
                    type="button"
                    onClick={handleApplyStepStyleToAll}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-500/25 hover:bg-sky-500/40 border border-sky-400/40 text-sky-200 font-black text-[11px] cursor-pointer"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>Appliquer ce style à toutes les étapes</span>
                  </button>
                </div>

                {/* Background Controls */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 bg-white/[0.04] border border-white/10 p-3 rounded-2xl">
                  <div>
                    <label className="block text-[10.5px] font-bold text-amber-300 mb-1">
                      Arrière-plan de cette étape
                    </label>
                    <select
                      value={draftCurrentStep.backgroundType || 'theme'}
                      onChange={(e) =>
                        handleUpdateStepField(
                          safeSlideIndex,
                          'backgroundType',
                          e.target.value as GuideStepConfig['backgroundType']
                        )
                      }
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/15 text-white outline-none"
                    >
                      <option value="theme">Utiliser le fond global</option>
                      <option value="solid">Couleur unie personnalisée</option>
                      <option value="gradient">Dégradé 2 couleurs</option>
                      <option value="image">Image / Photo de fond</option>
                    </select>
                  </div>

                  {draftCurrentStep.backgroundType === 'solid' && (
                    <div>
                      <label className="block text-[10.5px] font-bold text-white/70 mb-1">
                        Couleur de fond
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={draftCurrentStep.backgroundColor || '#0f172a'}
                          onChange={(e) =>
                            handleUpdateStepField(safeSlideIndex, 'backgroundColor', e.target.value)
                          }
                          className="w-10 h-9 rounded-lg bg-transparent border border-white/20 cursor-pointer shrink-0"
                        />
                        <input
                          type="text"
                          value={draftCurrentStep.backgroundColor || '#0f172a'}
                          onChange={(e) =>
                            handleUpdateStepField(safeSlideIndex, 'backgroundColor', e.target.value)
                          }
                          className="flex-1 min-w-0 px-2.5 py-2 rounded-xl bg-white/10 border border-white/15 text-white font-mono outline-none"
                        />
                      </div>
                    </div>
                  )}

                  {draftCurrentStep.backgroundType === 'gradient' && (
                    <>
                      <div>
                        <label className="block text-[10.5px] font-bold text-white/70 mb-1">
                          Couleur Début
                        </label>
                        <div className="flex items-center gap-1.5">
                          <input
                            type="color"
                            value={draftCurrentStep.gradientFrom || '#0759A4'}
                            onChange={(e) =>
                              handleUpdateStepField(safeSlideIndex, 'gradientFrom', e.target.value)
                            }
                            className="w-9 h-9 rounded-lg border border-white/20 cursor-pointer shrink-0"
                          />
                          <input
                            type="text"
                            value={draftCurrentStep.gradientFrom || '#0759A4'}
                            onChange={(e) =>
                              handleUpdateStepField(safeSlideIndex, 'gradientFrom', e.target.value)
                            }
                            className="flex-1 min-w-0 px-2 py-2 rounded-xl bg-white/10 border border-white/15 text-white font-mono outline-none"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-[10.5px] font-bold text-white/70 mb-1">
                          Couleur Fin
                        </label>
                        <div className="flex items-center gap-1.5">
                          <input
                            type="color"
                            value={draftCurrentStep.gradientTo || '#0f172a'}
                            onChange={(e) =>
                              handleUpdateStepField(safeSlideIndex, 'gradientTo', e.target.value)
                            }
                            className="w-9 h-9 rounded-lg border border-white/20 cursor-pointer shrink-0"
                          />
                          <input
                            type="text"
                            value={draftCurrentStep.gradientTo || '#0f172a'}
                            onChange={(e) =>
                              handleUpdateStepField(safeSlideIndex, 'gradientTo', e.target.value)
                            }
                            className="flex-1 min-w-0 px-2 py-2 rounded-xl bg-white/10 border border-white/15 text-white font-mono outline-none"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-[10.5px] font-bold text-white/70 mb-1">
                          Angle ({draftCurrentStep.gradientAngle ?? 135}°)
                        </label>
                        <input
                          type="range"
                          min={0}
                          max={360}
                          value={draftCurrentStep.gradientAngle ?? 135}
                          onChange={(e) =>
                            handleUpdateStepField(
                              safeSlideIndex,
                              'gradientAngle',
                              Number(e.target.value)
                            )
                          }
                          className="w-full accent-sky-400 cursor-pointer mt-2"
                        />
                      </div>
                    </>
                  )}

                  {draftCurrentStep.backgroundType === 'image' && (
                    <>
                      <div className="sm:col-span-2">
                        <label className="block text-[10.5px] font-bold text-white/70 mb-1">
                          Photo d&apos;arrière-plan (Importer ou URL)
                        </label>
                        <div className="flex items-center gap-1.5">
                          <input
                            type="text"
                            value={
                              (draftCurrentStep.backgroundImageUrl || '').startsWith('data:')
                                ? '(Photo locale importée)'
                                : draftCurrentStep.backgroundImageUrl || ''
                            }
                            onChange={(e) =>
                              handleUpdateStepField(
                                safeSlideIndex,
                                'backgroundImageUrl',
                                e.target.value
                              )
                            }
                            placeholder="https://..."
                            className="flex-1 min-w-0 px-2.5 py-2 rounded-xl bg-white/10 border border-white/15 text-white font-mono outline-none"
                          />
                          <label className="px-3 py-2 rounded-xl bg-sky-500/30 hover:bg-sky-500/45 border border-sky-400/40 text-white font-bold cursor-pointer shrink-0 flex items-center gap-1">
                            <Camera className="w-3.5 h-3.5" />
                            <span>{uploadingTarget === 'step_bg' ? '...' : 'Photo'}</span>
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  handleUploadImage(file, 'step_bg', (url) =>
                                    handleUpdateStepField(safeSlideIndex, 'backgroundImageUrl', url)
                                  );
                                }
                                e.target.value = '';
                              }}
                            />
                          </label>
                        </div>
                      </div>
                      <div>
                        <label className="block text-[10.5px] font-bold text-white/70 mb-1">
                          Voile sombre ({draftCurrentStep.backgroundOverlayOpacity ?? 55}%)
                        </label>
                        <input
                          type="range"
                          min={0}
                          max={95}
                          value={draftCurrentStep.backgroundOverlayOpacity ?? 55}
                          onChange={(e) =>
                            handleUpdateStepField(
                              safeSlideIndex,
                              'backgroundOverlayOpacity',
                              Number(e.target.value)
                            )
                          }
                          className="w-full accent-amber-400 cursor-pointer mt-2"
                        />
                      </div>
                    </>
                  )}
                </div>

                {/* Color Pickers Grid for Typography, Cards, Badge & CTAs */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
                  {(
                    [
                      { key: 'titleColor', label: 'Couleur Grand Titre', def: '#ffffff' },
                      { key: 'subtitleColor', label: 'Couleur Sous-titre', def: '#fb7185' },
                      { key: 'textColor', label: 'Couleur Description', def: '#cbd5e1' },
                      { key: 'cardBgColor', label: 'Fond Cartes & Blocs', def: '#0f172a' },
                      { key: 'badgeBgColor', label: 'Fond Badge Haut', def: '#1e293b' },
                      { key: 'badgeTextColor', label: 'Texte Badge Haut', def: '#ffffff' },
                      { key: 'ctaBgColor', label: 'Fond Bouton 1', def: '#ffffff' },
                      { key: 'ctaTextColor', label: 'Texte Bouton 1', def: '#020617' },
                      { key: 'secondaryCtaBgColor', label: 'Fond Bouton 2', def: '#1e293b' },
                      { key: 'secondaryCtaTextColor', label: 'Texte Bouton 2', def: '#ffffff' },
                    ] as const
                  ).map((item) => {
                    const val = (draftCurrentStep[item.key] as string | undefined) || '';
                    return (
                      <div
                        key={item.key}
                        className="rounded-xl bg-white/[0.04] border border-white/10 p-2 space-y-1.5"
                      >
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-[10px] font-bold text-white/75 truncate">
                            {item.label}
                          </span>
                          {val && (
                            <button
                              type="button"
                              onClick={() => handleUpdateStepField(safeSlideIndex, item.key, undefined)}
                              className="text-[9px] text-rose-300 hover:underline cursor-pointer shrink-0"
                            >
                              Auto
                            </button>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5">
                          <input
                            type="color"
                            value={val || item.def}
                            onChange={(e) =>
                              handleUpdateStepField(safeSlideIndex, item.key, e.target.value)
                            }
                            className="w-7 h-7 rounded border border-white/20 bg-transparent cursor-pointer shrink-0"
                          />
                          <input
                            type="text"
                            value={val}
                            placeholder="Auto"
                            onChange={(e) =>
                              handleUpdateStepField(safeSlideIndex, item.key, e.target.value)
                            }
                            className="w-full min-w-0 px-2 py-1 rounded-lg bg-white/10 border border-white/15 text-[11px] font-mono text-white outline-none"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* TAB 3: Free Extra Rich Blocks Builder (Images & Text on ANY step!) */}
            {editorTab === 'blocks' && (
            <div className="space-y-2.5 text-xs">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <span className="text-[11px] font-black text-white/85 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-amber-300" />
                  <span>Blocs personnalisés (Textes &amp; Photos supplémentaires sur cette étape)</span>
                </span>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <button
                    type="button"
                    onClick={() => handleAddStepBlock('text')}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white font-bold cursor-pointer"
                  >
                    <TypeIcon className="w-3 h-3" />
                    <span>+ Texte</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAddStepBlock('image')}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-sky-500/25 hover:bg-sky-500/40 text-sky-200 font-bold cursor-pointer"
                  >
                    <ImageIcon className="w-3 h-3" />
                    <span>+ Photo</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAddStepBlock('image_text')}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/25 hover:bg-emerald-500/40 text-emerald-200 font-bold cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                    <span>+ Photo &amp; Texte</span>
                  </button>
                </div>
              </div>

              {stepBlocks.length > 0 && (
                <div className="space-y-2.5">
                  {stepBlocks.map((blk, bIdx) => (
                    <div
                      key={blk.id}
                      className="rounded-2xl bg-white/[0.06] border border-white/15 p-3 space-y-2"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10.5px] font-black uppercase tracking-wider text-amber-300">
                          Bloc #{bIdx + 1} ·{' '}
                          {blk.type === 'text'
                            ? 'Texte'
                            : blk.type === 'image'
                              ? 'Photo'
                              : 'Photo + Texte'}
                        </span>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleMoveStepBlock(bIdx, -1)}
                            disabled={bIdx === 0}
                            className="p-1 rounded bg-white/10 hover:bg-white/20 disabled:opacity-30 cursor-pointer"
                          >
                            <ArrowUp className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleMoveStepBlock(bIdx, 1)}
                            disabled={bIdx === stepBlocks.length - 1}
                            className="p-1 rounded bg-white/10 hover:bg-white/20 disabled:opacity-30 cursor-pointer"
                          >
                            <ArrowDown className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteStepBlock(bIdx)}
                            className="p-1 rounded bg-red-500/25 text-red-200 hover:bg-red-500/50 cursor-pointer"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>

                      {(blk.type === 'text' || blk.type === 'image_text') && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <input
                            type="text"
                            value={blk.heading || ''}
                            onChange={(e) =>
                              handleUpdateStepBlock(bIdx, { heading: e.target.value })
                            }
                            placeholder="Sous-titre (optionnel)"
                            className="px-2.5 py-1.5 rounded-xl bg-white/10 border border-white/15 text-white outline-none"
                          />
                          <textarea
                            rows={2}
                            value={blk.text || ''}
                            onChange={(e) =>
                              handleUpdateStepBlock(bIdx, { text: e.target.value })
                            }
                            placeholder="Texte / explication..."
                            className="sm:col-span-2 px-2.5 py-1.5 rounded-xl bg-white/10 border border-white/15 text-white outline-none"
                          />
                        </div>
                      )}

                      {(blk.type === 'image' || blk.type === 'image_text') && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 items-center">
                          <div className="flex items-center gap-1.5">
                            <input
                              type="text"
                              value={
                                (blk.imageUrl || '').startsWith('data:')
                                  ? '(Image locale importée)'
                                  : blk.imageUrl || ''
                              }
                              onChange={(e) =>
                                handleUpdateStepBlock(bIdx, { imageUrl: e.target.value })
                              }
                              placeholder="URL photo ou importer..."
                              className="flex-1 min-w-0 px-2.5 py-1.5 rounded-xl bg-white/10 border border-white/15 text-white font-mono outline-none"
                            />
                            <label className="px-2.5 py-1.5 rounded-xl bg-sky-500/30 hover:bg-sky-500/45 border border-sky-400/40 text-white font-bold cursor-pointer shrink-0 flex items-center gap-1">
                              <Camera className="w-3.5 h-3.5" />
                              <span>{uploadingTarget === blk.id ? '...' : 'Photo'}</span>
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    handleUploadImage(file, blk.id, (url) =>
                                      handleUpdateStepBlock(bIdx, { imageUrl: url })
                                    );
                                  }
                                  e.target.value = '';
                                }}
                              />
                            </label>
                          </div>
                          <input
                            type="text"
                            value={blk.caption || ''}
                            onChange={(e) =>
                              handleUpdateStepBlock(bIdx, { caption: e.target.value })
                            }
                            placeholder="Légende photo (optionnelle)"
                            className="px-2.5 py-1.5 rounded-xl bg-white/10 border border-white/15 text-white outline-none"
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
            )}

            {/* TAB 4: Global Page Background, Header, Sommaire & Astuces Hero Card */}
            {editorTab === 'global' && (
              <div className="space-y-4 text-xs">
                {/* Global Full-Page Background & Layout */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 bg-white/[0.04] border border-white/10 p-3 rounded-2xl">
                  <div>
                    <label className="block text-[10.5px] font-bold text-sky-300 mb-1">
                      Fond Global de toute la page
                    </label>
                    <select
                      value={draftConfig.globalBgType || 'theme'}
                      onChange={(e) =>
                        setDraftConfig({
                          ...draftConfig,
                          globalBgType: e.target.value as GuideConfig['globalBgType'],
                        })
                      }
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/15 text-white outline-none"
                    >
                      <option value="theme">Thème prédéfini (ci-dessous)</option>
                      <option value="solid">Couleur unie personnalisée</option>
                      <option value="gradient">Dégradé personnalisé</option>
                      <option value="image">Image / Photo de fond globale</option>
                    </select>
                  </div>

                  {(!draftConfig.globalBgType || draftConfig.globalBgType === 'theme') && (
                    <div>
                      <label className="block text-[10.5px] font-bold text-white/70 mb-1">
                        Thème Prédéfini
                      </label>
                      <select
                        value={draftConfig.themePreset || 'rose-blue'}
                        onChange={(e) =>
                          setDraftConfig({
                            ...draftConfig,
                            themePreset: e.target.value as GuideConfig['themePreset'],
                          })
                        }
                        className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/15 text-white outline-none"
                      >
                        <option value="rose-blue">Rose &amp; Bleu Livry (Défaut)</option>
                        <option value="ocean">Bleu Océan Pro</option>
                        <option value="emerald">Émeraude Frais</option>
                        <option value="amber">Ambre Chaleureux</option>
                        <option value="midnight">Noir &amp; Ardoise Pur</option>
                      </select>
                    </div>
                  )}

                  {draftConfig.globalBgType === 'solid' && (
                    <div>
                      <label className="block text-[10.5px] font-bold text-white/70 mb-1">
                        Couleur unie globale
                      </label>
                      <div className="flex items-center gap-1.5">
                        <input
                          type="color"
                          value={draftConfig.globalBgColor || '#0f172a'}
                          onChange={(e) =>
                            setDraftConfig({ ...draftConfig, globalBgColor: e.target.value })
                          }
                          className="w-9 h-9 rounded-lg border border-white/20 cursor-pointer shrink-0"
                        />
                        <input
                          type="text"
                          value={draftConfig.globalBgColor || '#0f172a'}
                          onChange={(e) =>
                            setDraftConfig({ ...draftConfig, globalBgColor: e.target.value })
                          }
                          className="flex-1 min-w-0 px-2.5 py-2 rounded-xl bg-white/10 border border-white/15 text-white font-mono outline-none"
                        />
                      </div>
                    </div>
                  )}

                  {draftConfig.globalBgType === 'gradient' && (
                    <>
                      <div>
                        <label className="block text-[10.5px] font-bold text-white/70 mb-1">
                          Début dégradé
                        </label>
                        <div className="flex items-center gap-1.5">
                          <input
                            type="color"
                            value={draftConfig.globalGradientFrom || '#0759A4'}
                            onChange={(e) =>
                              setDraftConfig({ ...draftConfig, globalGradientFrom: e.target.value })
                            }
                            className="w-9 h-9 rounded-lg border border-white/20 cursor-pointer shrink-0"
                          />
                          <input
                            type="text"
                            value={draftConfig.globalGradientFrom || '#0759A4'}
                            onChange={(e) =>
                              setDraftConfig({ ...draftConfig, globalGradientFrom: e.target.value })
                            }
                            className="flex-1 min-w-0 px-2 py-2 rounded-xl bg-white/10 border border-white/15 text-white font-mono outline-none"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-[10.5px] font-bold text-white/70 mb-1">
                          Fin dégradé
                        </label>
                        <div className="flex items-center gap-1.5">
                          <input
                            type="color"
                            value={draftConfig.globalGradientTo || '#0f172a'}
                            onChange={(e) =>
                              setDraftConfig({ ...draftConfig, globalGradientTo: e.target.value })
                            }
                            className="w-9 h-9 rounded-lg border border-white/20 cursor-pointer shrink-0"
                          />
                          <input
                            type="text"
                            value={draftConfig.globalGradientTo || '#0f172a'}
                            onChange={(e) =>
                              setDraftConfig({ ...draftConfig, globalGradientTo: e.target.value })
                            }
                            className="flex-1 min-w-0 px-2 py-2 rounded-xl bg-white/10 border border-white/15 text-white font-mono outline-none"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-[10.5px] font-bold text-white/70 mb-1">
                          Angle ({draftConfig.globalGradientAngle ?? 135}°)
                        </label>
                        <input
                          type="range"
                          min={0}
                          max={360}
                          value={draftConfig.globalGradientAngle ?? 135}
                          onChange={(e) =>
                            setDraftConfig({
                              ...draftConfig,
                              globalGradientAngle: Number(e.target.value),
                            })
                          }
                          className="w-full accent-sky-400 cursor-pointer mt-2"
                        />
                      </div>
                    </>
                  )}

                  {draftConfig.globalBgType === 'image' && (
                    <>
                      <div className="sm:col-span-2">
                        <label className="block text-[10.5px] font-bold text-white/70 mb-1">
                          Photo de fond globale (Importer ou URL)
                        </label>
                        <div className="flex items-center gap-1.5">
                          <input
                            type="text"
                            value={
                              (draftConfig.globalBgImageUrl || '').startsWith('data:')
                                ? '(Photo locale importée)'
                                : draftConfig.globalBgImageUrl || ''
                            }
                            onChange={(e) =>
                              setDraftConfig({ ...draftConfig, globalBgImageUrl: e.target.value })
                            }
                            placeholder="https://..."
                            className="flex-1 min-w-0 px-2.5 py-2 rounded-xl bg-white/10 border border-white/15 text-white font-mono outline-none"
                          />
                          <label className="px-3 py-2 rounded-xl bg-sky-500/30 hover:bg-sky-500/45 border border-sky-400/40 text-white font-bold cursor-pointer shrink-0 flex items-center gap-1">
                            <Camera className="w-3.5 h-3.5" />
                            <span>{uploadingTarget === 'global_bg' ? '...' : 'Photo'}</span>
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  handleUploadImage(file, 'global_bg', (url) =>
                                    setDraftConfig((prev) => ({ ...prev, globalBgImageUrl: url }))
                                  );
                                }
                                e.target.value = '';
                              }}
                            />
                          </label>
                        </div>
                      </div>
                      <div>
                        <label className="block text-[10.5px] font-bold text-white/70 mb-1">
                          Voile sombre ({draftConfig.globalOverlayOpacity ?? 50}%)
                        </label>
                        <input
                          type="range"
                          min={0}
                          max={95}
                          value={draftConfig.globalOverlayOpacity ?? 50}
                          onChange={(e) =>
                            setDraftConfig({
                              ...draftConfig,
                              globalOverlayOpacity: Number(e.target.value),
                            })
                          }
                          className="w-full accent-amber-400 cursor-pointer mt-2"
                        />
                      </div>
                    </>
                  )}

                  <div>
                    <label className="block text-[10.5px] font-bold text-sky-300 mb-1">
                      Emplacement du Sommaire
                    </label>
                    <select
                      value={draftConfig.summarySidebarPosition || 'right'}
                      onChange={(e) =>
                        setDraftConfig({
                          ...draftConfig,
                          summarySidebarPosition: e.target.value as GuideConfig['summarySidebarPosition'],
                        })
                      }
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/15 text-white outline-none"
                    >
                      <option value="right">À droite (Classique)</option>
                      <option value="left">À gauche</option>
                      <option value="hidden">Masquer (Plein écran centré)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10.5px] font-bold text-white/70 mb-1">
                      Couleur Barre Haute (Header)
                    </label>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="color"
                        value={draftConfig.headerBgColor || '#000000'}
                        onChange={(e) =>
                          setDraftConfig({ ...draftConfig, headerBgColor: e.target.value })
                        }
                        className="w-8 h-8 rounded border border-white/20 cursor-pointer shrink-0"
                      />
                      <input
                        type="text"
                        value={draftConfig.headerBgColor || ''}
                        placeholder="Auto"
                        onChange={(e) =>
                          setDraftConfig({ ...draftConfig, headerBgColor: e.target.value })
                        }
                        className="flex-1 min-w-0 px-2 py-2 rounded-xl bg-white/10 border border-white/15 text-white font-mono outline-none"
                      />
                      {draftConfig.headerBgColor && (
                        <button
                          type="button"
                          onClick={() => setDraftConfig({ ...draftConfig, headerBgColor: undefined })}
                          className="text-[10px] text-rose-300 cursor-pointer"
                        >
                          Auto
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[10.5px] font-bold text-white/70 mb-1">
                      Titre Global (Barre haute)
                    </label>
                    <input
                      type="text"
                      value={draftConfig.topBrandTitle}
                      onChange={(e) =>
                        setDraftConfig({ ...draftConfig, topBrandTitle: e.target.value })
                      }
                      className="w-full px-3 py-2 rounded-xl bg-white/10 border border-white/15 text-white outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10.5px] font-bold text-white/70 mb-1">
                      Titre du Sommaire
                    </label>
                    <input
                      type="text"
                      value={draftConfig.summaryTitle || 'Sommaire du Guide'}
                      onChange={(e) =>
                        setDraftConfig({ ...draftConfig, summaryTitle: e.target.value })
                      }
                      className="w-full px-3 py-2 rounded-xl bg-white/10 border border-white/15 text-white outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10.5px] font-bold text-white/70 mb-1">
                      Couleur Texte Sommaire
                    </label>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="color"
                        value={draftConfig.summaryTextColor || '#ffffff'}
                        onChange={(e) =>
                          setDraftConfig({ ...draftConfig, summaryTextColor: e.target.value })
                        }
                        className="w-8 h-8 rounded border border-white/20 cursor-pointer shrink-0"
                      />
                      <input
                        type="text"
                        value={draftConfig.summaryTextColor || ''}
                        placeholder="Auto"
                        onChange={(e) =>
                          setDraftConfig({ ...draftConfig, summaryTextColor: e.target.value })
                        }
                        className="flex-1 min-w-0 px-2 py-2 rounded-xl bg-white/10 border border-white/15 text-white font-mono outline-none"
                      />
                    </div>
                  </div>
                  <div className="sm:col-span-2 lg:col-span-3">
                    <label className="block text-[10.5px] font-bold text-white/70 mb-1">
                      Texte Pied de page (sous le sommaire)
                    </label>
                    <input
                      type="text"
                      value={draftConfig.footerHint}
                      onChange={(e) =>
                        setDraftConfig({ ...draftConfig, footerHint: e.target.value })
                      }
                      className="w-full px-3 py-2 rounded-xl bg-white/10 border border-white/15 text-white outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10.5px] font-bold text-amber-300 mb-1">
                      Carte Astuces — Badge
                    </label>
                    <input
                      type="text"
                      value={draftConfig.heroBanner?.badge || ''}
                      onChange={(e) =>
                        setDraftConfig({
                          ...draftConfig,
                          heroBanner: {
                            badge: e.target.value,
                            headline: draftConfig.heroBanner?.headline || '',
                            subtitle: draftConfig.heroBanner?.subtitle || '',
                            ctaLabel: draftConfig.heroBanner?.ctaLabel || '',
                          },
                        })
                      }
                      className="w-full px-3 py-2 rounded-xl bg-white/10 border border-white/15 text-white outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10.5px] font-bold text-amber-300 mb-1">
                      Carte Astuces — Titre
                    </label>
                    <input
                      type="text"
                      value={draftConfig.heroBanner?.headline || ''}
                      onChange={(e) =>
                        setDraftConfig({
                          ...draftConfig,
                          heroBanner: {
                            badge: draftConfig.heroBanner?.badge || '',
                            headline: e.target.value,
                            subtitle: draftConfig.heroBanner?.subtitle || '',
                            ctaLabel: draftConfig.heroBanner?.ctaLabel || '',
                          },
                        })
                      }
                      className="w-full px-3 py-2 rounded-xl bg-white/10 border border-white/15 text-white outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10.5px] font-bold text-amber-300 mb-1">
                      Carte Astuces — Bouton CTA
                    </label>
                    <input
                      type="text"
                      value={draftConfig.heroBanner?.ctaLabel || ''}
                      onChange={(e) =>
                        setDraftConfig({
                          ...draftConfig,
                          heroBanner: {
                            badge: draftConfig.heroBanner?.badge || '',
                            headline: draftConfig.heroBanner?.headline || '',
                            subtitle: draftConfig.heroBanner?.subtitle || '',
                            ctaLabel: e.target.value,
                          },
                        })
                      }
                      className="w-full px-3 py-2 rounded-xl bg-white/10 border border-white/15 text-white outline-none"
                    />
                  </div>
                  <div className="sm:col-span-2 lg:col-span-3">
                    <label className="block text-[10.5px] font-bold text-amber-300 mb-1">
                      Carte Astuces — Sous-titre
                    </label>
                    <input
                      type="text"
                      value={draftConfig.heroBanner?.subtitle || ''}
                      onChange={(e) =>
                        setDraftConfig({
                          ...draftConfig,
                          heroBanner: {
                            badge: draftConfig.heroBanner?.badge || '',
                            headline: draftConfig.heroBanner?.headline || '',
                            subtitle: e.target.value,
                            ctaLabel: draftConfig.heroBanner?.ctaLabel || '',
                          },
                        })
                      }
                      className="w-full px-3 py-2 rounded-xl bg-white/10 border border-white/15 text-white outline-none"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        <div className={`grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center`}>
          {/* MAIN STAGE (7 cols if sidebar shown, 12 cols if sidebar hidden) */}
          <div
            className={`${
              sidebarPos === 'hidden'
                ? 'lg:col-span-12 max-w-5xl mx-auto w-full'
                : sidebarPos === 'left'
                  ? 'lg:col-span-7 lg:order-2'
                  : 'lg:col-span-7'
            } flex flex-col ${verticalAlignClass} space-y-5 animate-in fade-in slide-in-from-right-3 duration-200`}
          >
            <div
              className={
                mediaPos === 'left' || mediaPos === 'right'
                  ? 'grid grid-cols-1 md:grid-cols-12 gap-6 items-center'
                  : 'flex flex-col space-y-5'
              }
            >
              {/* HEADLINE & DESCRIPTION BLOCK */}
              <div
                className={`space-y-2 flex flex-col ${textAlignClass} ${
                  mediaPos === 'left'
                    ? 'md:col-span-6 md:order-2'
                    : mediaPos === 'right'
                      ? 'md:col-span-6 md:order-1'
                      : mediaPos === 'top'
                        ? 'order-2'
                        : 'order-1'
                }`}
              >
                <h2
                  className={`${headlineSizeClass} font-black tracking-tight leading-[1.08]`}
                  style={{ color: activeStep.titleColor || '#ffffff' }}
                >
                  {activeStep.headlineLine1}
                  <span
                    className={`block ${activeStep.subtitleColor ? '' : accentClass}`}
                    style={activeStep.subtitleColor ? { color: activeStep.subtitleColor } : undefined}
                  >
                    {activeStep.headlineLine2}
                  </span>
                </h2>
                {activeStep.description && (
                  <p
                    className="text-sm sm:text-base leading-relaxed max-w-xl whitespace-pre-line"
                    style={{ color: activeStep.textColor || 'rgba(255, 255, 255, 0.78)' }}
                  >
                    {activeStep.description}
                  </p>
                )}
              </div>

              {/* MAIN VISUAL STAGE (Hidden if mediaPosition === 'hidden') */}
              {mediaPos !== 'hidden' && (
                <div
                  className={`space-y-4 ${
                    mediaPos === 'left'
                      ? 'md:col-span-6 md:order-1'
                      : mediaPos === 'right'
                        ? 'md:col-span-6 md:order-2'
                        : mediaPos === 'top'
                          ? 'order-1'
                          : 'order-2'
                  }`}
                >
                  {/* LAYOUT: COMPARISON (Slide 1 default) */}
                  {stepLayout === 'comparison' && (
                    <div
                      className="relative rounded-[26px] overflow-hidden border border-white/20 backdrop-blur-xl shadow-2xl min-h-[270px] sm:min-h-[320px] flex flex-col justify-between p-4 sm:p-6"
                      style={{ backgroundColor: activeStep.cardBgColor || 'rgba(0, 0, 0, 0.45)' }}
                    >
                      <div className="grid grid-cols-2 gap-3.5 relative z-10 items-stretch">
                        <div className="rounded-[18px] bg-gradient-to-br from-rose-950/85 to-slate-950/85 border border-rose-500/35 p-3 sm:p-4 flex flex-col items-center text-center justify-between backdrop-blur-md">
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-500/20 border border-rose-400/40 text-rose-200 text-[10px] font-black">
                            <AlertTriangle className="w-3 h-3 text-rose-400" />
                            <span>{activeConfig.slide1.beforeBadge}</span>
                          </span>

                          <div className={`my-2.5 w-full ${imgBoxMaxHeightClass} ${imageRadiusClass} bg-white p-2 shadow-inner flex items-center justify-center overflow-hidden`}>
                            <img
                              src={activeConfig.slide1.beforeImageUrl}
                              alt={activeConfig.slide1.beforeBadge}
                              className={`w-full h-full ${imageFitClass}`}
                            />
                          </div>

                          <p className="text-[11px] font-bold text-rose-200 leading-tight">
                            {activeConfig.slide1.beforeCaption}
                          </p>
                        </div>

                        <div className="rounded-[18px] bg-gradient-to-br from-[#0759A4]/60 to-emerald-950/80 border border-emerald-400/40 p-3 sm:p-4 flex flex-col items-center text-center justify-between backdrop-blur-md">
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/25 border border-emerald-400/45 text-emerald-200 text-[10px] font-black">
                            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                            <span>{activeConfig.slide1.afterBadge}</span>
                          </span>

                          <div className={`my-2.5 w-full ${imgBoxMaxHeightClass} ${imageRadiusClass} bg-white p-2.5 shadow-inner flex flex-col items-center justify-center gap-1.5 overflow-hidden`}>
                            {activeConfig.slide1.afterImageUrl ? (
                              <img
                                src={activeConfig.slide1.afterImageUrl}
                                alt={activeConfig.slide1.afterBadge}
                                className={`w-full h-full ${imageFitClass}`}
                              />
                            ) : (
                              <>
                                <Barcode className="w-16 h-14 text-slate-900 stroke-[1.6]" />
                                <span className="font-mono text-[11px] font-black text-[#0759A4] tracking-wider">
                                  {activeConfig.slide1.afterBarcodeSample}
                                </span>
                              </>
                            )}
                          </div>

                          <p className="text-[11px] font-bold text-emerald-200 leading-tight">
                            {activeConfig.slide1.afterCaption}
                          </p>
                        </div>
                      </div>

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

                      <div className="relative z-30 mt-3.5 flex justify-center">
                        <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/15 backdrop-blur-md border border-white/25 text-[11px] font-bold text-white shadow-lg">
                          <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                          <span>{activeConfig.slide1.floatingPillText}</span>
                        </span>
                      </div>
                    </div>
                  )}

                  {/* LAYOUT: SHOWCASE (Slide 2 default) */}
                  {stepLayout === 'showcase' && (
                    <div
                      className="rounded-[26px] backdrop-blur-xl border border-white/20 p-4 shadow-2xl space-y-3.5"
                      style={{ backgroundColor: activeStep.cardBgColor || 'rgba(255, 255, 255, 0.08)' }}
                    >
                      <div className={`${imageRadiusClass} overflow-hidden bg-white p-2 shadow-inner flex items-center justify-center ${imgBoxMaxHeightClass}`}>
                        <img
                          src={activeConfig.slide2.showcaseImageUrl}
                          alt="Fiche Produit Marjane"
                          className={`w-full h-full ${imgBoxMaxHeightClass} ${imageFitClass}`}
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        <div className="rounded-[16px] bg-white/[0.08] border border-white/15 p-3 flex items-start gap-2.5">
                          <div className="w-7 h-7 rounded-lg bg-[#0759A4] text-white font-black text-xs flex items-center justify-center shrink-0">
                            1
                          </div>
                          <div className="text-xs leading-snug" style={{ color: activeStep.textColor || 'rgba(255,255,255,0.85)' }}>
                            <span className="font-black text-white block mb-0.5">
                              {activeConfig.slide2.repere1Title}
                            </span>
                            <span>{activeConfig.slide2.repere1Text}</span>
                          </div>
                        </div>

                        <div className="rounded-[16px] bg-white/[0.08] border border-white/15 p-3 flex items-start gap-2.5">
                          <div className="w-7 h-7 rounded-lg bg-emerald-500 text-white font-black text-xs flex items-center justify-center shrink-0">
                            2
                          </div>
                          <div className="text-xs leading-snug" style={{ color: activeStep.textColor || 'rgba(255,255,255,0.85)' }}>
                            <span className="font-black text-white block mb-0.5 flex items-center gap-1">
                              <Scale className="w-3.5 h-3.5 text-emerald-300" />
                              <span>{activeConfig.slide2.repere2Title}</span>
                            </span>
                            <span>{activeConfig.slide2.repere2Text}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* LAYOUT: ACTIONS (Slide 3 default) */}
                  {stepLayout === 'actions' && (
                    <div className="space-y-3">
                      <button
                        type="button"
                        onClick={() => {
                          triggerHaptic('medium');
                          markAsSeen();
                          onClose();
                          if (onOpenTips) onOpenTips();
                        }}
                        className="w-full text-left rounded-[22px] hover:bg-white/[0.15] backdrop-blur-xl border border-amber-400/35 p-4 flex items-center gap-3.5 transition cursor-pointer group active:scale-[0.99]"
                        style={{ backgroundColor: activeStep.cardBgColor || 'rgba(255, 255, 255, 0.09)' }}
                      >
                        <div className="w-12 h-12 rounded-[16px] bg-amber-500/20 border border-amber-400/40 text-amber-300 flex items-center justify-center shrink-0">
                          <Lightbulb className="w-6 h-6" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm sm:text-base font-black text-white flex items-center gap-1.5">
                            <span>{activeConfig.slide3.card1Title}</span>
                            <ArrowRight className="w-4 h-4 text-amber-300 group-hover:translate-x-1 transition-transform" />
                          </h4>
                          <p className="text-xs mt-0.5 leading-snug" style={{ color: activeStep.textColor || 'rgba(255,255,255,0.75)' }}>
                            {activeConfig.slide3.card1Subtitle}
                          </p>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          triggerHaptic('medium');
                          const phone =
                            (activeConfig.slide3.card2WhatsappNumber || WHATSAPP_PHONE_NUMBER).replace(
                              /[^\d]/g,
                              ''
                            ) || WHATSAPP_PHONE_NUMBER;
                          const msg =
                            activeConfig.slide3.card2WhatsappMessage ||
                            "BONJOUR J'AI BESOIN D'AIDE SUR LIVRY FINDER :";
                          const url = `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`;
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
                  )}

                  {/* Custom Image (usable on Free layout AND as extra visual on any layout) */}
                  {activeStep.customImageUrl && (
                    <div
                      className="rounded-[26px] backdrop-blur-xl border border-white/20 p-4 shadow-2xl space-y-2.5"
                      style={{ backgroundColor: activeStep.cardBgColor || 'rgba(255, 255, 255, 0.08)' }}
                    >
                      <div className={`${imageRadiusClass} overflow-hidden bg-white/95 p-2 shadow-inner flex items-center justify-center ${imgBoxMaxHeightClass}`}>
                        <img
                          src={activeStep.customImageUrl}
                          alt={activeStep.headlineLine1}
                          className={`w-full h-full ${imgBoxMaxHeightClass} ${imageFitClass}`}
                        />
                      </div>
                      {activeStep.customImageCaption && (
                        <p
                          className="text-xs text-center font-medium"
                          style={{ color: activeStep.textColor || 'rgba(255, 255, 255, 0.8)' }}
                        >
                          {activeStep.customImageCaption}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Extra Custom Article Blocks rendered on ANY step */}
            {activeStep.customBlocks && activeStep.customBlocks.length > 0 && (
              <div className="space-y-3">
                {activeStep.customBlocks.map((blk) => (
                  <div
                    key={blk.id}
                    className="rounded-2xl backdrop-blur-xl border border-white/15 p-3.5 sm:p-4 space-y-2.5"
                    style={{ backgroundColor: activeStep.cardBgColor || 'rgba(255, 255, 255, 0.08)' }}
                  >
                    {blk.heading && (
                      <h4
                        className="text-sm font-black"
                        style={{ color: activeStep.titleColor || '#ffffff' }}
                      >
                        {blk.heading}
                      </h4>
                    )}
                    {blk.imageUrl && (
                      <div className={`${imageRadiusClass} overflow-hidden bg-black/25 border border-white/10`}>
                        <img
                          src={blk.imageUrl}
                          alt={blk.caption || blk.heading || 'Illustration'}
                          className={`w-full ${imgBoxMaxHeightClass} ${imageFitClass} mx-auto`}
                        />
                        {blk.caption && (
                          <p className="text-[11px] text-white/70 text-center py-1.5 px-2 bg-black/25">
                            {blk.caption}
                          </p>
                        )}
                      </div>
                    )}
                    {blk.text && (
                      <p
                        className="text-xs sm:text-sm leading-relaxed whitespace-pre-line"
                        style={{ color: activeStep.textColor || 'rgba(255, 255, 255, 0.85)' }}
                      >
                        {blk.text}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Primary & Secondary Action Buttons */}
            {(!activeStep.hidePrimaryCta || !activeStep.hideSecondaryCta) && (
              <div
                className={`pt-1 flex flex-wrap items-center gap-3 ${
                  textAlign === 'center'
                    ? 'justify-center'
                    : textAlign === 'right'
                      ? 'justify-end'
                      : 'justify-start'
                }`}
              >
                {!activeStep.hidePrimaryCta && (
                  <button
                    type="button"
                    onClick={handleNext}
                    className="px-6 py-3 rounded-xl font-black text-xs sm:text-sm shadow-[0_8px_28px_rgba(255,255,255,0.22)] active:scale-95 transition cursor-pointer flex items-center gap-2 hover:opacity-90"
                    style={{
                      backgroundColor: activeStep.ctaBgColor || '#ffffff',
                      color: activeStep.ctaTextColor || '#020617',
                    }}
                  >
                    {safeSlideIndex < totalSlides - 1 ? (
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
                )}

                {!activeStep.hideSecondaryCta &&
                  (safeSlideIndex > 0 ? (
                    <button
                      type="button"
                      onClick={handlePrev}
                      className="px-5 py-3 rounded-xl backdrop-blur-md border border-white/25 font-bold text-xs sm:text-sm active:scale-95 transition cursor-pointer flex items-center gap-1.5 hover:opacity-90"
                      style={{
                        backgroundColor:
                          activeStep.secondaryCtaBgColor || 'rgba(255, 255, 255, 0.1)',
                        color: activeStep.secondaryCtaTextColor || '#ffffff',
                      }}
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
                      className="px-5 py-3 rounded-xl backdrop-blur-md border border-amber-300/40 font-bold text-xs sm:text-sm active:scale-95 transition cursor-pointer flex items-center gap-1.5 hover:opacity-90"
                      style={{
                        backgroundColor:
                          activeStep.secondaryCtaBgColor || 'rgba(251, 191, 36, 0.25)',
                        color: activeStep.secondaryCtaTextColor || '#ffffff',
                      }}
                    >
                      <Play className="w-3 h-3 fill-current" />
                      <span>{activeStep.secondaryCtaLabel || "Chouf l'Astuces"}</span>
                    </button>
                  ))}
              </div>
            )}
          </div>

          {/* INTERACTIVE WORKFLOW SELECTOR RAIL (Desktop - Left, Right, or Hidden) */}
          {sidebarPos !== 'hidden' && (
            <div
              className={`hidden lg:flex lg:col-span-5 flex-col justify-center space-y-4 ${
                sidebarPos === 'left'
                  ? 'lg:order-1 pr-8 border-r border-white/15'
                  : 'lg:order-2 pl-8 border-l border-white/15'
              }`}
            >
              <span
                className="text-[11px] font-black uppercase tracking-[0.22em] px-2"
                style={{
                  color: activeConfig.summaryTextColor
                    ? activeConfig.summaryTextColor
                    : 'rgba(255, 255, 255, 0.45)',
                }}
              >
                {activeConfig.summaryTitle || 'Sommaire du Guide'}
              </span>

              <div className="flex flex-col space-y-2.5">
                {activeConfig.steps.map((step, idx) => {
                  const isActive = safeSlideIndex === idx;
                  return (
                    <button
                      key={`${step.id}-${idx}`}
                      type="button"
                      onClick={() => {
                        triggerHaptic('light');
                        setCurrentSlide(idx);
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
                          isActive ? 'font-black' : 'opacity-50 group-hover:opacity-90 font-bold'
                        }`}
                        style={{ color: activeConfig.summaryTextColor || '#ffffff' }}
                      >
                        {step.shortLabel}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="pt-4 px-3">
                <p
                  className="text-xs font-medium"
                  style={{
                    color: activeConfig.summaryTextColor
                      ? activeConfig.summaryTextColor
                      : 'rgba(255, 255, 255, 0.5)',
                  }}
                >
                  {activeConfig.footerHint}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

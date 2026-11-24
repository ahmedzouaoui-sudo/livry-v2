import React, { useState, useMemo, useRef } from 'react';
import {
  ArrowLeft,
  Lightbulb,
  Plus,
  Search,
  ThumbsUp,
  Trash2,
  X,
  Send,
  Camera,
  ZoomIn,
  Pencil,
  Check,
  Database,
  BookOpen,
  Play,
  ArrowRight,
  ArrowUp,
  ArrowDown,
  FileText,
  Image as ImageIcon,
  Type as TypeIcon,
  Layers,
  Loader2,
  AlertCircle,
  SlidersHorizontal,
  Save,
  RotateCcw,
  Megaphone,
  Code2,
  Copy,
  CloudUpload,
  Tag,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import {
  AstucesPageConfig,
  CategoryColorKey,
  CustomTipCategory,
  GuideConfig,
  TipArticleBlock,
  TipCategory,
  TipPost,
} from '../types';
import { triggerHaptic } from '../utils/haptics';
import { sanitizeImageUrl } from '../utils/securityUtils';
import { compressImageFileToDataUrl } from '../utils/imageCompress';
import { copyTextToClipboard } from '../utils/clipboard';
import {
  SUPABASE_ASTUCES_TABLE_SQL,
  checkAstucesTableStatus,
} from '../services/supabaseService';
import { DEFAULT_GUIDE_CONFIG } from '../services/guideContentService';
import { AppTutorialModal } from './AppTutorialModal';

interface AstucesScreenProps {
  onBack: () => void;
}

const makeBlockId = (): string =>
  `blk-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

export const AstucesScreen: React.FC<AstucesScreenProps> = ({ onBack }) => {
  const {
    tips,
    addTip,
    updateTip,
    deleteTip,
    likeTip,
    syncTipsNow,
    restoreDefaultTips,
    role,
    setActiveTab,
    guideConfig,
    updateGuideConfig,
    resetGuideConfig,
    showToast,
  } = useApp();

  const [searchTip, setSearchTip] = useState('');
  const [selectedCat, setSelectedCat] = useState<string>('ALL');
  const [audienceFilter, setAudienceFilter] = useState<'ALL' | 'Pickeur' | 'Livreur' | 'Référent'>('ALL');

  // Tutorial modal
  const [isTutorialOpen, setIsTutorialOpen] = useState(false);
  const [tutorialInitialSlide, setTutorialInitialSlide] = useState(0);
  const [tutorialDefaultEdit, setTutorialDefaultEdit] = useState(false);

  // Admin Page Customization Studio State (modify anything on Astuces page)
  const [isEditingPage, setIsEditingPage] = useState(false);
  const [pageHeroDraft, setPageHeroDraft] = useState<NonNullable<GuideConfig['heroBanner']>>(
    guideConfig.heroBanner || DEFAULT_GUIDE_CONFIG.heroBanner!
  );
  const [pageUiDraft, setPageUiDraft] = useState<AstucesPageConfig>(
    guideConfig.astucesPage || DEFAULT_GUIDE_CONFIG.astucesPage!
  );
  const [isSavingPage, setIsSavingPage] = useState(false);
  const [confirmPageReset, setConfirmPageReset] = useState(false);

  // Article Reader & Zoom Viewer
  const [readingTipId, setReadingTipId] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Composer / Editor Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTip, setEditingTip] = useState<TipPost | null>(null);
  const [formTitle, setFormTitle] = useState('');
  const [formCategory, setFormCategory] = useState<TipCategory>('');
  const [formTargetAudience, setFormTargetAudience] = useState<'Tous' | 'Pickeur' | 'Livreur' | 'Référent'>('Tous');
  const [formContent, setFormContent] = useState('');
  const [formAuthorName, setFormAuthorName] = useState('');
  const [formImageUrl, setFormImageUrl] = useState('');
  const [formBlocks, setFormBlocks] = useState<TipArticleBlock[]>([]);
  const [uploadingTarget, setUploadingTarget] = useState<string | null>(null);
  const [isSavingTip, setIsSavingTip] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Admin Custom Categories Manager State
  const [isManagingCategories, setIsManagingCategories] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryColor, setNewCategoryColor] = useState<CategoryColorKey>('blue');
  const [inlineModalCatName, setInlineModalCatName] = useState('');
  const [isSavingCategories, setIsSavingCategories] = useState(false);

  // Supabase Table SQL & Sync State for Astuces
  const [isAstucesSqlOpen, setIsAstucesSqlOpen] = useState(false);
  const [copiedAstucesSql, setCopiedAstucesSql] = useState(false);
  const [isSyncingTips, setIsSyncingTips] = useState(false);
  const [isRestoringDefaults, setIsRestoringDefaults] = useState(false);
  const [astucesTableStatus, setAstucesTableStatus] = useState<{
    exists: boolean;
    schema: 'public' | 'api';
    count: number;
  } | null>(null);
  const [isCheckingTable, setIsCheckingTable] = useState(false);

  const openAstucesSqlModal = async () => {
    setIsAstucesSqlOpen(true);
    setCopiedAstucesSql(false);
    setIsCheckingTable(true);
    try {
      const status = await checkAstucesTableStatus();
      setAstucesTableStatus(status);
    } finally {
      setIsCheckingTable(false);
    }
  };

  const handleSyncTipsCloud = async () => {
    triggerHaptic('medium');
    setIsSyncingTips(true);
    try {
      const res = await syncTipsNow();
      if (res.needsTableSql) {
        const status = await checkAstucesTableStatus();
        setAstucesTableStatus(status);
      }
    } finally {
      setIsSyncingTips(false);
    }
  };

  const handleRestoreDefaultsClick = async () => {
    triggerHaptic('medium');
    setIsRestoringDefaults(true);
    try {
      await restoreDefaultTips();
    } finally {
      setIsRestoringDefaults(false);
    }
  };

  const coverFileInputRef = useRef<HTMLInputElement>(null);
  const heroBgFileInputRef = useRef<HTMLInputElement>(null);

  const customCategories: CustomTipCategory[] = useMemo(() => {
    const src = isEditingPage
      ? pageUiDraft.customCategories
      : guideConfig.astucesPage?.customCategories;
    return Array.isArray(src) ? src : [];
  }, [isEditingPage, pageUiDraft.customCategories, guideConfig.astucesPage?.customCategories]);

  const CATEGORY_PALETTE: Record<
    CategoryColorKey,
    { label: string; bg: string; text: string; border: string; swatch: string }
  > = {
    blue: { label: 'Bleu', bg: '#EBF4FC', text: '#0759A4', border: '#D0E3F7', swatch: '#0759A4' },
    emerald: { label: 'Vert', bg: '#E8F5E9', text: '#1B5E20', border: '#C8E6C9', swatch: '#16A34A' },
    amber: { label: 'Ambre', bg: '#FEF3C7', text: '#92400E', border: '#FDE68A', swatch: '#D97706' },
    rose: { label: 'Rose', bg: '#FFEBEE', text: '#B71C1C', border: '#FFCDD2', swatch: '#E11D48' },
    purple: { label: 'Violet', bg: '#F3E8FF', text: '#6B21A8', border: '#E9D5FF', swatch: '#9333EA' },
    orange: { label: 'Orange', bg: '#FFF3E0', text: '#E65100', border: '#FFE0B2', swatch: '#EA580C' },
    slate: { label: 'Ardoise', bg: '#F1F5F9', text: '#334155', border: '#CBD5E1', swatch: '#475569' },
  };

  const getCategoryColor = (catName: TipCategory) => {
    const matched = customCategories.find(
      (c) => c.name.toLowerCase() === (catName || '').trim().toLowerCase()
    );
    const key: CategoryColorKey = matched?.color || 'slate';
    return CATEGORY_PALETTE[key] || CATEGORY_PALETTE.slate;
  };

  const persistCustomCategories = async (nextCats: CustomTipCategory[]) => {
    setIsSavingCategories(true);
    try {
      const updatedAstuces = {
        ...(guideConfig.astucesPage || DEFAULT_GUIDE_CONFIG.astucesPage!),
        customCategories: nextCats,
      };
      if (isEditingPage) {
        setPageUiDraft((prev) => ({ ...prev, customCategories: nextCats }));
      }
      const res = await updateGuideConfig({
        ...guideConfig,
        astucesPage: updatedAstuces,
      });
      return res;
    } finally {
      setIsSavingCategories(false);
    }
  };

  const handleAddCustomCategory = async (
    rawName: string,
    color: CategoryColorKey = newCategoryColor
  ): Promise<string | null> => {
    const clean = rawName.trim();
    if (!clean) {
      showToast('⚠️ Écrivez un nom de catégorie');
      return null;
    }
    const existing = customCategories.find(
      (c) => c.name.toLowerCase() === clean.toLowerCase()
    );
    if (existing) {
      showToast('ℹ️ Cette catégorie existe déjà');
      return existing.name;
    }
    triggerHaptic('light');
    const newItem: CustomTipCategory = {
      id: `cat-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: clean,
      color,
    };
    const nextCats = [...customCategories, newItem];
    const res = await persistCustomCategories(nextCats);
    setNewCategoryName('');
    setInlineModalCatName('');
    if (res.success) {
      showToast(`🏷️ Catégorie "${clean}" ajoutée & sauvegardée !`);
    } else {
      showToast(`🏷️ Catégorie "${clean}" ajoutée localement`);
    }
    return newItem.name;
  };

  const handleDeleteCustomCategory = async (catId: string, catName: string) => {
    triggerHaptic('warning');
    const nextCats = customCategories.filter((c) => c.id !== catId);
    if (selectedCat === catName) setSelectedCat('ALL');
    if (formCategory === catName) setFormCategory('');
    await persistCustomCategories(nextCats);
    showToast(`🗑️ Catégorie "${catName}" supprimée`);
  };

  const handleChangeCategoryColor = async (catId: string, color: CategoryColorKey) => {
    triggerHaptic('light');
    const nextCats = customCategories.map((c) => (c.id === catId ? { ...c, color } : c));
    await persistCustomCategories(nextCats);
  };

  const getAudienceBadge = (audience?: 'Tous' | 'Pickeur' | 'Livreur' | 'Référent') => {
    switch (audience) {
      case 'Pickeur':
        return { label: '🛒 Pickeurs', bg: '#EBF4FC', text: '#0759A4', border: '#B9DBF8' };
      case 'Livreur':
        return { label: '🛵 Livreurs', bg: '#EAF8F1', text: '#1E8E55', border: '#B7EACD' };
      case 'Référent':
        return { label: '⭐ Référents', bg: '#FFF3E0', text: '#E65100', border: '#FFE0B2' };
      default:
        return { label: '👥 Tous', bg: '#F3E8FF', text: '#6B21A8', border: '#E9D5FF' };
    }
  };

  const getCoverImage = (post: TipPost): string | undefined => {
    const direct = sanitizeImageUrl(post.imageUrl);
    if (direct) return direct;
    const firstBlockImg = post.blocks?.find((b) => sanitizeImageUrl(b.imageUrl))?.imageUrl;
    return sanitizeImageUrl(firstBlockImg);
  };

  const filteredTips = useMemo(() => {
    return tips.filter((t) => {
      if (audienceFilter !== 'ALL') {
        const aud = t.targetAudience || 'Tous';
        if (aud !== 'Tous' && aud !== audienceFilter) {
          return false;
        }
      }
      if (selectedCat !== 'ALL' && t.category !== selectedCat) {
        return false;
      }
      if (!searchTip.trim()) return true;
      const q = searchTip.toLowerCase();
      const blocksText = (t.blocks || [])
        .map((b) => `${b.heading || ''} ${b.text || ''} ${b.caption || ''}`)
        .join(' ')
        .toLowerCase();
      return (
        t.title.toLowerCase().includes(q) ||
        t.content.toLowerCase().includes(q) ||
        blocksText.includes(q) ||
        (t.authorName && t.authorName.toLowerCase().includes(q))
      );
    });
  }, [tips, audienceFilter, selectedCat, searchTip]);

  const readingArticle = useMemo(
    () => (readingTipId ? tips.find((t) => t.id === readingTipId) || null : null),
    [tips, readingTipId]
  );

  // Open modal for new article/tip
  const handleOpenCreate = () => {
    setEditingTip(null);
    setFormTitle('');
    setFormCategory(customCategories[0]?.name || '');
    setFormTargetAudience('Tous');
    setFormContent('');
    setFormAuthorName('Admin Livry');
    setFormImageUrl('');
    setFormBlocks([]);
    setInlineModalCatName('');
    setFormError(null);
    setIsModalOpen(true);
  };

  // Open modal for editing article/tip
  const handleOpenEdit = (tip: TipPost) => {
    setEditingTip(tip);
    setFormTitle(tip.title);
    setFormCategory(tip.category || '');
    setFormTargetAudience(tip.targetAudience || 'Tous');
    setFormContent(tip.content);
    setFormAuthorName(tip.authorName || 'Admin Livry');
    setFormImageUrl(tip.imageUrl || '');
    setFormBlocks(tip.blocks ? tip.blocks.map((b) => ({ ...b })) : []);
    setInlineModalCatName('');
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleCoverFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setUploadingTarget('cover');
    try {
      const dataUrl = await compressImageFileToDataUrl(file, 900, 0.78);
      setFormImageUrl(dataUrl);
    } catch (err) {
      console.error(err);
      showToast('❌ Impossible de lire cette image');
    } finally {
      setUploadingTarget(null);
    }
  };

  const handleBlockFileChange = async (blockId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setUploadingTarget(blockId);
    try {
      const dataUrl = await compressImageFileToDataUrl(file, 900, 0.78);
      setFormBlocks((prev) =>
        prev.map((b) => (b.id === blockId ? { ...b, imageUrl: dataUrl } : b))
      );
    } catch (err) {
      console.error(err);
      showToast('❌ Impossible de lire cette image');
    } finally {
      setUploadingTarget(null);
    }
  };

  const addArticleBlock = (type: TipArticleBlock['type']) => {
    triggerHaptic('light');
    setFormBlocks((prev) => [
      ...prev,
      {
        id: makeBlockId(),
        type,
        heading: '',
        text: type !== 'image' ? '' : undefined,
        imageUrl: type !== 'text' ? '' : undefined,
        caption: type !== 'text' ? '' : undefined,
      },
    ]);
  };

  const updateArticleBlock = (id: string, patch: Partial<TipArticleBlock>) => {
    setFormBlocks((prev) => prev.map((b) => (b.id === id ? { ...b, ...patch } : b)));
  };

  const moveArticleBlock = (index: number, delta: -1 | 1) => {
    const target = index + delta;
    if (target < 0 || target >= formBlocks.length) return;
    setFormBlocks((prev) => {
      const next = [...prev];
      const [moved] = next.splice(index, 1);
      next.splice(target, 0, moved);
      return next;
    });
  };

  const removeArticleBlock = (id: string) => {
    setFormBlocks((prev) => prev.filter((b) => b.id !== id));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const trimmedTitle = formTitle.trim();
    const trimmedContent = formContent.trim();
    const safeCover = sanitizeImageUrl(formImageUrl);

    const cleanBlocks: TipArticleBlock[] = formBlocks
      .map((b) => ({
        ...b,
        heading: b.heading?.trim() || undefined,
        text: b.text?.trim() || undefined,
        imageUrl: sanitizeImageUrl(b.imageUrl),
        caption: b.caption?.trim() || undefined,
      }))
      .filter((b) => b.heading || b.text || b.imageUrl);

    if (!trimmedTitle) {
      setFormError("Le titre de l'article / astuce est obligatoire.");
      return;
    }

    if (!trimmedContent && !safeCover && cleanBlocks.length === 0) {
      setFormError('Ajoutez une introduction, une photo ou au moins une section dans votre article.');
      return;
    }

    setIsSavingTip(true);
    try {
      let res: { success: boolean; error?: string };
      if (editingTip) {
        res = await updateTip({
          ...editingTip,
          title: trimmedTitle,
          category: formCategory,
          targetAudience: formTargetAudience,
          content: trimmedContent,
          authorName: formAuthorName.trim() || editingTip.authorName,
          imageUrl: safeCover,
          blocks: cleanBlocks.length > 0 ? cleanBlocks : undefined,
        });
      } else {
        res = await addTip({
          title: trimmedTitle,
          category: formCategory,
          targetAudience: formTargetAudience,
          content: trimmedContent,
          authorRole: role,
          authorName: formAuthorName.trim() || `${role} Livry`,
          imageUrl: safeCover,
          blocks: cleanBlocks.length > 0 ? cleanBlocks : undefined,
        });
      }

      if (res.success) {
        setIsModalOpen(false);
        setEditingTip(null);
      } else {
        setFormError(res.error || 'Erreur lors de la sauvegarde sur Supabase.');
      }
    } finally {
      setIsSavingTip(false);
    }
  };

  const handleDeleteClick = async (tipId: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (confirmDeleteId !== tipId) {
      setConfirmDeleteId(tipId);
      setTimeout(() => {
        setConfirmDeleteId((prev) => (prev === tipId ? null : prev));
      }, 3500);
      return;
    }
    setConfirmDeleteId(null);
    const res = await deleteTip(tipId);
    if (res.success && readingTipId === tipId) {
      setReadingTipId(null);
    }
  };

  const handleTogglePageEditor = () => {
    triggerHaptic('light');
    if (!isEditingPage) {
      setPageHeroDraft(guideConfig.heroBanner || DEFAULT_GUIDE_CONFIG.heroBanner!);
      setPageUiDraft(guideConfig.astucesPage || DEFAULT_GUIDE_CONFIG.astucesPage!);
      setConfirmPageReset(false);
      setIsEditingPage(true);
    } else {
      setIsEditingPage(false);
    }
  };

  const handleHeroBgFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setUploadingTarget('hero_bg');
    try {
      const dataUrl = await compressImageFileToDataUrl(file, 960, 0.78);
      setPageUiDraft((prev) => ({ ...prev, heroBgImageUrl: dataUrl }));
      showToast('📸 Photo de fond importée !');
    } catch {
      showToast('❌ Impossible de lire cette image');
    } finally {
      setUploadingTarget(null);
    }
  };

  const handleSavePageConfig = async () => {
    triggerHaptic('medium');
    setIsSavingPage(true);
    try {
      const res = await updateGuideConfig({
        ...guideConfig,
        heroBanner: pageHeroDraft,
        astucesPage: {
          ...pageUiDraft,
          heroBgImageUrl: pageUiDraft.heroBgImageUrl
            ? sanitizeImageUrl(pageUiDraft.heroBgImageUrl) || ''
            : '',
        },
      });
      if (res.success) {
        triggerHaptic('success');
        setIsEditingPage(false);
        showToast('✅ Page Astuces mise à jour & sauvegardée sur Supabase !');
      } else {
        showToast(`⚠️ Sauvegardé localement (${res.error || 'Cloud indisponible'})`);
      }
    } finally {
      setIsSavingPage(false);
    }
  };

  const handleResetPageConfig = async () => {
    triggerHaptic('warning');
    setIsSavingPage(true);
    try {
      const res = await resetGuideConfig();
      setPageHeroDraft(res.config.heroBanner || DEFAULT_GUIDE_CONFIG.heroBanner!);
      setPageUiDraft(res.config.astucesPage || DEFAULT_GUIDE_CONFIG.astucesPage!);
      setConfirmPageReset(false);
      setIsEditingPage(false);
      showToast('🔄 Textes & bannière de la page réinitialisés');
    } finally {
      setIsSavingPage(false);
    }
  };

  const activeAstucesUi = isEditingPage
    ? pageUiDraft
    : guideConfig.astucesPage || DEFAULT_GUIDE_CONFIG.astucesPage!;
  const activeHero = isEditingPage
    ? pageHeroDraft
    : guideConfig.heroBanner || DEFAULT_GUIDE_CONFIG.heroBanner!;

  const heroBadge = activeHero.badge || 'Guide Officiel Pickeur';
  const heroHeadline = activeHero.headline || "Kifach tkhdam b'Livry Finder b'ser3a";
  const heroSubtitle =
    activeHero.subtitle ||
    "Ticket Mizan vs Finder, qra2a dyal fiche produit, u kifach t’solvi chi article bloqué.";
  const heroCta = activeHero.ctaLabel || "Chouf l'Guide";
  const heroBgImg = sanitizeImageUrl(activeAstucesUi.heroBgImageUrl);

  return (
    <div className="w-full max-w-[740px] mx-auto px-3.5 py-3 pb-24 flex flex-col min-h-[calc(100vh-65px)]">
      {/* Top Header with Back button and Admin controls */}
      <div className="flex items-center justify-between gap-1.5 sm:gap-2.5 mb-3 flex-wrap">
        <button
          type="button"
          onClick={() => {
            triggerHaptic('light');
            onBack();
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-gray-800 dark:text-slate-100 glass-surface hover:bg-white/90 dark:hover:bg-slate-800/80 active:scale-95 transition font-bold text-xs shrink-0 cursor-pointer select-none"
        >
          <ArrowLeft className="w-4 h-4 text-[#0759A4] dark:text-blue-400" />
          <span>{activeAstucesUi.backLabel}</span>
        </button>

        <div className="flex items-center gap-1.5">
          <Lightbulb className="w-4 h-4 text-amber-500 fill-amber-500" />
          <h1 className="text-sm sm:text-base font-extrabold text-gray-900 dark:text-white tracking-tight">
            {activeAstucesUi.pageTitle}
          </h1>
        </div>

        {/* Only Admin can customize page, open Data, or publish articles */}
        {role === 'Admin' ? (
          <div className="flex items-center gap-1.5 flex-wrap ml-auto">
            <button
              type="button"
              onClick={handleTogglePageEditor}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-black transition active:scale-95 cursor-pointer shadow-2xs select-none border ${
                isEditingPage
                  ? 'bg-emerald-500 text-white border-emerald-400'
                  : 'bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800 hover:bg-amber-100 dark:hover:bg-amber-900/50'
              }`}
              title="Modifier n'importe quel texte, bannière ou image de cette page"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span className="hidden xs:inline">
                {isEditingPage ? 'Fermer éditeur' : 'Personnaliser'}
              </span>
            </button>
            <button
              type="button"
              onClick={handleSyncTipsCloud}
              disabled={isSyncingTips}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 text-xs font-black transition active:scale-95 cursor-pointer shadow-2xs select-none disabled:opacity-50"
              title="Enregistrer toutes les astuces sur Supabase"
            >
              {isSyncingTips ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <CloudUpload className="w-3.5 h-3.5" />
              )}
              <span className="hidden xs:inline">Sauver Cloud</span>
            </button>
            <button
              type="button"
              onClick={openAstucesSqlModal}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-100 text-slate-800 hover:bg-slate-200 border border-slate-200 text-xs font-black transition active:scale-95 cursor-pointer shadow-2xs select-none"
              title="Script SQL pour créer la table astuces sur Supabase"
            >
              <Code2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">SQL Table</span>
            </button>
            <button
              type="button"
              onClick={() => {
                triggerHaptic('medium');
                setActiveTab('admin');
              }}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-[#0759A4] border border-blue-200 text-xs font-black transition active:scale-95 cursor-pointer shadow-2xs select-none"
              title="Ouvrir le panneau Données & Base Supabase"
            >
              <Database className="w-3.5 h-3.5" />
              <span className="hidden xs:inline">Data</span>
            </button>
            <button
              type="button"
              onClick={() => {
                triggerHaptic('light');
                handleOpenCreate();
              }}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-[#0759A4] hover:bg-blue-700 text-white font-bold text-xs shadow-xs active:scale-95 transition cursor-pointer select-none"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Nouvel article</span>
            </button>
          </div>
        ) : (
          <div className="w-12" />
        )}
      </div>

      {/* Admin Full Page Studio Editor (Edit ANY element on Astuces Page) */}
      {role === 'Admin' && isEditingPage && (
        <div className="mb-4 rounded-[22px] bg-slate-950/95 text-white border border-white/20 p-4 shadow-2xl space-y-4 animate-in fade-in duration-150">
          <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-white/10">
            <div>
              <h3 className="text-xs sm:text-sm font-black flex items-center gap-1.5">
                <SlidersHorizontal className="w-4 h-4 text-amber-400" />
                <span>Éditeur Libre — Page Astuces &amp; Bannière Guide</span>
              </h3>
              <p className="text-[10.5px] text-white/65">
                Modifiez n&apos;importe quel texte, annonce, filtre ou image de la page — sauvegardé sur Supabase.
              </p>
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              {!confirmPageReset ? (
                <button
                  type="button"
                  onClick={() => setConfirmPageReset(true)}
                  className="px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold flex items-center gap-1 cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Reset</span>
                </button>
              ) : (
                <div className="flex items-center gap-1 bg-red-950/80 border border-red-400/40 px-2 py-1 rounded-xl text-[11px]">
                  <span className="font-bold text-red-200">Reset ?</span>
                  <button
                    type="button"
                    onClick={handleResetPageConfig}
                    disabled={isSavingPage}
                    className="px-2 py-0.5 rounded bg-red-600 font-black cursor-pointer"
                  >
                    Oui
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmPageReset(false)}
                    className="px-2 py-0.5 rounded bg-white/10 font-bold cursor-pointer"
                  >
                    Non
                  </button>
                </div>
              )}
              <button
                type="button"
                onClick={handleSavePageConfig}
                disabled={isSavingPage}
                className="px-3.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white text-xs font-black flex items-center gap-1.5 shadow-md cursor-pointer"
              >
                {isSavingPage ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Save className="w-3.5 h-3.5" />
                )}
                <span>{isSavingPage ? 'Sauvegarde...' : 'Enregistrer sur Supabase'}</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 text-xs">
            <div>
              <label className="block text-[10px] font-bold text-white/65 mb-1">
                Titre de la page
              </label>
              <input
                type="text"
                value={pageUiDraft.pageTitle}
                onChange={(e) => setPageUiDraft({ ...pageUiDraft, pageTitle: e.target.value })}
                className="w-full px-2.5 py-1.5 rounded-xl bg-white/10 border border-white/15 text-white outline-none"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-white/65 mb-1">
                Bouton Retour
              </label>
              <input
                type="text"
                value={pageUiDraft.backLabel}
                onChange={(e) => setPageUiDraft({ ...pageUiDraft, backLabel: e.target.value })}
                className="w-full px-2.5 py-1.5 rounded-xl bg-white/10 border border-white/15 text-white outline-none"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-white/65 mb-1">
                Placeholder Recherche
              </label>
              <input
                type="text"
                value={pageUiDraft.searchPlaceholder}
                onChange={(e) =>
                  setPageUiDraft({ ...pageUiDraft, searchPlaceholder: e.target.value })
                }
                className="w-full px-2.5 py-1.5 rounded-xl bg-white/10 border border-white/15 text-white outline-none"
              />
            </div>
            <div className="sm:col-span-2 lg:col-span-3">
              <label className="block text-[10px] font-bold text-amber-300 mb-1">
                Bandeau Annonce en haut de page (optionnel — laissez vide pour masquer)
              </label>
              <input
                type="text"
                value={pageUiDraft.topNotice || ''}
                onChange={(e) => setPageUiDraft({ ...pageUiDraft, topNotice: e.target.value })}
                placeholder="ex: Rappel : vérifiez toujours le code-barres secours avant d'annuler..."
                className="w-full px-2.5 py-1.5 rounded-xl bg-white/10 border border-white/15 text-white outline-none"
              />
            </div>

            {/* Hero Card fields */}
            <div>
              <label className="block text-[10px] font-bold text-sky-300 mb-1">
                Carte Guide — Badge
              </label>
              <input
                type="text"
                value={pageHeroDraft.badge}
                onChange={(e) => setPageHeroDraft({ ...pageHeroDraft, badge: e.target.value })}
                className="w-full px-2.5 py-1.5 rounded-xl bg-white/10 border border-white/15 text-white outline-none"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-sky-300 mb-1">
                Carte Guide — Titre principal
              </label>
              <input
                type="text"
                value={pageHeroDraft.headline}
                onChange={(e) => setPageHeroDraft({ ...pageHeroDraft, headline: e.target.value })}
                className="w-full px-2.5 py-1.5 rounded-xl bg-white/10 border border-white/15 text-white outline-none"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-sky-300 mb-1">
                Carte Guide — Bouton CTA
              </label>
              <input
                type="text"
                value={pageHeroDraft.ctaLabel}
                onChange={(e) => setPageHeroDraft({ ...pageHeroDraft, ctaLabel: e.target.value })}
                className="w-full px-2.5 py-1.5 rounded-xl bg-white/10 border border-white/15 text-white outline-none"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-[10px] font-bold text-sky-300 mb-1">
                Carte Guide — Sous-titre
              </label>
              <input
                type="text"
                value={pageHeroDraft.subtitle}
                onChange={(e) => setPageHeroDraft({ ...pageHeroDraft, subtitle: e.target.value })}
                className="w-full px-2.5 py-1.5 rounded-xl bg-white/10 border border-white/15 text-white outline-none"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-sky-300 mb-1">
                Image fond Carte Guide (optionnelle)
              </label>
              <div className="flex items-center gap-1">
                <input
                  type="file"
                  ref={heroBgFileInputRef}
                  onChange={handleHeroBgFileChange}
                  accept="image/*"
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => heroBgFileInputRef.current?.click()}
                  className="px-2.5 py-1.5 rounded-xl bg-sky-500/30 hover:bg-sky-500/45 border border-sky-400/40 text-white font-bold flex items-center gap-1 shrink-0 cursor-pointer"
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>{uploadingTarget === 'hero_bg' ? '...' : 'Photo'}</span>
                </button>
                <input
                  type="url"
                  value={
                    (pageUiDraft.heroBgImageUrl || '').startsWith('data:')
                      ? ''
                      : pageUiDraft.heroBgImageUrl || ''
                  }
                  onChange={(e) =>
                    setPageUiDraft({ ...pageUiDraft, heroBgImageUrl: e.target.value })
                  }
                  placeholder="https://..."
                  className="flex-1 min-w-0 px-2 py-1.5 rounded-xl bg-white/10 border border-white/15 text-white outline-none"
                />
                {pageUiDraft.heroBgImageUrl && (
                  <button
                    type="button"
                    onClick={() => setPageUiDraft({ ...pageUiDraft, heroBgImageUrl: '' })}
                    className="p-1.5 rounded-xl bg-red-500/30 text-red-200 cursor-pointer"
                    title="Retirer photo de fond"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>

            {/* Filter tab labels & empty state */}
            <div>
              <label className="block text-[10px] font-bold text-white/65 mb-1">Onglet Tous</label>
              <input
                type="text"
                value={pageUiDraft.audienceAllLabel}
                onChange={(e) =>
                  setPageUiDraft({ ...pageUiDraft, audienceAllLabel: e.target.value })
                }
                className="w-full px-2.5 py-1.5 rounded-xl bg-white/10 border border-white/15 text-white outline-none"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-white/65 mb-1">
                Onglet Pickeurs
              </label>
              <input
                type="text"
                value={pageUiDraft.audiencePickeurLabel}
                onChange={(e) =>
                  setPageUiDraft({ ...pageUiDraft, audiencePickeurLabel: e.target.value })
                }
                className="w-full px-2.5 py-1.5 rounded-xl bg-white/10 border border-white/15 text-white outline-none"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-white/65 mb-1">
                Onglet Livreurs
              </label>
              <input
                type="text"
                value={pageUiDraft.audienceLivreurLabel}
                onChange={(e) =>
                  setPageUiDraft({ ...pageUiDraft, audienceLivreurLabel: e.target.value })
                }
                className="w-full px-2.5 py-1.5 rounded-xl bg-white/10 border border-white/15 text-white outline-none"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-white/65 mb-1">
                Onglet Référents
              </label>
              <input
                type="text"
                value={pageUiDraft.audienceReferentLabel}
                onChange={(e) =>
                  setPageUiDraft({ ...pageUiDraft, audienceReferentLabel: e.target.value })
                }
                className="w-full px-2.5 py-1.5 rounded-xl bg-white/10 border border-white/15 text-white outline-none"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-white/65 mb-1">
                Libellé Toutes Catégories
              </label>
              <input
                type="text"
                value={pageUiDraft.allCategoriesLabel}
                onChange={(e) =>
                  setPageUiDraft({ ...pageUiDraft, allCategoriesLabel: e.target.value })
                }
                className="w-full px-2.5 py-1.5 rounded-xl bg-white/10 border border-white/15 text-white outline-none"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-white/65 mb-1">
                Texte si liste vide
              </label>
              <input
                type="text"
                value={pageUiDraft.emptyTitle}
                onChange={(e) => setPageUiDraft({ ...pageUiDraft, emptyTitle: e.target.value })}
                className="w-full px-2.5 py-1.5 rounded-xl bg-white/10 border border-white/15 text-white outline-none"
              />
            </div>
          </div>
        </div>
      )}

      {/* Optional Admin Custom Top Announcement Banner */}
      {activeAstucesUi.topNotice && (
        <div className="mb-3 rounded-2xl bg-amber-50/90 dark:bg-amber-950/45 border border-amber-300/80 dark:border-amber-700/60 px-3.5 py-2.5 flex items-start gap-2.5 text-amber-950 dark:text-amber-100 shadow-2xs">
          <Megaphone className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <p className="text-xs font-bold leading-snug whitespace-pre-line">
            {activeAstucesUi.topNotice}
          </p>
        </div>
      )}

      {/* Official Tutorial Callout Hero */}
      <div
        className="mb-3.5 relative rounded-[24px] p-4 sm:p-5 text-white overflow-hidden border border-white/20 shadow-[0_16px_44px_rgba(7,11,20,0.32)]"
        style={{
          background:
            'radial-gradient(ellipse 80% 75% at 45% 45%, rgba(168, 22, 68, 0.52) 0%, rgba(7, 89, 164, 0.36) 52%, rgba(8, 11, 22, 0.97) 100%)',
        }}
      >
        {heroBgImg && (
          <img
            src={heroBgImg}
            alt=""
            className="pointer-events-none absolute inset-0 w-full h-full object-cover opacity-25 mix-blend-luminosity"
          />
        )}
        <svg
          className="pointer-events-none absolute inset-0 w-full h-full opacity-55"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <line x1="48" y1="100" x2="72" y2="0" stroke="#EC4899" strokeWidth="0.6" />
        </svg>

        <div className="relative z-10 grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
          <div className="sm:col-span-7 space-y-2.5">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/12 backdrop-blur-md border border-white/20 text-[10px] font-bold text-white/95">
              <BookOpen className="w-3 h-3 text-rose-400" />
              <span>{heroBadge}</span>
              <ArrowRight className="w-3 h-3 text-rose-400" />
            </div>

            <h2 className="text-lg sm:text-xl font-black leading-[1.12] tracking-tight text-white">
              {heroHeadline}
            </h2>

            <p className="text-[11px] text-white/75 leading-relaxed">{heroSubtitle}</p>

            <div className="flex items-center gap-2 pt-0.5 flex-wrap">
              <button
                type="button"
                onClick={() => {
                  triggerHaptic('medium');
                  setTutorialInitialSlide(0);
                  setTutorialDefaultEdit(false);
                  setIsTutorialOpen(true);
                }}
                className="px-4 py-2 rounded-xl bg-white text-slate-950 hover:bg-white/90 active:scale-95 text-xs font-black shadow-lg transition flex items-center gap-1.5 cursor-pointer select-none"
              >
                <span>{heroCta}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
              {role === 'Admin' && (
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic('light');
                    setTutorialInitialSlide(0);
                    setTutorialDefaultEdit(true);
                    setIsTutorialOpen(true);
                  }}
                  className="px-3 py-2 rounded-xl bg-white/12 hover:bg-white/20 text-white border border-white/20 text-[11px] font-bold transition flex items-center gap-1 cursor-pointer"
                >
                  <Pencil className="w-3 h-3" />
                  <span>Modifier le guide</span>
                </button>
              )}
            </div>
          </div>

          <div className="sm:col-span-5 flex flex-col space-y-1 sm:pl-3 sm:border-l sm:border-white/15 max-h-44 overflow-y-auto no-scrollbar">
            {guideConfig.steps.map((step, i) => (
              <button
                key={`${step.id}-${i}`}
                type="button"
                onClick={() => {
                  triggerHaptic('light');
                  setTutorialInitialSlide(i);
                  setTutorialDefaultEdit(false);
                  setIsTutorialOpen(true);
                }}
                className={`group flex items-center gap-2 text-left py-1.5 px-2.5 rounded-xl transition cursor-pointer shrink-0 ${
                  i === 0
                    ? 'bg-white/12 backdrop-blur-md border border-white/20 text-white font-black'
                    : 'text-white/60 hover:text-white hover:bg-white/8 font-bold'
                }`}
              >
                <Play
                  className={`w-2.5 h-2.5 shrink-0 transition-opacity ${
                    i === 0
                      ? 'text-rose-500 fill-rose-500 opacity-100'
                      : 'text-rose-400 fill-rose-400 opacity-0 group-hover:opacity-80'
                  }`}
                />
                <span className="text-xs truncate">{step.shortLabel}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Target Audience Filter */}
      <div className="mb-2.5 glass-surface p-1 rounded-2xl grid grid-cols-4 gap-1">
        <button
          type="button"
          onClick={() => setAudienceFilter('ALL')}
          className={`py-1.5 px-1 sm:px-2 rounded-xl text-[11px] sm:text-xs font-bold transition text-center cursor-pointer select-none truncate ${
            audienceFilter === 'ALL'
              ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 shadow-xs'
              : 'text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800'
          }`}
        >
          {activeAstucesUi.audienceAllLabel}
        </button>
        <button
          type="button"
          onClick={() => setAudienceFilter('Pickeur')}
          className={`py-1.5 px-1 sm:px-2 rounded-xl text-[11px] sm:text-xs font-bold transition text-center cursor-pointer select-none truncate ${
            audienceFilter === 'Pickeur'
              ? 'bg-[#0759A4] text-white shadow-xs'
              : 'text-[#0759A4] dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40'
          }`}
        >
          {activeAstucesUi.audiencePickeurLabel}
        </button>
        <button
          type="button"
          onClick={() => setAudienceFilter('Livreur')}
          className={`py-1.5 px-1 sm:px-2 rounded-xl text-[11px] sm:text-xs font-bold transition text-center cursor-pointer select-none truncate ${
            audienceFilter === 'Livreur'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40'
          }`}
        >
          {activeAstucesUi.audienceLivreurLabel}
        </button>
        <button
          type="button"
          onClick={() => setAudienceFilter('Référent')}
          className={`py-1.5 px-1 sm:px-2 rounded-xl text-[11px] sm:text-xs font-bold transition text-center cursor-pointer select-none truncate ${
            audienceFilter === 'Référent'
              ? 'bg-amber-600 text-white shadow-xs'
              : 'text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40'
          }`}
        >
          {activeAstucesUi.audienceReferentLabel}
        </button>
      </div>

      {/* Search Bar + Alphabetical Sort */}
      <div className="mb-2.5 flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1 glass-surface rounded-2xl focus-within:border-[#0759A4] transition-colors">
          <div className="flex items-center h-[44px] px-3.5">
            <Search className="w-4 h-4 text-gray-400 mr-2.5 shrink-0" />
            <input
              type="text"
              value={searchTip}
              onChange={(e) => setSearchTip(e.target.value)}
              placeholder={activeAstucesUi.searchPlaceholder}
              className="w-full h-full bg-transparent border-none outline-none text-xs font-medium text-gray-900 dark:text-white placeholder-gray-400"
            />
            {searchTip && (
              <button
                type="button"
                onClick={() => setSearchTip('')}
                className="p-1 rounded-full text-gray-400 hover:text-gray-600 dark:hover:text-white cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Admin Custom Category Filter Bar (Only user-created categories + Admin create control) */}
      {(customCategories.length > 0 || role === 'Admin') && (
        <div className="mb-3.5 space-y-2">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
            <button
              type="button"
              onClick={() => setSelectedCat('ALL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition shrink-0 cursor-pointer select-none whitespace-nowrap ${
                selectedCat === 'ALL'
                  ? 'bg-gray-900 text-white shadow-xs'
                  : 'glass-pill text-gray-700 hover:bg-white/90'
              }`}
            >
              {activeAstucesUi.allCategoriesLabel || 'Toutes'}
            </button>

            {customCategories.map((cat) => {
              const isSel = selectedCat === cat.name;
              const pal = CATEGORY_PALETTE[cat.color || 'blue'] || CATEGORY_PALETTE.blue;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCat(cat.name)}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold transition shrink-0 cursor-pointer select-none whitespace-nowrap border"
                  style={
                    isSel
                      ? {
                          backgroundColor: pal.swatch,
                          color: '#ffffff',
                          borderColor: pal.swatch,
                        }
                      : {
                          backgroundColor: '#ffffff',
                          color: pal.text,
                          borderColor: pal.border,
                        }
                  }
                >
                  {cat.name}
                </button>
              );
            })}

            {role === 'Admin' && (
              <button
                type="button"
                onClick={() => {
                  triggerHaptic('light');
                  setIsManagingCategories((v) => !v);
                }}
                className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-black transition shrink-0 cursor-pointer border whitespace-nowrap ${
                  isManagingCategories
                    ? 'bg-emerald-600 text-white border-emerald-600'
                    : 'bg-blue-50 text-[#0759A4] border-blue-200 hover:bg-blue-100'
                }`}
              >
                <Tag className="w-3.5 h-3.5" />
                <span>{isManagingCategories ? 'Fermer catégories' : '+ Catégorie'}</span>
              </button>
            )}
          </div>

          {/* Admin Custom Category Manager Drawer */}
          {role === 'Admin' && isManagingCategories && (
            <div className="glass-surface rounded-2xl p-3.5 border border-blue-200/80 space-y-3 animate-in fade-in duration-150">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-black text-gray-900 flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-[#0759A4]" />
                  <span>Mes Catégories Personnalisées (Sauvegardées sur Supabase)</span>
                </p>
                {isSavingCategories && (
                  <span className="text-[10px] font-bold text-[#0759A4] flex items-center gap-1">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    <span>Sync...</span>
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="text"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      void handleAddCustomCategory(newCategoryName, newCategoryColor);
                    }
                  }}
                  placeholder="Nom de la nouvelle catégorie..."
                  className="flex-1 min-w-[180px] px-3 py-2 rounded-xl bg-white border border-gray-200 text-xs font-semibold text-gray-900 outline-none focus:border-[#0759A4]"
                />
                <div className="flex items-center gap-1">
                  {(Object.keys(CATEGORY_PALETTE) as CategoryColorKey[]).map((key) => {
                    const pal = CATEGORY_PALETTE[key];
                    const active = newCategoryColor === key;
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setNewCategoryColor(key)}
                        className={`w-6 h-6 rounded-full cursor-pointer border-2 transition ${
                          active ? 'scale-110 border-gray-900 shadow-xs' : 'border-white opacity-75 hover:opacity-100'
                        }`}
                        style={{ backgroundColor: pal.swatch }}
                        title={pal.label}
                      />
                    );
                  })}
                </div>
                <button
                  type="button"
                  disabled={isSavingCategories || !newCategoryName.trim()}
                  onClick={() => void handleAddCustomCategory(newCategoryName, newCategoryColor)}
                  className="px-3.5 py-2 rounded-xl bg-[#0759A4] hover:bg-blue-700 disabled:opacity-45 text-white text-xs font-black flex items-center gap-1 cursor-pointer shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Créer</span>
                </button>
              </div>

              {customCategories.length > 0 ? (
                <div className="flex flex-wrap gap-2 pt-1">
                  {customCategories.map((cat) => {
                    const pal = CATEGORY_PALETTE[cat.color || 'blue'] || CATEGORY_PALETTE.blue;
                    return (
                      <div
                        key={cat.id}
                        className="inline-flex items-center gap-1.5 pl-2.5 pr-1.5 py-1 rounded-xl border text-xs font-bold"
                        style={{
                          backgroundColor: pal.bg,
                          color: pal.text,
                          borderColor: pal.border,
                        }}
                      >
                        <span>{cat.name}</span>
                        <select
                          aria-label={`Couleur pour ${cat.name}`}
                          value={cat.color || 'blue'}
                          onChange={(e) =>
                            void handleChangeCategoryColor(cat.id, e.target.value as CategoryColorKey)
                          }
                          className="text-[10px] bg-white/80 rounded px-1 py-0.5 text-gray-800 border border-black/10 outline-none cursor-pointer"
                        >
                          {(Object.keys(CATEGORY_PALETTE) as CategoryColorKey[]).map((k) => (
                            <option key={k} value={k}>
                              {CATEGORY_PALETTE[k].label}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={() => void handleDeleteCustomCategory(cat.id, cat.name)}
                          className="p-1 rounded-lg hover:bg-red-500 hover:text-white text-red-600 transition cursor-pointer"
                          title="Supprimer cette catégorie"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-[11px] text-gray-500">
                  Aucune catégorie créée pour l&apos;instant. Créez vos propres catégories ci-dessus.
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Clean List View with Large Unobstructed Photos (Tap row -> Opens full Editorial Article) */}
      {filteredTips.length > 0 ? (
        <div className="flex flex-col gap-3.5">
          {filteredTips.map((post) => {
            const coverImg = getCoverImage(post);
            const catStyle = getCategoryColor(post.category);
            const audStyle = getAudienceBadge(post.targetAudience);
            const extraPhotosCount =
              (post.blocks?.filter((b) => sanitizeImageUrl(b.imageUrl)).length || 0) +
              (sanitizeImageUrl(post.imageUrl) ? 1 : 0);

            return (
              <article
                key={post.id}
                onClick={() => {
                  triggerHaptic('light');
                  setReadingTipId(post.id);
                }}
                className="group glass-surface rounded-[22px] overflow-hidden cursor-pointer border border-white/35 dark:border-slate-700/70 shadow-sm hover:shadow-xl transition-all duration-200 flex flex-col sm:flex-row text-left"
              >
                {/* Crystal-Clear Unobstructed Photo Frame */}
                {coverImg && (
                  <div className="relative w-full h-56 sm:w-64 sm:h-auto sm:min-h-[176px] shrink-0 bg-slate-100 dark:bg-slate-900/90 border-b sm:border-b-0 sm:border-r border-gray-200/70 dark:border-slate-700/70 flex items-center justify-center overflow-hidden p-1.5">
                    <img
                      src={coverImg}
                      alt={post.title}
                      className="w-full h-full object-contain rounded-xl group-hover:scale-[1.02] transition-transform duration-300"
                      loading="lazy"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).style.display = 'none';
                      }}
                    />
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setPreviewImage(coverImg);
                      }}
                      className="absolute bottom-2.5 right-2.5 px-2 py-1 rounded-lg bg-black/65 hover:bg-black/85 backdrop-blur-xs text-white text-[10px] font-bold flex items-center gap-1 cursor-pointer transition"
                      title="Agrandir la photo"
                    >
                      <ZoomIn className="w-3 h-3" />
                      <span>Zoom</span>
                    </button>
                  </div>
                )}

                {/* Article Details Column */}
                <div className="flex-1 p-3.5 sm:p-4 flex flex-col justify-between gap-2.5 min-w-0">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span
                          className="text-[10px] font-bold px-2 py-0.5 rounded-[8px] border"
                          style={{
                            backgroundColor: audStyle.bg,
                            color: audStyle.text,
                            borderColor: audStyle.border,
                          }}
                        >
                          {audStyle.label}
                        </span>
                        {post.category && post.category.trim() && (
                          <span
                            className="text-[10px] font-bold px-2 py-0.5 rounded-[8px] border"
                            style={{
                              backgroundColor: catStyle.bg,
                              color: catStyle.text,
                              borderColor: catStyle.border,
                            }}
                          >
                            {post.category}
                          </span>
                        )}
                        {(extraPhotosCount > 1 || (post.blocks && post.blocks.length > 0)) && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-[8px] bg-blue-50 dark:bg-blue-950/50 text-[#0759A4] dark:text-blue-300 border border-blue-200/70 dark:border-blue-800/60 flex items-center gap-1">
                            <Layers className="w-2.5 h-2.5" />
                            <span>{post.blocks?.length || extraPhotosCount} sections</span>
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-gray-400 dark:text-slate-500 font-medium tabular-nums">
                        {post.createdAt}
                      </span>
                    </div>

                    <h3 className="text-sm sm:text-base font-black text-gray-900 dark:text-white leading-snug group-hover:text-[#0759A4] dark:group-hover:text-blue-300 transition-colors">
                      {post.title}
                    </h3>

                    {post.content && (
                      <p className="text-xs text-gray-600 dark:text-slate-300 leading-relaxed line-clamp-2">
                        {post.content}
                      </p>
                    )}
                  </div>

                  {/* Footer Actions */}
                  <div className="flex items-center justify-between gap-2 pt-2 border-t border-gray-200/60 dark:border-slate-800 flex-wrap">
                    <div className="flex items-center gap-2.5">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          triggerHaptic('light');
                          likeTip(post.id);
                        }}
                        className="flex items-center gap-1.5 text-xs font-bold text-gray-600 dark:text-slate-300 hover:text-[#0759A4] dark:hover:text-blue-400 py-1 px-2 rounded-lg bg-gray-100/80 dark:bg-slate-800/70 transition active:scale-95 cursor-pointer tabular-nums"
                      >
                        <ThumbsUp className="w-3.5 h-3.5 text-amber-500" />
                        <span>{post.likes || 0}</span>
                      </button>
                      <span className="text-[11px] font-semibold text-gray-500 dark:text-slate-400 truncate max-w-[130px]">
                        {post.authorName || `${post.authorRole} Livry`}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {role === 'Admin' && (
                        <>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              triggerHaptic('light');
                              handleOpenEdit(post);
                            }}
                            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-[#0759A4] dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/60 text-[11px] font-bold transition cursor-pointer"
                            title="Modifier cet article"
                          >
                            <Pencil className="w-3 h-3" />
                            <span>Modifier</span>
                          </button>
                          <button
                            type="button"
                            onClick={(e) => handleDeleteClick(post.id, e)}
                            className={`h-7 rounded-lg flex items-center justify-center transition cursor-pointer ${
                              confirmDeleteId === post.id
                                ? 'px-2 bg-red-600 text-white font-black text-[10px]'
                                : 'w-7 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40'
                            }`}
                            title={
                              confirmDeleteId === post.id
                                ? 'Cliquer encore pour supprimer'
                                : 'Supprimer'
                            }
                          >
                            {confirmDeleteId === post.id ? (
                              <span>Suppr ?</span>
                            ) : (
                              <Trash2 className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </>
                      )}

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          triggerHaptic('light');
                          setReadingTipId(post.id);
                        }}
                        className="inline-flex items-center gap-1 text-[11px] font-black text-[#0759A4] dark:text-blue-400 pl-1 cursor-pointer hover:underline"
                      >
                        <span>Lire</span>
                        <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                      </button>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="glass-surface rounded-2xl p-8 text-center mt-2">
          <Lightbulb className="w-8 h-8 text-amber-400 mx-auto mb-2 opacity-80" />
          <p className="text-xs font-bold text-gray-800 dark:text-slate-200">
            {activeAstucesUi.emptyTitle}
          </p>
          <p className="text-[11px] text-gray-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
            {role === 'Admin'
              ? "Cliquez sur 'Nouvel article' pour publier un guide avec photos et texte, sauvegardé sur Supabase."
              : activeAstucesUi.emptySubtitle}
          </p>
          {role === 'Admin' && (
            <div className="mt-3.5 flex items-center justify-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={handleRestoreDefaultsClick}
                disabled={isRestoringDefaults}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>
                  {isRestoringDefaults ? 'Restauration...' : 'Restaurer les astuces d’origine'}
                </span>
              </button>
              <button
                type="button"
                onClick={handleOpenCreate}
                className="px-4 py-2 rounded-xl bg-[#0759A4] hover:bg-blue-700 text-white text-xs font-bold transition cursor-pointer"
              >
                Créer un article
              </button>
            </div>
          )}
        </div>
      )}

      {/* Editorial Article Reader Modal */}
      {readingArticle && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-5 bg-black/80 backdrop-blur-md overflow-y-auto"
          onClick={() => setReadingTipId(null)}
        >
          <article
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-2xl bg-white dark:bg-[#0D1322] rounded-[24px] overflow-hidden shadow-2xl border border-white/20 dark:border-slate-800 my-auto max-h-[92vh] flex flex-col text-gray-900 dark:text-slate-100 animate-in fade-in zoom-in-95 duration-150"
          >
            {/* Top Sticky Reader Bar */}
            <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-gray-100 dark:border-slate-800 bg-white/95 dark:bg-[#0D1322]/95 backdrop-blur-md shrink-0">
              <button
                type="button"
                onClick={() => setReadingTipId(null)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 text-xs font-bold cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Retour</span>
              </button>

              <div className="flex items-center gap-1.5">
                {role === 'Admin' && (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        const target = readingArticle;
                        setReadingTipId(null);
                        handleOpenEdit(target);
                      }}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-[#0759A4] dark:text-blue-300 text-xs font-bold cursor-pointer"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                      <span>Modifier</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteClick(readingArticle.id)}
                      className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1 ${
                        confirmDeleteId === readingArticle.id
                          ? 'bg-red-600 text-white'
                          : 'bg-red-50 dark:bg-red-950/50 text-red-600 dark:text-red-400'
                      }`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>{confirmDeleteId === readingArticle.id ? 'Confirmer ?' : 'Supprimer'}</span>
                    </button>
                  </>
                )}
                <button
                  type="button"
                  onClick={() => setReadingTipId(null)}
                  className="p-1.5 rounded-xl text-gray-400 hover:text-gray-700 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Scrollable Article Body */}
            <div className="overflow-y-auto p-4 sm:p-6 space-y-5">
              {/* Hero Cover Photo */}
              {sanitizeImageUrl(readingArticle.imageUrl) && (
                <div
                  onClick={() => setPreviewImage(sanitizeImageUrl(readingArticle.imageUrl)!)}
                  className="relative rounded-2xl overflow-hidden bg-slate-100 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 cursor-pointer group"
                >
                  <img
                    src={sanitizeImageUrl(readingArticle.imageUrl)}
                    alt={readingArticle.title}
                    className="w-full max-h-[380px] object-cover group-hover:scale-[1.01] transition-transform"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).style.display = 'none';
                    }}
                  />
                  <div className="absolute bottom-2.5 right-2.5 px-2.5 py-1 rounded-lg bg-black/70 text-white text-[10px] font-bold flex items-center gap-1">
                    <ZoomIn className="w-3 h-3" />
                    <span>Agrandir</span>
                  </div>
                </div>
              )}

              {/* Meta Badges & Author */}
              <div className="space-y-2.5">
                <div className="flex items-center gap-1.5 flex-wrap">
                  {(() => {
                    const aud = getAudienceBadge(readingArticle.targetAudience);
                    const cat = getCategoryColor(readingArticle.category);
                    return (
                      <>
                        <span
                          className="text-[10px] font-bold px-2.5 py-0.5 rounded-lg border"
                          style={{ backgroundColor: aud.bg, color: aud.text, borderColor: aud.border }}
                        >
                          {aud.label}
                        </span>
                        {readingArticle.category && readingArticle.category.trim() && (
                          <span
                            className="text-[10px] font-bold px-2.5 py-0.5 rounded-lg border"
                            style={{ backgroundColor: cat.bg, color: cat.text, borderColor: cat.border }}
                          >
                            {readingArticle.category}
                          </span>
                        )}
                      </>
                    );
                  })()}
                  <span className="text-[11px] font-semibold text-gray-500 dark:text-slate-400">
                    • {readingArticle.authorName || `${readingArticle.authorRole} Livry`}
                  </span>
                  <span className="text-[11px] text-gray-400 dark:text-slate-500 ml-auto tabular-nums">
                    {readingArticle.createdAt}
                  </span>
                </div>

                {/* Big Article Title */}
                <h2 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white leading-tight tracking-tight">
                  {readingArticle.title}
                </h2>
              </div>

              {/* Main Intro / Body */}
              {readingArticle.content && (
                <div className="text-sm text-gray-700 dark:text-slate-200 leading-relaxed whitespace-pre-line font-normal bg-gray-50/80 dark:bg-slate-800/50 p-4 rounded-2xl border border-gray-100 dark:border-slate-800">
                  {readingArticle.content}
                </div>
              )}

              {/* Rich Article Blocks (Text / Photo / Photo + Text) */}
              {readingArticle.blocks && readingArticle.blocks.length > 0 && (
                <div className="space-y-5">
                  {readingArticle.blocks.map((blk, idx) => {
                    const safeBlkImg = sanitizeImageUrl(blk.imageUrl);
                    return (
                      <section
                        key={blk.id || idx}
                        className="space-y-2.5 pt-2 border-t border-gray-100 dark:border-slate-800/80 first:border-t-0 first:pt-0"
                      >
                        {blk.heading && (
                          <h3 className="text-base font-black text-gray-900 dark:text-white tracking-tight">
                            {blk.heading}
                          </h3>
                        )}

                        {safeBlkImg && (
                          <figure className="space-y-1.5">
                            <div
                              onClick={() => setPreviewImage(safeBlkImg)}
                              className="relative rounded-2xl overflow-hidden bg-slate-100 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 cursor-pointer group"
                            >
                              <img
                                src={safeBlkImg}
                                alt={blk.caption || blk.heading || readingArticle.title}
                                className="w-full max-h-[360px] object-cover group-hover:scale-[1.01] transition-transform"
                                onError={(e) => {
                                  (e.currentTarget as HTMLImageElement).style.display = 'none';
                                }}
                              />
                              <div className="absolute bottom-2 right-2 px-2 py-1 rounded-lg bg-black/70 text-white text-[10px] font-bold flex items-center gap-1">
                                <ZoomIn className="w-3 h-3" />
                                <span>Zoom</span>
                              </div>
                            </div>
                            {blk.caption && (
                              <figcaption className="text-[11px] italic text-gray-500 dark:text-slate-400 px-1">
                                {blk.caption}
                              </figcaption>
                            )}
                          </figure>
                        )}

                        {blk.text && (
                          <p className="text-sm text-gray-700 dark:text-slate-300 leading-relaxed whitespace-pre-line">
                            {blk.text}
                          </p>
                        )}
                      </section>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Bottom Sticky Footer */}
            <div className="flex items-center justify-between px-4 sm:px-6 py-3 border-t border-gray-100 dark:border-slate-800 bg-gray-50/90 dark:bg-slate-900/90 shrink-0">
              <button
                type="button"
                onClick={() => {
                  triggerHaptic('light');
                  likeTip(readingArticle.id);
                }}
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-amber-50 dark:bg-amber-950/50 hover:bg-amber-100 dark:hover:bg-amber-900/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 text-xs font-black transition active:scale-95 cursor-pointer tabular-nums"
              >
                <ThumbsUp className="w-4 h-4 text-amber-500" />
                <span>Utile ({readingArticle.likes || 0})</span>
              </button>

              <button
                type="button"
                onClick={() => setReadingTipId(null)}
                className="px-4 py-2 rounded-xl bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-xs font-black cursor-pointer"
              >
                Fermer l&apos;article
              </button>
            </div>
          </article>
        </div>
      )}

      {/* Admin Rich Article Create / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-black/75 backdrop-blur-xs overflow-y-auto">
          <div className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 shadow-2xl border border-gray-200 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-150 my-auto max-h-[93vh] flex flex-col text-gray-900 dark:text-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-slate-800 mb-3 shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-gray-900 dark:text-white">
                    {editingTip ? "Modifier l'article" : 'Rédiger un article / astuce'}
                  </h3>
                  <p className="text-[10px] text-gray-500 dark:text-slate-400">
                    Photo de couverture + texte + sections multiples sauvegardés sur Supabase
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsModalOpen(false);
                  setEditingTip(null);
                }}
                className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-white rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3.5 text-xs overflow-y-auto pr-1">
              {formError && (
                <div className="flex items-center gap-2 p-2.5 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-xs font-bold">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Target Audience Selector */}
              <div>
                <label className="block text-[11px] font-bold text-gray-600 dark:text-slate-400 mb-1.5">
                  Public cible *
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {(['Tous', 'Pickeur', 'Livreur', 'Référent'] as const).map((aud) => (
                    <button
                      key={aud}
                      type="button"
                      onClick={() => setFormTargetAudience(aud)}
                      className={`py-2 px-1.5 rounded-xl text-xs font-bold border transition text-center cursor-pointer flex items-center justify-center gap-1 ${
                        formTargetAudience === aud
                          ? 'bg-[#0759A4] text-white border-[#0759A4] shadow-xs'
                          : 'bg-gray-50 dark:bg-slate-800 text-gray-600 dark:text-slate-300 border-gray-200 dark:border-slate-700'
                      }`}
                    >
                      <span>
                        {aud === 'Tous'
                          ? '👥 Tous'
                          : aud === 'Pickeur'
                          ? '🛒 Pickeurs'
                          : aud === 'Livreur'
                          ? '🛵 Livreurs'
                          : '⭐ Référents'}
                      </span>
                      {formTargetAudience === aud && <Check className="w-3 h-3" />}
                    </button>
                  ))}
                </div>
              </div>

              {/* Title */}
              <div>
                <label className="block text-[11px] font-bold text-gray-600 dark:text-slate-400 mb-1">
                  Titre de l&apos;article *
                </label>
                <input
                  type="text"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="ex: Guide complet pour peser les fruits & légumes sans erreur"
                  className="w-full p-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl font-semibold text-xs text-gray-900 dark:text-white outline-none focus:border-[#0759A4]"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-bold text-gray-600 mb-1">
                    Catégorie personnalisée
                  </label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value as TipCategory)}
                    className="w-full p-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 font-medium outline-none focus:border-[#0759A4]"
                  >
                    <option value="">Sans catégorie</option>
                    {customCategories.map((c) => (
                      <option key={c.id} value={c.name}>
                        {c.name}
                      </option>
                    ))}
                    {formCategory &&
                      !customCategories.some(
                        (c) => c.name.toLowerCase() === formCategory.toLowerCase()
                      ) && <option value={formCategory}>{formCategory}</option>}
                  </select>
                  <div className="flex items-center gap-1.5 mt-1.5">
                    <input
                      type="text"
                      value={inlineModalCatName}
                      onChange={(e) => setInlineModalCatName(e.target.value)}
                      placeholder="Nouvelle catégorie..."
                      className="flex-1 min-w-0 px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg text-[11px] text-gray-900 outline-none focus:border-[#0759A4]"
                    />
                    <button
                      type="button"
                      disabled={!inlineModalCatName.trim() || isSavingCategories}
                      onClick={async () => {
                        const created = await handleAddCustomCategory(inlineModalCatName, 'blue');
                        if (created) setFormCategory(created);
                      }}
                      className="px-2.5 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-[#0759A4] border border-blue-200 text-[11px] font-black disabled:opacity-45 cursor-pointer shrink-0"
                    >
                      + Créer
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-gray-600 mb-1">
                    Auteur / Signature
                  </label>
                  <input
                    type="text"
                    value={formAuthorName}
                    onChange={(e) => setFormAuthorName(e.target.value)}
                    placeholder="ex: Admin Livry"
                    className="w-full p-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 outline-none focus:border-[#0759A4]"
                  />
                </div>
              </div>

              {/* Cover Photo Upload */}
              <div className="bg-gray-50 dark:bg-slate-800/70 p-3 rounded-xl border border-gray-200 dark:border-slate-700 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-gray-700 dark:text-slate-300 flex items-center gap-1.5">
                    <Camera className="w-4 h-4 text-[#0759A4] dark:text-blue-400" />
                    <span>Photo principale (affichée sur la carte)</span>
                  </span>
                  {formImageUrl && (
                    <button
                      type="button"
                      onClick={() => setFormImageUrl('')}
                      className="text-[10px] font-bold text-red-500 hover:underline cursor-pointer"
                    >
                      Supprimer
                    </button>
                  )}
                </div>

                <input
                  type="file"
                  ref={coverFileInputRef}
                  onChange={handleCoverFileChange}
                  accept="image/*"
                  className="hidden"
                />

                {formImageUrl && (
                  <div className="relative rounded-xl overflow-hidden max-h-40 border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900">
                    <img
                      src={formImageUrl}
                      alt="Couverture"
                      className="w-full h-auto max-h-40 object-cover"
                    />
                  </div>
                )}

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => coverFileInputRef.current?.click()}
                    disabled={uploadingTarget === 'cover'}
                    className="px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-blue-200 dark:border-blue-800 hover:bg-blue-50 dark:hover:bg-blue-950/30 text-[#0759A4] dark:text-blue-400 font-bold text-xs shadow-2xs transition cursor-pointer shrink-0 flex items-center gap-1.5"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>{uploadingTarget === 'cover' ? 'Compression...' : 'Importer photo'}</span>
                  </button>
                  <input
                    type="url"
                    value={formImageUrl.startsWith('data:') ? '' : formImageUrl}
                    onChange={(e) => setFormImageUrl(e.target.value)}
                    placeholder="Ou lien image https://..."
                    className="flex-1 min-w-0 p-2 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl text-[11px] text-gray-900 dark:text-white outline-none focus:border-[#0759A4]"
                  />
                </div>
              </div>

              {/* Introduction / Summary */}
              <div>
                <label className="block text-[11px] font-bold text-gray-600 dark:text-slate-400 mb-1">
                  Introduction / Résumé de l&apos;article
                </label>
                <textarea
                  value={formContent}
                  onChange={(e) => setFormContent(e.target.value)}
                  placeholder="Écrivez l'introduction ou la consigne principale (vous pouvez aussi ajouter des sections photos + texte ci-dessous)..."
                  rows={3}
                  className="w-full p-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-xs text-gray-900 dark:text-white outline-none focus:border-[#0759A4] leading-relaxed"
                />
              </div>

              {/* Rich Article Blocks Builder (Text, Image, Image+Text) */}
              <div className="bg-blue-50/50 dark:bg-slate-800/50 p-3 rounded-2xl border border-blue-200/70 dark:border-slate-700 space-y-2.5">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <p className="text-[11px] font-black text-gray-800 dark:text-slate-200">
                      Contenu de l&apos;article (Blocs Texte &amp; Photos)
                    </p>
                    <p className="text-[10px] text-gray-500 dark:text-slate-400">
                      Composez votre article étape par étape avec autant de photos et textes que voulu
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <button
                      type="button"
                      onClick={() => addArticleBlock('text')}
                      className="px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 hover:border-[#0759A4] text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <TypeIcon className="w-3 h-3 text-[#0759A4]" />
                      <span>+ Texte</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => addArticleBlock('image')}
                      className="px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 hover:border-[#0759A4] text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <ImageIcon className="w-3 h-3 text-emerald-600" />
                      <span>+ Photo</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => addArticleBlock('image_text')}
                      className="px-2.5 py-1.5 rounded-lg bg-[#0759A4] text-white text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <Layers className="w-3 h-3" />
                      <span>+ Photo &amp; Texte</span>
                    </button>
                  </div>
                </div>

                {formBlocks.length > 0 && (
                  <div className="space-y-2.5">
                    {formBlocks.map((blk, idx) => (
                      <div
                        key={blk.id}
                        className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 space-y-2"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[10px] font-black uppercase tracking-wider text-[#0759A4] dark:text-blue-400">
                            Section {idx + 1} •{' '}
                            {blk.type === 'text'
                              ? 'Texte'
                              : blk.type === 'image'
                              ? 'Photo'
                              : 'Photo + Texte'}
                          </span>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => moveArticleBlock(idx, -1)}
                              disabled={idx === 0}
                              className="p-1 rounded-md hover:bg-gray-100 dark:hover:bg-slate-800 disabled:opacity-30 cursor-pointer"
                              title="Monter"
                            >
                              <ArrowUp className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => moveArticleBlock(idx, 1)}
                              disabled={idx === formBlocks.length - 1}
                              className="p-1 rounded-md hover:bg-gray-100 dark:hover:bg-slate-800 disabled:opacity-30 cursor-pointer"
                              title="Descendre"
                            >
                              <ArrowDown className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => removeArticleBlock(blk.id)}
                              className="p-1 rounded-md text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 cursor-pointer"
                              title="Supprimer cette section"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        <input
                          type="text"
                          value={blk.heading || ''}
                          onChange={(e) => updateArticleBlock(blk.id, { heading: e.target.value })}
                          placeholder="Sous-titre de section (optionnel)"
                          className="w-full p-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg text-xs font-bold outline-none focus:border-[#0759A4]"
                        />

                        {blk.type !== 'text' && (
                          <div className="space-y-1.5">
                            {blk.imageUrl && (
                              <div className="relative rounded-lg overflow-hidden max-h-36 border border-gray-200 dark:border-slate-700">
                                <img
                                  src={blk.imageUrl}
                                  alt="Aperçu bloc"
                                  className="w-full max-h-36 object-cover"
                                />
                              </div>
                            )}
                            <div className="flex gap-2 items-center">
                              <label className="px-2.5 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/50 text-[#0759A4] dark:text-blue-300 border border-blue-200 dark:border-blue-800 text-[11px] font-bold cursor-pointer shrink-0 flex items-center gap-1">
                                <Camera className="w-3.5 h-3.5" />
                                <span>
                                  {uploadingTarget === blk.id ? 'Compression...' : 'Choisir photo'}
                                </span>
                                <input
                                  type="file"
                                  accept="image/*"
                                  onChange={(e) => handleBlockFileChange(blk.id, e)}
                                  className="hidden"
                                />
                              </label>
                              <input
                                type="url"
                                value={blk.imageUrl?.startsWith('data:') ? '' : blk.imageUrl || ''}
                                onChange={(e) =>
                                  updateArticleBlock(blk.id, { imageUrl: e.target.value })
                                }
                                placeholder="Ou URL photo (https://...)"
                                className="flex-1 min-w-0 p-1.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg text-[11px] outline-none"
                              />
                              {blk.imageUrl && (
                                <button
                                  type="button"
                                  onClick={() => updateArticleBlock(blk.id, { imageUrl: '' })}
                                  className="text-[10px] font-bold text-red-500 px-1.5 cursor-pointer"
                                >
                                  Retirer
                                </button>
                              )}
                            </div>
                            <input
                              type="text"
                              value={blk.caption || ''}
                              onChange={(e) =>
                                updateArticleBlock(blk.id, { caption: e.target.value })
                              }
                              placeholder="Légende sous la photo (optionnelle)"
                              className="w-full p-1.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg text-[11px] outline-none"
                            />
                          </div>
                        )}

                        {blk.type !== 'image' && (
                          <textarea
                            value={blk.text || ''}
                            onChange={(e) => updateArticleBlock(blk.id, { text: e.target.value })}
                            placeholder="Texte explicatif de cette section..."
                            rows={3}
                            className="w-full p-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg text-xs outline-none focus:border-[#0759A4] leading-relaxed"
                          />
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-gray-100 dark:border-slate-800 sticky bottom-0 bg-white dark:bg-slate-900">
                <button
                  type="button"
                  onClick={() => {
                    setIsModalOpen(false);
                    setEditingTip(null);
                  }}
                  className="px-3.5 py-2 rounded-xl border border-gray-200 dark:border-slate-700 font-bold text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={Boolean(uploadingTarget) || isSavingTip}
                  className="px-4 py-2 rounded-xl bg-[#0759A4] hover:bg-blue-700 text-white font-bold shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isSavingTip ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Enregistrement Supabase...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>
                        {editingTip ? 'Enregistrer sur Supabase' : "Publier l'article"}
                      </span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Fullscreen Photo Viewer */}
      {previewImage && (
        <div
          onClick={() => setPreviewImage(null)}
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md cursor-pointer animate-in fade-in duration-150"
        >
          <div className="relative max-w-2xl max-h-[88vh] overflow-hidden rounded-[18px]">
            <img
              src={previewImage}
              alt="Plein écran"
              className="w-full h-auto max-h-[88vh] object-contain rounded-[18px]"
            />
            <button
              type="button"
              onClick={() => setPreviewImage(null)}
              className="absolute top-3 right-3 p-2 bg-black/70 text-white rounded-full hover:bg-black/90 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* Dedicated Supabase SQL Modal for Table `astuces` */}
      {isAstucesSqlOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/75 backdrop-blur-sm animate-in fade-in duration-150"
          onClick={() => setIsAstucesSqlOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-3xl max-h-[90vh] bg-white rounded-3xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden text-gray-900"
          >
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100 bg-gray-50/90 shrink-0">
              <div className="flex items-center gap-2.5">
                <Code2 className="w-5 h-5 text-[#0759A4]" />
                <div>
                  <h3 className="text-sm sm:text-base font-black text-gray-900">
                    Table Supabase <code className="text-[#0759A4]">astuces</code> (SQL &amp; Sync)
                  </h3>
                  <p className="text-[11px] text-gray-500">
                    Copiez ce SQL dans Supabase → SQL Editor → Run puis cliquez Sauvegarder
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAstucesSqlOpen(false)}
                className="p-1.5 rounded-full text-gray-400 hover:text-gray-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 sm:p-5 space-y-3 overflow-y-auto flex-1">
              <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-2xl border border-gray-200 bg-slate-50">
                <div className="text-xs font-bold text-gray-800 flex items-center gap-2">
                  {isCheckingTable ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-[#0759A4]" />
                      <span>Vérification de la table astuces sur Supabase...</span>
                    </>
                  ) : astucesTableStatus?.exists ? (
                    <span className="text-emerald-700">
                      ✅ Table <code className="font-mono">{astucesTableStatus.schema}.astuces</code> active ({astucesTableStatus.count} ligne{astucesTableStatus.count > 1 ? 's' : ''})
                    </span>
                  ) : (
                    <span className="text-amber-700">
                      ⚠️ Table <code className="font-mono">astuces</code> pas encore créée (mode secours <code className="font-mono">tips</code> actif — exécutez le SQL ci-dessous)
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <button
                    type="button"
                    onClick={handleRestoreDefaultsClick}
                    disabled={isRestoringDefaults}
                    className="px-3 py-1.5 rounded-xl bg-amber-100 hover:bg-amber-200 text-amber-900 text-xs font-black flex items-center gap-1 cursor-pointer disabled:opacity-50"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>{isRestoringDefaults ? '...' : 'Restaurer 4 astuces'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleSyncTipsCloud}
                    disabled={isSyncingTips}
                    className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black flex items-center gap-1 cursor-pointer disabled:opacity-50"
                  >
                    <CloudUpload className="w-3.5 h-3.5" />
                    <span>{isSyncingTips ? 'Envoi...' : `Sauvegarder (${tips.length})`}</span>
                  </button>
                </div>
              </div>

              <div className="relative">
                <button
                  type="button"
                  onClick={async () => {
                    const ok = await copyTextToClipboard(SUPABASE_ASTUCES_TABLE_SQL);
                    if (ok) {
                      setCopiedAstucesSql(true);
                      triggerHaptic('success');
                      showToast('📋 Script SQL table "astuces" copié !');
                      setTimeout(() => setCopiedAstucesSql(false), 2500);
                    } else {
                      showToast('❌ Impossible de copier automatiquement');
                    }
                  }}
                  className="absolute right-3 top-3 z-10 px-3 py-1.5 bg-white/15 hover:bg-white/25 text-white rounded-lg text-xs font-black flex items-center gap-1.5 transition cursor-pointer"
                >
                  {copiedAstucesSql ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                  <span>{copiedAstucesSql ? 'Copié !' : 'Copier SQL'}</span>
                </button>
                <pre className="p-4 bg-slate-950 text-emerald-400 rounded-2xl text-[11px] font-mono overflow-x-auto max-h-[340px] leading-relaxed border border-slate-800">
                  {SUPABASE_ASTUCES_TABLE_SQL}
                </pre>
              </div>
            </div>

            <div className="p-3 border-t border-gray-100 bg-gray-50 flex justify-end">
              <button
                type="button"
                onClick={() => setIsAstucesSqlOpen(false)}
                className="px-4 py-1.5 rounded-xl bg-[#0759A4] hover:bg-blue-700 text-white text-xs font-bold cursor-pointer"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Interactive Full-Page Tutorial Modal */}
      <AppTutorialModal
        isOpen={isTutorialOpen}
        initialSlide={tutorialInitialSlide}
        defaultEditMode={tutorialDefaultEdit}
        onClose={() => {
          setIsTutorialOpen(false);
          setTutorialDefaultEdit(false);
        }}
        onOpenSuggest={() => {
          setIsTutorialOpen(false);
          setTutorialDefaultEdit(false);
          setActiveTab('suggest');
        }}
        onOpenTips={() => {
          setIsTutorialOpen(false);
          setTutorialDefaultEdit(false);
        }}
      />
    </div>
  );
};

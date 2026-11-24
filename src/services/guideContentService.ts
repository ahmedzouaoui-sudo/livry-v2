import { CategoryColorKey, CustomTipCategory, GuideConfig, GuideStepConfig, TipArticleBlock } from '../types';
import { supabaseApi, supabasePublic, activeSchema } from './supabaseClient';
import { sanitizeImageUrl } from '../utils/securityUtils';
import { WHATSAPP_DISPLAY_NUMBER } from '../components/SuggestOneScreen';

const STORAGE_KEY_GUIDE_CONFIG = 'finder_livry_guide_config_v1';
export const GUIDE_CLOUD_ID = 'app_guide_config_v1';
export const GUIDE_CLOUD_CATEGORY = 'app_guide_config';

export const DEFAULT_GUIDE_CONFIG: GuideConfig = {
  version: 1,
  updatedAt: new Date().toISOString(),
  topBrandTitle: 'Guide Officiel · Livry Finder',
  summaryTitle: 'Sommaire du Guide',
  footerHint: 'Appuyez sur une étape ou glissez pour naviguer · Livry Finder',
  themePreset: 'rose-blue',
  globalBgType: 'theme',
  globalGradientAngle: 135,
  globalOverlayOpacity: 50,
  summarySidebarPosition: 'right',
  heroBanner: {
    badge: 'Guide Officiel Pickeur',
    headline: "Kifach tkhdam b'Livry Finder b'ser3a",
    subtitle: "Ticket Mizan vs Finder, qra2a dyal fiche produit, u kifach t'solvi chi article bloqué.",
    ctaLabel: "Chouf l'Guide",
  },
  astucesPage: {
    pageTitle: 'Astuces & Articles',
    backLabel: 'Retour',
    topNotice: '',
    searchPlaceholder: 'Rechercher un article ou une astuce...',
    audienceAllLabel: '👥 Tous',
    audiencePickeurLabel: '🛒 Pickeurs',
    audienceLivreurLabel: '🛵 Livreurs',
    audienceReferentLabel: '⭐ Référents',
    allCategoriesLabel: 'Toutes',
    emptyTitle: 'Aucun article ou astuce trouvé',
    emptySubtitle: "Les articles et astuces publiés par l'administrateur s'afficheront ici.",
    heroBgImageUrl: '',
    customCategories: [],
  },
  noCodeSettings: {
    allowAllWithoutCode: false,
    disabledCodeProductIds: [],
  },
  steps: [
    {
      id: 0,
      shortLabel: 'Ticket Mizan vs Finder',
      badge: "Étape 01 · Mochkil d'l-Mizan",
      headlineLine1: 'Ticket Mizan ❌',
      headlineLine2: 'vs Livry Finder ✅',
      description:
        "Bzaf dyal les articles f Marjane (Fruits, Fromage, Boucherie...) kikhroj fihom code-barres ghalet f ticket d'l-mizan wla makayt'bippach f caisse.",
      primaryCtaLabel: 'Étape Suivante',
      secondaryCtaLabel: "Chouf l'Astuces",
      layoutKind: 'comparison',
      accentColor: 'rose',
      customBlocks: [],
    },
    {
      id: 1,
      shortLabel: "Kifach tqra l'Code & Poids",
      badge: 'Étape 02 · Fiche Produit',
      headlineLine1: 'Kifach tqra la Fiche',
      headlineLine2: 'Produit & Poids',
      description:
        "Kolchi wade7 f fiche dyal l'article : Code Balance, Code-barres Secours, u Stepper d'l-Poids (1kg, 2kg, 3kg...).",
      primaryCtaLabel: 'Étape Suivante',
      secondaryCtaLabel: 'Précédent',
      layoutKind: 'showcase',
      accentColor: 'sky',
      customBlocks: [],
    },
    {
      id: 2,
      shortLabel: "Ila t'blocka chi Article",
      badge: 'Étape 03 · Astuces & WhatsApp',
      headlineLine1: "Ila t'blocka l'Article ?",
      headlineLine2: '3andek 2 Sols Rapides',
      description:
        "Ma t'waqafch l'commande dyalk! Tba3 had jouj d'l-khotowat bach t'solvi l'mochkil f seconds.",
      primaryCtaLabel: "Bda l'Khidma",
      secondaryCtaLabel: 'Précédent',
      layoutKind: 'actions',
      accentColor: 'amber',
      customBlocks: [],
    },
  ],
  slide1: {
    beforeBadge: 'Avant · Mizan',
    beforeImageUrl: '/assets/aistudio/image_2026-11-01_090829473_0eae3a7f.png',
    beforeCaption: 'Code 2000014... bloquée f caisse',
    afterBadge: 'Avec Finder',
    afterBarcodeSample: '2000014 018315',
    afterImageUrl: '',
    afterCaption: 'Scan direct 100% khdam f caisse',
    floatingPillText: '+790 articles vérifiés · Marjane & Aswak Assalam',
  },
  slide2: {
    showcaseImageUrl: '/assets/aistudio/PRODUIT_5f7ef00f.png',
    repere1Title: 'Code Balance',
    repere1Text: 'Ila kan Indisponible tqder tsiftou lina f Aidez-nous.',
    repere2Title: 'Codes-barres & Poids',
    repere2Text: 'Ila mabghach idoz Marjane, jerrb Sec / Interne.',
  },
  slide3: {
    card1Title: 'Astuces & Codes Spéciaux (301/302)',
    card1Subtitle: "Chouf l'astuce dyal code balance ghalet, poids exact u les codes 301/302.",
    card2Title: 'Support Direct WhatsApp',
    card2Subtitle: "Réponse f l'hin",
    card2PhoneDisplay: WHATSAPP_DISPLAY_NUMBER,
    card2WhatsappNumber: '212774231343',
    card2WhatsappMessage: "BONJOUR J'AI BESOIN D'AIDE SUR LIVRY FINDER :",
  },
};

export function sanitizeCssColor(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  if (/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(trimmed)) {
    return trimmed;
  }
  if (/^rgba?\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}(\s*,\s*(0|1|0?\.\d+))?\s*\)$/.test(trimmed)) {
    return trimmed;
  }
  return undefined;
}

function clampNumber(value: unknown, min: number, max: number, fallback: number): number {
  const num = Number(value);
  if (!Number.isFinite(num)) return fallback;
  return Math.max(min, Math.min(max, num));
}

const VALID_CAT_COLORS: CategoryColorKey[] = [
  'blue',
  'emerald',
  'amber',
  'rose',
  'purple',
  'orange',
  'slate',
];

function sanitizeCustomCategories(raw: unknown): CustomTipCategory[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const out: CustomTipCategory[] = [];
  for (let i = 0; i < raw.length; i++) {
    const item = raw[i];
    const name =
      typeof item === 'string'
        ? item.trim()
        : item && typeof item === 'object' && typeof (item as any).name === 'string'
          ? (item as any).name.trim()
          : '';
    if (!name) continue;
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    const rawColor =
      item && typeof item === 'object' ? ((item as any).color as CategoryColorKey) : undefined;
    const color: CategoryColorKey =
      rawColor && VALID_CAT_COLORS.includes(rawColor) ? rawColor : 'blue';
    const id =
      item && typeof item === 'object' && typeof (item as any).id === 'string' && (item as any).id.trim()
        ? (item as any).id.trim()
        : `cat-${i}-${name.toLowerCase().replace(/[^a-z0-9]/g, '')}`;
    out.push({ id, name, color });
  }
  return out;
}

function sanitizeArticleBlocks(rawBlocks?: unknown): TipArticleBlock[] {
  if (!Array.isArray(rawBlocks)) return [];
  return rawBlocks
    .map((b: any, idx: number): TipArticleBlock | null => {
      if (!b || typeof b !== 'object') return null;
      const type: TipArticleBlock['type'] =
        b.type === 'image' || b.type === 'image_text' || b.type === 'text' ? b.type : 'text';
      const safeImg = b.imageUrl ? sanitizeImageUrl(b.imageUrl) : undefined;
      return {
        id: String(b.id || `blk-${idx}-${Date.now()}`),
        type,
        heading: typeof b.heading === 'string' ? b.heading : undefined,
        text: typeof b.text === 'string' ? b.text : undefined,
        imageUrl: safeImg,
        caption: typeof b.caption === 'string' ? b.caption : undefined,
      };
    })
    .filter((b): b is TipArticleBlock => Boolean(b));
}

function defaultLayoutForIndex(idx: number): GuideStepConfig['layoutKind'] {
  if (idx === 0) return 'comparison';
  if (idx === 1) return 'showcase';
  if (idx === 2) return 'actions';
  return 'free';
}

function defaultAccentForIndex(idx: number): GuideStepConfig['accentColor'] {
  if (idx === 0) return 'rose';
  if (idx === 1) return 'sky';
  if (idx === 2) return 'amber';
  return 'emerald';
}

export function sanitizeGuideConfig(raw: Partial<GuideConfig>): GuideConfig {
  const def = DEFAULT_GUIDE_CONFIG;
  const rawSteps = Array.isArray(raw.steps) && raw.steps.length > 0 ? raw.steps : def.steps;

  const validBgTypes = ['theme', 'solid', 'gradient', 'image'] as const;
  const validMediaPos = ['bottom', 'top', 'left', 'right', 'hidden'] as const;
  const validTextAlign = ['left', 'center', 'right'] as const;
  const validVertAlign = ['top', 'center', 'bottom'] as const;
  const validHeadlineSize = ['sm', 'md', 'lg'] as const;
  const validImageSize = ['sm', 'md', 'lg', 'xl'] as const;
  const validImageFit = ['contain', 'cover'] as const;
  const validImageRounded = ['none', 'md', 'xl', '2xl'] as const;

  const mergedSteps: GuideStepConfig[] = rawSteps.slice(0, 15).map((step, idx) => {
    const fallbackStep = def.steps[idx] || {
      id: idx,
      shortLabel: `Étape ${idx + 1}`,
      badge: `Étape ${String(idx + 1).padStart(2, '0')}`,
      headlineLine1: 'Titre étape',
      headlineLine2: 'Sous-titre',
      description: '',
      primaryCtaLabel: 'Étape Suivante',
      secondaryCtaLabel: 'Précédent',
      layoutKind: 'free' as const,
      accentColor: 'emerald' as const,
      customBlocks: [],
    };
    const merged = { ...fallbackStep, ...(step || {}), id: idx };
    return {
      ...merged,
      layoutKind: merged.layoutKind || defaultLayoutForIndex(idx),
      accentColor: merged.accentColor || defaultAccentForIndex(idx),
      customImageUrl: merged.customImageUrl ? sanitizeImageUrl(merged.customImageUrl) : undefined,
      customBlocks: sanitizeArticleBlocks(merged.customBlocks),
      backgroundType: validBgTypes.includes(merged.backgroundType as any)
        ? merged.backgroundType
        : 'theme',
      backgroundColor: sanitizeCssColor(merged.backgroundColor),
      gradientFrom: sanitizeCssColor(merged.gradientFrom),
      gradientTo: sanitizeCssColor(merged.gradientTo),
      gradientAngle:
        merged.gradientAngle !== undefined
          ? clampNumber(merged.gradientAngle, 0, 360, 135)
          : 135,
      backgroundImageUrl: merged.backgroundImageUrl
        ? sanitizeImageUrl(merged.backgroundImageUrl)
        : undefined,
      backgroundOverlayOpacity:
        merged.backgroundOverlayOpacity !== undefined
          ? clampNumber(merged.backgroundOverlayOpacity, 0, 95, 55)
          : 55,
      titleColor: sanitizeCssColor(merged.titleColor),
      subtitleColor: sanitizeCssColor(merged.subtitleColor),
      textColor: sanitizeCssColor(merged.textColor),
      badgeBgColor: sanitizeCssColor(merged.badgeBgColor),
      badgeTextColor: sanitizeCssColor(merged.badgeTextColor),
      ctaBgColor: sanitizeCssColor(merged.ctaBgColor),
      ctaTextColor: sanitizeCssColor(merged.ctaTextColor),
      secondaryCtaBgColor: sanitizeCssColor(merged.secondaryCtaBgColor),
      secondaryCtaTextColor: sanitizeCssColor(merged.secondaryCtaTextColor),
      cardBgColor: sanitizeCssColor(merged.cardBgColor),
      mediaPosition: validMediaPos.includes(merged.mediaPosition as any)
        ? merged.mediaPosition
        : 'bottom',
      textAlign: validTextAlign.includes(merged.textAlign as any) ? merged.textAlign : 'left',
      contentVerticalAlign: validVertAlign.includes(merged.contentVerticalAlign as any)
        ? merged.contentVerticalAlign
        : 'center',
      headlineSize: validHeadlineSize.includes(merged.headlineSize as any)
        ? merged.headlineSize
        : 'md',
      imageSize: validImageSize.includes(merged.imageSize as any) ? merged.imageSize : 'md',
      imageFit: validImageFit.includes(merged.imageFit as any) ? merged.imageFit : 'contain',
      imageRounded: validImageRounded.includes(merged.imageRounded as any)
        ? merged.imageRounded
        : 'xl',
      hideBadge: Boolean(merged.hideBadge),
      hidePrimaryCta: Boolean(merged.hidePrimaryCta),
      hideSecondaryCta: Boolean(merged.hideSecondaryCta),
    };
  });

  const safeBeforeImg =
    sanitizeImageUrl(raw.slide1?.beforeImageUrl) || def.slide1.beforeImageUrl;
  const safeAfterImg = raw.slide1?.afterImageUrl
    ? sanitizeImageUrl(raw.slide1.afterImageUrl) || ''
    : '';
  const safeShowcaseImg =
    sanitizeImageUrl(raw.slide2?.showcaseImageUrl) || def.slide2.showcaseImageUrl;
  const safeHeroBgImg = raw.astucesPage?.heroBgImageUrl
    ? sanitizeImageUrl(raw.astucesPage.heroBgImageUrl) || ''
    : '';
  const safeGlobalBgImg = raw.globalBgImageUrl
    ? sanitizeImageUrl(raw.globalBgImageUrl)
    : undefined;

  const validThemes: Array<NonNullable<GuideConfig['themePreset']>> = [
    'rose-blue',
    'ocean',
    'emerald',
    'amber',
    'midnight',
  ];
  const themePreset =
    raw.themePreset && validThemes.includes(raw.themePreset)
      ? raw.themePreset
      : def.themePreset;

  const defAst = def.astucesPage!;
  const rawAst = raw.astucesPage || ({} as Partial<NonNullable<GuideConfig['astucesPage']>>);

  return {
    version: Number(raw.version || def.version),
    updatedAt: raw.updatedAt || new Date().toISOString(),
    topBrandTitle: raw.topBrandTitle?.trim() || def.topBrandTitle,
    summaryTitle: raw.summaryTitle?.trim() || def.summaryTitle,
    footerHint: raw.footerHint?.trim() || def.footerHint,
    themePreset,
    globalBgType: validBgTypes.includes(raw.globalBgType as any) ? raw.globalBgType : 'theme',
    globalBgColor: sanitizeCssColor(raw.globalBgColor),
    globalGradientFrom: sanitizeCssColor(raw.globalGradientFrom),
    globalGradientTo: sanitizeCssColor(raw.globalGradientTo),
    globalGradientAngle:
      raw.globalGradientAngle !== undefined
        ? clampNumber(raw.globalGradientAngle, 0, 360, 135)
        : 135,
    globalBgImageUrl: safeGlobalBgImg,
    globalOverlayOpacity:
      raw.globalOverlayOpacity !== undefined
        ? clampNumber(raw.globalOverlayOpacity, 0, 95, 50)
        : 50,
    headerBgColor: sanitizeCssColor(raw.headerBgColor),
    headerTextColor: sanitizeCssColor(raw.headerTextColor),
    summarySidebarPosition:
      raw.summarySidebarPosition === 'left' ||
      raw.summarySidebarPosition === 'right' ||
      raw.summarySidebarPosition === 'hidden'
        ? raw.summarySidebarPosition
        : 'right',
    summaryCardBgColor: sanitizeCssColor(raw.summaryCardBgColor),
    summaryTextColor: sanitizeCssColor(raw.summaryTextColor),
    heroBanner: {
      badge: raw.heroBanner?.badge?.trim() || def.heroBanner!.badge,
      headline: raw.heroBanner?.headline?.trim() || def.heroBanner!.headline,
      subtitle: raw.heroBanner?.subtitle?.trim() || def.heroBanner!.subtitle,
      ctaLabel: raw.heroBanner?.ctaLabel?.trim() || def.heroBanner!.ctaLabel,
    },
    astucesPage: {
      pageTitle: rawAst.pageTitle?.trim() || defAst.pageTitle,
      backLabel: rawAst.backLabel?.trim() || defAst.backLabel,
      topNotice: typeof rawAst.topNotice === 'string' ? rawAst.topNotice.trim() : '',
      searchPlaceholder: rawAst.searchPlaceholder?.trim() || defAst.searchPlaceholder,
      audienceAllLabel: rawAst.audienceAllLabel?.trim() || defAst.audienceAllLabel,
      audiencePickeurLabel: rawAst.audiencePickeurLabel?.trim() || defAst.audiencePickeurLabel,
      audienceLivreurLabel: rawAst.audienceLivreurLabel?.trim() || defAst.audienceLivreurLabel,
      audienceReferentLabel: rawAst.audienceReferentLabel?.trim() || defAst.audienceReferentLabel,
      allCategoriesLabel: rawAst.allCategoriesLabel?.trim() || defAst.allCategoriesLabel,
      emptyTitle: rawAst.emptyTitle?.trim() || defAst.emptyTitle,
      emptySubtitle: rawAst.emptySubtitle?.trim() || defAst.emptySubtitle,
      heroBgImageUrl: safeHeroBgImg,
      customCategories: sanitizeCustomCategories(rawAst.customCategories),
    },
    noCodeSettings: {
      allowAllWithoutCode: Boolean(raw.noCodeSettings?.allowAllWithoutCode),
      disabledCodeProductIds: Array.isArray(raw.noCodeSettings?.disabledCodeProductIds)
        ? Array.from(
            new Set(
              raw.noCodeSettings.disabledCodeProductIds
                .map((id) => Number(id))
                .filter((id) => Number.isFinite(id) && id > 0)
            )
          )
        : [],
    },
    steps: mergedSteps,
    slide1: {
      ...def.slide1,
      ...(raw.slide1 || {}),
      beforeImageUrl: safeBeforeImg,
      afterImageUrl: safeAfterImg,
    },
    slide2: {
      ...def.slide2,
      ...(raw.slide2 || {}),
      showcaseImageUrl: safeShowcaseImg,
    },
    slide3: {
      ...def.slide3,
      ...(raw.slide3 || {}),
    },
  };
}

export function getLocalGuideConfig(): GuideConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_GUIDE_CONFIG);
    if (!raw) return DEFAULT_GUIDE_CONFIG;
    return sanitizeGuideConfig(JSON.parse(raw));
  } catch {
    return DEFAULT_GUIDE_CONFIG;
  }
}

export function saveLocalGuideConfig(config: GuideConfig): GuideConfig {
  const clean = sanitizeGuideConfig(config);
  try {
    localStorage.setItem(STORAGE_KEY_GUIDE_CONFIG, JSON.stringify(clean));
  } catch {}
  return clean;
}

export async function fetchGuideConfigFromCloud(): Promise<GuideConfig> {
  const local = getLocalGuideConfig();
  if (typeof navigator !== 'undefined' && !navigator.onLine) return local;

  try {
    const primary = activeSchema === 'api' ? supabaseApi : supabasePublic;
    const secondary = activeSchema === 'api' ? supabasePublic : supabaseApi;

    const { data, error } = await primary
      .from('tips')
      .select('content')
      .eq('id', GUIDE_CLOUD_ID)
      .maybeSingle();

    if (!error && data?.content) {
      const remote = sanitizeGuideConfig(JSON.parse(data.content));
      saveLocalGuideConfig(remote);
      return remote;
    }

    const { data: altData, error: altErr } = await secondary
      .from('tips')
      .select('content')
      .eq('id', GUIDE_CLOUD_ID)
      .maybeSingle();

    if (!altErr && altData?.content) {
      const remote = sanitizeGuideConfig(JSON.parse(altData.content));
      saveLocalGuideConfig(remote);
      return remote;
    }
  } catch {}

  return local;
}

export async function saveGuideConfigToCloud(
  config: GuideConfig
): Promise<{ success: boolean; config: GuideConfig; error?: string }> {
  const clean = saveLocalGuideConfig({
    ...config,
    version: (config.version || 1) + 1,
    updatedAt: new Date().toISOString(),
  });

  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return { success: true, config: clean };
  }

  const row = {
    id: GUIDE_CLOUD_ID,
    title: 'Configuration Guide Pickeur',
    content: JSON.stringify(clean),
    category: GUIDE_CLOUD_CATEGORY,
    author_role: 'Admin',
    author_name: 'Admin Livry',
    created_at: clean.updatedAt,
    likes: 0,
    image_url: '',
    target_audience: 'Tous',
  };

  try {
    const primary = activeSchema === 'api' ? supabaseApi : supabasePublic;
    const secondary = activeSchema === 'api' ? supabasePublic : supabaseApi;

    const { error } = await primary.from('tips').upsert(row, { onConflict: 'id' });
    if (!error) {
      // Best-effort mirror to secondary schema
      void secondary.from('tips').upsert(row, { onConflict: 'id' }).then(() => {}, () => {});
      return { success: true, config: clean };
    }

    const { error: altErr } = await secondary.from('tips').upsert(row, { onConflict: 'id' });
    if (!altErr) {
      return { success: true, config: clean };
    }

    return { success: false, config: clean, error: error.message || altErr.message };
  } catch (err: any) {
    return { success: false, config: clean, error: err?.message };
  }
}

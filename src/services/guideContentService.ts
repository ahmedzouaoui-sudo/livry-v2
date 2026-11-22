import { GuideConfig } from '../types';
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
  footerHint: 'Appuyez sur une étape ou glissez pour naviguer · Livry Finder',
  steps: [
    {
      id: 0,
      shortLabel: 'Ticket Mizan vs Finder',
      badge: 'Étape 01 · Mochkil d’l-Mizan',
      headlineLine1: 'Ticket Mizan ❌',
      headlineLine2: 'vs Livry Finder ✅',
      description:
        'Bzaf dyal les articles f Marjane (Fruits, Fromage, Boucherie...) kikhroj fihom code-barres ghalet f ticket d’l-mizan wla makayt’bippach f caisse.',
      primaryCtaLabel: 'Étape Suivante',
      secondaryCtaLabel: "Chouf l'Astuces",
    },
    {
      id: 1,
      shortLabel: 'Kifach tqra l’Code & Poids',
      badge: 'Étape 02 · Fiche Produit',
      headlineLine1: 'Kifach tqra la Fiche',
      headlineLine2: 'Produit & Poids',
      description:
        'Kolchi wade7 f fiche dyal l’article : Code Balance, Code-barres Secours, u Stepper d’l-Poids (1kg, 2kg, 3kg...).',
      primaryCtaLabel: 'Étape Suivante',
      secondaryCtaLabel: 'Précédent',
    },
    {
      id: 2,
      shortLabel: 'Ila t’blocka chi Article',
      badge: 'Étape 03 · Astuces & WhatsApp',
      headlineLine1: 'Ila t’blocka l’Article ?',
      headlineLine2: '3andek 2 Sols Rapides',
      description:
        'Ma t’waqafch l’commande dyalk! Tba3 had jouj d’l-khotowat bach t’solvi l’mochkil f seconds.',
      primaryCtaLabel: "Bda l'Khidma",
      secondaryCtaLabel: 'Précédent',
    },
  ],
  slide1: {
    beforeBadge: 'Avant · Mizan',
    beforeImageUrl: '/assets/aistudio/image_2026-11-01_090829473_0eae3a7f.png',
    beforeCaption: 'Code 2000014... bloquée f caisse',
    afterBadge: 'Avec Finder',
    afterBarcodeSample: '2000014 018315',
    afterCaption: 'Scan direct 100% khdam f caisse',
    floatingPillText: '+730 articles vérifiés · Marjane & Aswak Assalam',
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
    card1Subtitle: 'Chouf l’astuce dyal code balance ghalet, poids exact u les codes 301/302.',
    card2Title: 'Support Direct WhatsApp',
    card2Subtitle: 'Réponse f l’hin',
    card2PhoneDisplay: WHATSAPP_DISPLAY_NUMBER,
  },
};

function sanitizeGuideConfig(raw: Partial<GuideConfig>): GuideConfig {
  const def = DEFAULT_GUIDE_CONFIG;
  const mergedSteps: [GuideConfig['steps'][0], GuideConfig['steps'][1], GuideConfig['steps'][2]] = [
    { ...def.steps[0], ...(raw.steps?.[0] || {}), id: 0 },
    { ...def.steps[1], ...(raw.steps?.[1] || {}), id: 1 },
    { ...def.steps[2], ...(raw.steps?.[2] || {}), id: 2 },
  ];

  const safeBeforeImg =
    sanitizeImageUrl(raw.slide1?.beforeImageUrl) || def.slide1.beforeImageUrl;
  const safeShowcaseImg =
    sanitizeImageUrl(raw.slide2?.showcaseImageUrl) || def.slide2.showcaseImageUrl;

  return {
    version: Number(raw.version || def.version),
    updatedAt: raw.updatedAt || new Date().toISOString(),
    topBrandTitle: raw.topBrandTitle?.trim() || def.topBrandTitle,
    footerHint: raw.footerHint?.trim() || def.footerHint,
    steps: mergedSteps,
    slide1: {
      ...def.slide1,
      ...(raw.slide1 || {}),
      beforeImageUrl: safeBeforeImg,
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
    const client = activeSchema === 'api' ? supabaseApi : supabasePublic;
    const { data, error } = await client
      .from('tips')
      .select('content')
      .eq('id', GUIDE_CLOUD_ID)
      .maybeSingle();

    if (!error && data?.content) {
      const remote = sanitizeGuideConfig(JSON.parse(data.content));
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

  try {
    const client = activeSchema === 'api' ? supabaseApi : supabasePublic;
    const { error } = await client.from('tips').upsert(
      {
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
      },
      { onConflict: 'id' }
    );
    if (error) {
      return { success: false, config: clean, error: error.message };
    }
    return { success: true, config: clean };
  } catch (err: any) {
    return { success: false, config: clean, error: err?.message };
  }
}

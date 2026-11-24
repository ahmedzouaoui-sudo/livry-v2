export type Role = 'Pickeur' | 'Admin';

export type Department =
  | 'Boulangerie et pâtisserie'
  | 'Fruits et légumes'
  | 'Boucherie et volaille'
  | 'Fromage et charcuterie';

export type BarcodeVariantType =
  | 'marjane'
  | 'marjane 2'
  | 'marjane Interne'
  | 'marjane mini'
  | 'marjane sec'
  | 'marjane sec 2'
  // Legacy aliases
  | 'barcodeMarjane'
  | 'barcodeP2'
  | 'barcodeInterne'
  | 'barcodeMiniSecours'
  | 'barcodeSecours'
  | 'barcodeP3';

export type BarcodeStatus = 'Valide' | 'Possible';

export interface BarcodeVariant {
  type: BarcodeVariantType;
  label: string;
  code: string;
  format: 'EAN-13' | 'EAN-8';
  status: BarcodeStatus;
  accentColor: string;
  badgeBg: string;
  badgeText: string;
  hasMarjaneIcon?: boolean;
  iconType?: 'marjane' | 'internet' | 'plus';
  canVote?: boolean;
  likes?: number;
  dislikes?: number;
  userVote?: 'like' | 'dislike' | null;
  isCommunityApproved?: boolean;
}

export interface BarcodeVoteRecord {
  barcode: string;
  likes: number;
  dislikes: number;
  voters: Record<string, 'like' | 'dislike'>; // voterId (IP or device ID) -> vote
  statusOverride?: BarcodeStatus; // 'Valide' if likes >= 15
  isDeleted?: boolean; // true if dislikes >= 15
  lastVoterIp?: string;
}

export interface Product {
  id: number;
  code: string; // code (ex: 6037, XXXX, -)
  name: string; // produit
  department: Department; // département
  category: string; // catégorie
  barcodeMarjane?: string; // marjane
  barcodeP2?: string; // marjane 2
  barcodeInterne?: string; // marjane Interne
  barcodeMiniSecours?: string; // marjane mini
  barcodeSecours?: string; // marjane sec
  barcodeP3?: string; // marjane sec 2
  imageUrl?: string; // image_html
  département?: string; // alias raw department
  quantite?: 'kg' | 'g' | 'pièce'; // quantite pure sans chiffres
  isEnabled: boolean;
  isVerified100?: boolean; // Code-barres vérifié 100% khdam par Admin
  verificationStatus?: 'none' | 'broken' | '50' | '100'; // '100' = bleue, '50' = orange, 'broken' = rouge (makhdamch daba)
  barcodeMjValide?: string; // alias
  codeDisabled?: boolean; // Option "sans code": désactive l'obligation de code / code-barres pour rester visible
}

export interface DepartmentConfig {
  name: Department;
  shortName: string;
  icon: string;
  bgColor: string;
  accentColor: string;
  tagBg: string;
  tagText: string;
}

export type TipCategory = string;

export type CategoryColorKey =
  | 'blue'
  | 'emerald'
  | 'amber'
  | 'rose'
  | 'purple'
  | 'orange'
  | 'slate';

export interface CustomTipCategory {
  id: string;
  name: string;
  color?: CategoryColorKey;
}

export interface TipArticleBlock {
  id: string;
  type: 'text' | 'image' | 'image_text';
  heading?: string;
  text?: string;
  imageUrl?: string;
  caption?: string;
}

export interface TipPost {
  id: string;
  title: string;
  content: string;
  category: TipCategory;
  authorRole: string;
  authorName?: string;
  createdAt: string;
  likes: number;
  imageUrl?: string;
  targetAudience?: 'Tous' | 'Pickeur' | 'Livreur' | 'Référent';
  blocks?: TipArticleBlock[];
}

export type DataUpdateStatus = 'up-to-date' | 'update-available' | 'updating';

export interface UserDevice {
  device_id: string;
  ip_address: string;
  device_type: string;
  device_brand?: string;
  user_agent: string;
  screen_size: string;
  first_seen_at: string;
  last_active_at: string;
  total_time_seconds: number;
  visits_count: number;
  is_online?: boolean;
  worker_number?: string;
  city?: string;
  created_at?: string;
  updated_at?: string;
}

export interface DeviceStats {
  totalDevices: number;
  onlineDevices: number;
  totalTimeSeconds: number;
  mobileCount: number;
  desktopCount: number;
}

export type ActivityCategory =
  | 'AUTH'
  | 'PRODUCT'
  | 'VERIFICATION'
  | 'IMPORT_EXPORT'
  | 'BACKUP'
  | 'GUIDE'
  | 'TIPS'
  | 'BARCODE_VOTE'
  | 'SYSTEM';

export interface AppActivityLog {
  id: string;
  timestamp: string;
  localDateTime: string;
  category: ActivityCategory;
  action: string;
  actorRole: Role;
  deviceId: string;
  ipAddress: string;
  target?: string;
  details: string;
}

export interface GuideStepConfig {
  id: number;
  shortLabel: string;
  badge: string;
  headlineLine1: string;
  headlineLine2: string;
  description: string;
  primaryCtaLabel: string;
  secondaryCtaLabel: string;
  layoutKind?: 'comparison' | 'showcase' | 'actions' | 'free';
  accentColor?: 'rose' | 'sky' | 'amber' | 'emerald';
  customImageUrl?: string;
  customImageCaption?: string;
  customBlocks?: TipArticleBlock[];
  // Full per-step visual, background, typography & placement controls
  backgroundType?: 'theme' | 'solid' | 'gradient' | 'image';
  backgroundColor?: string;
  gradientFrom?: string;
  gradientTo?: string;
  gradientAngle?: number;
  backgroundImageUrl?: string;
  backgroundOverlayOpacity?: number;
  titleColor?: string;
  subtitleColor?: string;
  textColor?: string;
  badgeBgColor?: string;
  badgeTextColor?: string;
  ctaBgColor?: string;
  ctaTextColor?: string;
  secondaryCtaBgColor?: string;
  secondaryCtaTextColor?: string;
  cardBgColor?: string;
  mediaPosition?: 'bottom' | 'top' | 'left' | 'right' | 'hidden';
  textAlign?: 'left' | 'center' | 'right';
  contentVerticalAlign?: 'top' | 'center' | 'bottom';
  headlineSize?: 'sm' | 'md' | 'lg';
  imageSize?: 'sm' | 'md' | 'lg' | 'xl';
  imageFit?: 'contain' | 'cover';
  imageRounded?: 'none' | 'md' | 'xl' | '2xl';
  hideBadge?: boolean;
  hidePrimaryCta?: boolean;
  hideSecondaryCta?: boolean;
}

export interface AstucesPageConfig {
  pageTitle: string;
  backLabel: string;
  topNotice?: string;
  searchPlaceholder: string;
  audienceAllLabel: string;
  audiencePickeurLabel: string;
  audienceLivreurLabel: string;
  audienceReferentLabel: string;
  allCategoriesLabel: string;
  emptyTitle: string;
  emptySubtitle: string;
  heroBgImageUrl?: string;
  customCategories?: CustomTipCategory[];
}

export interface GuideConfig {
  version: number;
  updatedAt: string;
  topBrandTitle: string;
  summaryTitle?: string;
  footerHint: string;
  themePreset?: 'rose-blue' | 'ocean' | 'emerald' | 'amber' | 'midnight';
  // Global full-page style & layout controls
  globalBgType?: 'theme' | 'solid' | 'gradient' | 'image';
  globalBgColor?: string;
  globalGradientFrom?: string;
  globalGradientTo?: string;
  globalGradientAngle?: number;
  globalBgImageUrl?: string;
  globalOverlayOpacity?: number;
  headerBgColor?: string;
  headerTextColor?: string;
  summarySidebarPosition?: 'right' | 'left' | 'hidden';
  summaryCardBgColor?: string;
  summaryTextColor?: string;
  heroBanner?: {
    badge: string;
    headline: string;
    subtitle: string;
    ctaLabel: string;
  };
  astucesPage?: AstucesPageConfig;
  noCodeSettings?: {
    allowAllWithoutCode?: boolean;
    disabledCodeProductIds?: number[];
  };
  steps: GuideStepConfig[];
  slide1: {
    beforeBadge: string;
    beforeImageUrl: string;
    beforeCaption: string;
    afterBadge: string;
    afterBarcodeSample: string;
    afterImageUrl?: string;
    afterCaption: string;
    floatingPillText: string;
  };
  slide2: {
    showcaseImageUrl: string;
    repere1Title: string;
    repere1Text: string;
    repere2Title: string;
    repere2Text: string;
  };
  slide3: {
    card1Title: string;
    card1Subtitle: string;
    card2Title: string;
    card2Subtitle: string;
    card2PhoneDisplay: string;
    card2WhatsappNumber?: string;
    card2WhatsappMessage?: string;
  };
}

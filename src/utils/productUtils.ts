import { BarcodeVariant, Department, DepartmentConfig, Product } from '../types';

export const DEPARTMENT_CONFIGS: Record<Department, DepartmentConfig> = {
  'Boulangerie et pâtisserie': {
    name: 'Boulangerie et pâtisserie',
    shortName: 'Boulangerie',
    icon: 'Croissant',
    bgColor: '#FFF8E1',
    accentColor: '#F9A825',
    tagBg: '#FEF3C7',
    tagText: '#92400E',
  },
  'Fruits et légumes': {
    name: 'Fruits et légumes',
    shortName: 'Fruits & Légumes',
    icon: 'Apple',
    bgColor: '#E8F5E9',
    accentColor: '#2E7D32',
    tagBg: '#DCFCE7',
    tagText: '#14532D',
  },
  'Boucherie et volaille': {
    name: 'Boucherie et volaille',
    shortName: 'Boucherie & Volaille',
    icon: 'Beef',
    bgColor: '#FFEBEE',
    accentColor: '#B93838',
    tagBg: '#FEE2E2',
    tagText: '#991B1B',
  },
  'Fromage et charcuterie': {
    name: 'Fromage et charcuterie',
    shortName: 'Fromage & Charcuterie',
    icon: 'Ham',
    bgColor: '#FFF3CD',
    accentColor: '#0757A6',
    tagBg: '#DBEAFE',
    tagText: '#1E40AF',
  },
};

export interface CategoryColorTheme {
  solid: string;
  rowBgLight: string;
  rowBgDark: string;
  productBgLight: string;
  productBgDark: string;
  pillBgLight: string;
  pillTextLight: string;
  pillBorderLight: string;
  pillBgDark: string;
  pillTextDark: string;
  pillBorderDark: string;
}

const CATEGORY_COLOR_PRESETS: Record<string, CategoryColorTheme> = {
  // Fruits et légumes (Greens / Teals / Lime)
  fruits: {
    solid: '#059669',
    rowBgLight: '#ECFDF5',
    rowBgDark: 'rgba(5, 150, 105, 0.14)',
    productBgLight: '#D1FAE5',
    productBgDark: 'rgba(5, 150, 105, 0.24)',
    pillBgLight: '#D1FAE5',
    pillTextLight: '#065F46',
    pillBorderLight: '#6EE7B7',
    pillBgDark: 'rgba(5, 150, 105, 0.28)',
    pillTextDark: '#6EE7B7',
    pillBorderDark: 'rgba(110, 231, 183, 0.35)',
  },
  legumes: {
    solid: '#16A34A',
    rowBgLight: '#F0FDF4',
    rowBgDark: 'rgba(22, 163, 74, 0.14)',
    productBgLight: '#DCFCE7',
    productBgDark: 'rgba(22, 163, 74, 0.24)',
    pillBgLight: '#DCFCE7',
    pillTextLight: '#166534',
    pillBorderLight: '#86EFAC',
    pillBgDark: 'rgba(22, 163, 74, 0.28)',
    pillTextDark: '#86EFAC',
    pillBorderDark: 'rgba(134, 239, 172, 0.35)',
  },
  'herbes et salades': {
    solid: '#0D9488',
    rowBgLight: '#F0FDFA',
    rowBgDark: 'rgba(13, 148, 136, 0.15)',
    productBgLight: '#CCFBF1',
    productBgDark: 'rgba(13, 148, 136, 0.26)',
    pillBgLight: '#CCFBF1',
    pillTextLight: '#115E59',
    pillBorderLight: '#5EEAD4',
    pillBgDark: 'rgba(13, 148, 136, 0.28)',
    pillTextDark: '#5EEAD4',
    pillBorderDark: 'rgba(94, 234, 212, 0.35)',
  },
  champignon: {
    solid: '#65A30D',
    rowBgLight: '#F7FEE7',
    rowBgDark: 'rgba(101, 163, 13, 0.15)',
    productBgLight: '#ECFCCB',
    productBgDark: 'rgba(101, 163, 13, 0.25)',
    pillBgLight: '#ECFCCB',
    pillTextLight: '#3F6212',
    pillBorderLight: '#BEF264',
    pillBgDark: 'rgba(101, 163, 13, 0.28)',
    pillTextDark: '#BEF264',
    pillBorderDark: 'rgba(190, 242, 100, 0.35)',
  },

  // Boucherie et volaille (Reds / Rose)
  viandes: {
    solid: '#DC2626',
    rowBgLight: '#FEF2F2',
    rowBgDark: 'rgba(220, 38, 38, 0.15)',
    productBgLight: '#FEE2E2',
    productBgDark: 'rgba(220, 38, 38, 0.26)',
    pillBgLight: '#FEE2E2',
    pillTextLight: '#991B1B',
    pillBorderLight: '#FCA5A5',
    pillBgDark: 'rgba(220, 38, 38, 0.28)',
    pillTextDark: '#FCA5A5',
    pillBorderDark: 'rgba(252, 165, 165, 0.35)',
  },
  volaille: {
    solid: '#E11D48',
    rowBgLight: '#FFF1F2',
    rowBgDark: 'rgba(225, 29, 72, 0.15)',
    productBgLight: '#FFE4E6',
    productBgDark: 'rgba(225, 29, 72, 0.26)',
    pillBgLight: '#FFE4E6',
    pillTextLight: '#9F1239',
    pillBorderLight: '#FDA4AF',
    pillBgDark: 'rgba(225, 29, 72, 0.28)',
    pillTextDark: '#FDA4AF',
    pillBorderDark: 'rgba(253, 164, 175, 0.35)',
  },

  // Fromage et charcuterie (Sky Blue / Fuchsia Berry)
  fromages: {
    solid: '#0284C7',
    rowBgLight: '#F0F9FF',
    rowBgDark: 'rgba(2, 132, 199, 0.15)',
    productBgLight: '#E0F2FE',
    productBgDark: 'rgba(2, 132, 199, 0.26)',
    pillBgLight: '#E0F2FE',
    pillTextLight: '#075985',
    pillBorderLight: '#7DD3FC',
    pillBgDark: 'rgba(2, 132, 199, 0.28)',
    pillTextDark: '#7DD3FC',
    pillBorderDark: 'rgba(125, 211, 252, 0.35)',
  },
  charcuterie: {
    solid: '#C026D3',
    rowBgLight: '#FDF4FF',
    rowBgDark: 'rgba(192, 38, 211, 0.15)',
    productBgLight: '#FAE8FF',
    productBgDark: 'rgba(192, 38, 211, 0.26)',
    pillBgLight: '#FAE8FF',
    pillTextLight: '#86198F',
    pillBorderLight: '#F0ABFC',
    pillBgDark: 'rgba(192, 38, 211, 0.28)',
    pillTextDark: '#F0ABFC',
    pillBorderDark: 'rgba(240, 171, 252, 0.35)',
  },

  // Boulangerie et pâtisserie (Amber / Orange / Yellow / Violet)
  'pains et baguettes': {
    solid: '#D97706',
    rowBgLight: '#FFFBEB',
    rowBgDark: 'rgba(217, 119, 6, 0.15)',
    productBgLight: '#FEF3C7',
    productBgDark: 'rgba(217, 119, 6, 0.26)',
    pillBgLight: '#FEF3C7',
    pillTextLight: '#92400E',
    pillBorderLight: '#FCD34D',
    pillBgDark: 'rgba(217, 119, 6, 0.28)',
    pillTextDark: '#FCD34D',
    pillBorderDark: 'rgba(252, 211, 77, 0.35)',
  },
  viennoiseries: {
    solid: '#EA580C',
    rowBgLight: '#FFF7ED',
    rowBgDark: 'rgba(234, 88, 12, 0.15)',
    productBgLight: '#FFEDD5',
    productBgDark: 'rgba(234, 88, 12, 0.26)',
    pillBgLight: '#FFEDD5',
    pillTextLight: '#9A3412',
    pillBorderLight: '#FDBA74',
    pillBgDark: 'rgba(234, 88, 12, 0.28)',
    pillTextDark: '#FDBA74',
    pillBorderDark: 'rgba(253, 186, 116, 0.35)',
  },
  'gateaux traditionnels': {
    solid: '#CA8A04',
    rowBgLight: '#FEFCE8',
    rowBgDark: 'rgba(202, 138, 4, 0.15)',
    productBgLight: '#FEF9C3',
    productBgDark: 'rgba(202, 138, 4, 0.26)',
    pillBgLight: '#FEF9C3',
    pillTextLight: '#854D0E',
    pillBorderLight: '#FDE047',
    pillBgDark: 'rgba(202, 138, 4, 0.28)',
    pillTextDark: '#FDE047',
    pillBorderDark: 'rgba(253, 224, 71, 0.35)',
  },
  'patisseries et galettes': {
    solid: '#7C3AED',
    rowBgLight: '#F5F3FF',
    rowBgDark: 'rgba(124, 58, 237, 0.15)',
    productBgLight: '#EDE9FE',
    productBgDark: 'rgba(124, 58, 237, 0.26)',
    pillBgLight: '#EDE9FE',
    pillTextLight: '#5B21B6',
    pillBorderLight: '#C4B5FD',
    pillBgDark: 'rgba(124, 58, 237, 0.28)',
    pillTextDark: '#C4B5FD',
    pillBorderDark: 'rgba(196, 181, 253, 0.35)',
  },
};

const FALLBACK_CATEGORY_PALETTE: CategoryColorTheme[] = [
  CATEGORY_COLOR_PRESETS.fromages,
  CATEGORY_COLOR_PRESETS.fruits,
  CATEGORY_COLOR_PRESETS['pains et baguettes'],
  CATEGORY_COLOR_PRESETS.viandes,
  CATEGORY_COLOR_PRESETS['patisseries et galettes'],
  CATEGORY_COLOR_PRESETS['herbes et salades'],
  CATEGORY_COLOR_PRESETS.viennoiseries,
  CATEGORY_COLOR_PRESETS.charcuterie,
];

/**
 * Returns a consistent, high-contrast color theme for any product category.
 */
export function getCategoryColorTheme(category?: string): CategoryColorTheme {
  const norm = normalizeSearchText(category || 'Général');
  if (CATEGORY_COLOR_PRESETS[norm]) {
    return CATEGORY_COLOR_PRESETS[norm];
  }
  // Partial keyword matching for variations (e.g. "Légumes bio", "Fromage râpé")
  for (const [key, theme] of Object.entries(CATEGORY_COLOR_PRESETS)) {
    if (norm.includes(key) || key.includes(norm)) {
      return theme;
    }
  }
  // Deterministic hash fallback for any custom category
  let hash = 0;
  for (let i = 0; i < norm.length; i++) {
    hash = (hash * 31 + norm.charCodeAt(i)) >>> 0;
  }
  return FALLBACK_CATEGORY_PALETTE[hash % FALLBACK_CATEGORY_PALETTE.length];
}

/**
 * Validates a barcode value strictly according to requirements:
 * Exclude "0", "0.0", "-", "", "sans", "XXXX", null, undefined.
 * Must be between 8 and 14 digits (supports EAN-8, UPC-A 12-digit, EAN-13, and GTIN-14).
 */
export function isValidBarcodeString(val: string | undefined): boolean {
  if (!val) return false;
  const s = String(val).trim();
  if (
    s === '0' ||
    s === '0.0' ||
    s === '-' ||
    s === '' ||
    s.toLowerCase() === 'sans' ||
    s.toLowerCase() === 'null' ||
    s.toLowerCase() === 'undefined' ||
    s.toUpperCase() === 'XXXX'
  ) {
    return false;
  }
  const digits = s.replace(/\D/g, '');
  return digits.length >= 8 && digits.length <= 14;
}

/**
 * Gets the primary active barcode for a product from its effective barcode variants.
 */
export function getPrimaryBarcode(
  product: Product,
  votesMap?: Record<string, import('../types').BarcodeVoteRecord>
): string | undefined {
  const variants = getEffectiveBarcodeVariants(product, votesMap);
  return variants[0]?.code;
}

/**
 * Extracts all valid barcode variants for a given product according to user rules:
 * - marjane: Valid BLEU (kitbdlch lcodebarre b lpoid) mafihch like / ADD LITTLE ICON MARJAN
 * - marjane 2: Possible orange (kitbdlch lcodebarre b lpoid) / likes allowed / no marjane icon
 * - marjane Interne: Marjane bleu (makitbdlch lcodebarre b lpoid) mafihch like / ADD LITTLE ICON MARJAN
 * - marjane mini: Marjane bleu (makitbdlch lcodebarre b lpoid) mafihch like / ADD LITTLE ICON MARJAN
 * - marjane sec: Possible orange (kitbdlch lcodebarre b lpoid) / likes allowed / no marjane icon
 * - marjane sec 2: Possible orange (kitbdlch lcodebarre b lpoid) / likes allowed / no marjane icon
 */
export function getProductBarcodeVariants(product: Product): BarcodeVariant[] {
  const variants: BarcodeVariant[] = [];

  // 1. MARJANE (marjane) -> Blue, Marjane icon
  const codeMarjane = product.barcodeMarjane || (!product.barcodeInterne ? product.barcodeMjValide : undefined);
  if (isValidBarcodeString(codeMarjane)) {
    const code = codeMarjane!.replace(/\D/g, '');
    variants.push({
      type: 'marjane',
      label: 'MARJANE',
      code,
      format: code.length === 8 ? 'EAN-8' : 'EAN-13',
      status: 'Valide',
      accentColor: '#0759A4',
      badgeBg: '#EFF6FF',
      badgeText: '#1E40AF',
      hasMarjaneIcon: true,
      iconType: 'marjane',
      canVote: false,
    });
  }

  // 2. MARJANE 2 (marjane 2) -> Orange, Marjane icon, has likes
  if (isValidBarcodeString(product.barcodeP2)) {
    const code = product.barcodeP2!.replace(/\D/g, '');
    variants.push({
      type: 'marjane 2',
      label: 'MARJANE 2',
      code,
      format: code.length === 8 ? 'EAN-8' : 'EAN-13',
      status: 'Possible',
      accentColor: '#EA580C',
      badgeBg: '#FFF7ED',
      badgeText: '#C2410C',
      hasMarjaneIcon: true,
      iconType: 'marjane',
      canVote: true,
    });
  }

  // 3. MARJANE INTERNE (marjane Interne) -> Purple, Internet icon
  // STRICT RULE: 0 = NO CODEBARRES SECTION AFFICHE. Only shown if barcodeInterne is set!
  if (isValidBarcodeString(product.barcodeInterne)) {
    const code = product.barcodeInterne!.replace(/\D/g, '');
    variants.push({
      type: 'marjane Interne',
      label: 'MARJANE INTERNE',
      code,
      format: code.length === 8 ? 'EAN-8' : 'EAN-13',
      status: 'Valide',
      accentColor: '#7C3AED',
      badgeBg: '#F5F3FF',
      badgeText: '#6D28D9',
      hasMarjaneIcon: false,
      iconType: 'internet',
      canVote: false,
    });
  }

  // 4. MARJANE MINI (marjane mini) -> Chibi (Bleu ciel), Marjane icon
  if (isValidBarcodeString(product.barcodeMiniSecours)) {
    const code = product.barcodeMiniSecours!.replace(/\D/g, '');
    variants.push({
      type: 'marjane mini',
      label: 'MARJANE MINI',
      code,
      format: 'EAN-8',
      status: 'Valide',
      accentColor: '#0284C7',
      badgeBg: '#F0F9FF',
      badgeText: '#0369A1',
      hasMarjaneIcon: true,
      iconType: 'marjane',
      canVote: false,
    });
  }

  // 5. MARJANE SEC (marjane sec) -> Gris, Plus icon, has likes
  if (isValidBarcodeString(product.barcodeSecours)) {
    const code = product.barcodeSecours!.replace(/\D/g, '');
    variants.push({
      type: 'marjane sec',
      label: 'MARJANE SEC',
      code,
      format: code.length === 8 ? 'EAN-8' : 'EAN-13',
      status: 'Possible',
      accentColor: '#64748B',
      badgeBg: '#F1F5F9',
      badgeText: '#334155',
      hasMarjaneIcon: false,
      iconType: 'plus',
      canVote: true,
    });
  }

  // 6. MARJANE SEC 2 (marjane sec 2) -> Gris, Plus icon, has likes
  if (isValidBarcodeString(product.barcodeP3)) {
    const code = product.barcodeP3!.replace(/\D/g, '');
    variants.push({
      type: 'marjane sec 2',
      label: 'MARJANE SEC 2',
      code,
      format: code.length === 8 ? 'EAN-8' : 'EAN-13',
      status: 'Possible',
      accentColor: '#64748B',
      badgeBg: '#F1F5F9',
      badgeText: '#334155',
      hasMarjaneIcon: false,
      iconType: 'plus',
      canVote: true,
    });
  }

  return variants;
}

/**
 * Normalizes text for search (lowercase, removes accents and special characters).
 */
export function normalizeSearchText(text: string): string {
  return (text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

/**
 * Check if a product code is valid (not empty, not '-', and not 'XXXX').
/**
 * Check if a product code is valid (not empty, not '-', and not 'XXXX').
 */
export function hasValidProductCode(code: string | undefined): boolean {
  if (!code) return false;
  const s = code.trim().toUpperCase();
  return s !== '' && s !== '-' && s !== 'XXXX';
}

/**
 * Check if a product has code 'XXXX'.
 */
export function isProductCodeXXXX(code: string | undefined): boolean {
  if (!code) return false;
  return code.trim().toUpperCase() === 'XXXX';
}

/**
 * Check if a product has code '0000'.
 */
export function isProductCode0000(code: string | undefined): boolean {
  if (!code) return false;
  const s = code.trim().replace(/^#\s*/, '');
  return s === '0000';
}

/**
 * Checks if a product has no valid short code (empty, '-', or 'XXXX').
 */
export function isProductMissingCode(product: Product): boolean {
  return !hasValidProductCode(product.code);
}

/**
 * Checks if a product has no valid barcode.
 */
export function isProductMissingBarcode(product: Product): boolean {
  return getProductBarcodeVariants(product).length === 0;
}

/**
 * Checks if a product is incomplete (missing short code OR missing barcode).
 */
export function isProductIncomplete(product: Product): boolean {
  return isProductMissingCode(product) || isProductMissingBarcode(product);
}

/**
 * Strips leading '#' and trims short product code.
 */
export function getCleanProductCode(code: string | undefined): string {
  if (!code) return '';
  const s = code.trim();
  if (s === '-' || s === '' || s.toUpperCase() === 'XXXX') return '';
  return s.replace(/^#\s*/, '').trim();
}

/**
 * Checks whether a product's barcode is verified:
 * - Admin marked it 100% khdam (`verificationStatus === '100'` or `isVerified100 === true`)
 * - Or community-approved via 15+ likes when not explicitly marked broken/50%
 */
export function isProductBarcodeVerified(
  product: Product | null | undefined,
  votesMap?: Record<string, import('../types').BarcodeVoteRecord>
): boolean {
  if (!product) return false;
  if (product.verificationStatus === '100' || product.isVerified100 === true) {
    return true;
  }
  if (product.verificationStatus === 'broken' || product.verificationStatus === '50') {
    return false;
  }
  if (votesMap && Object.keys(votesMap).length > 0) {
    const variants = getEffectiveBarcodeVariants(product, votesMap);
    if (variants.some((v) => v.isCommunityApproved)) {
      return true;
    }
  }
  return false;
}

/**
 * Format product code badge:
 * - If code is disabled (codeDisabled) -> "Non adressé"
 * - If code is 0000 -> "Non adressé"
 * - If valid short code -> clean code
 * - If missing/empty/invalid AND barcode is verified -> "Non adressé"
 * - Otherwise -> "Indisponible"
 */
export function formatProductCodeBadge(
  code: string | undefined,
  product?: Product | null,
  votesMap?: Record<string, import('../types').BarcodeVoteRecord>,
  noCodeSettings?: NoCodeVisibilitySettings
): string {
  if (product && isProductCodeDisabled(product, noCodeSettings)) {
    return 'Non adressé';
  }
  const clean = getCleanProductCode(code);
  if (clean === '0000') return 'Non adressé';
  if (clean && clean !== '-' && clean.trim() !== '') return clean;
  if (product && isProductBarcodeVerified(product, votesMap)) {
    return 'Non adressé';
  }
  return 'Indisponible';
}

/**
 * Extracts barcode variants with community votes applied:
 * - 15+ likes -> Promoted to status 'Valide'
 * - 15+ dislikes -> Deleted/hidden automatically
 */
export function getEffectiveBarcodeVariants(
  product: Product,
  votesMap?: Record<string, import('../types').BarcodeVoteRecord>,
  currentWorkerNumber?: string
): BarcodeVariant[] {
  const baseVariants = getProductBarcodeVariants(product);
  if (!votesMap || Object.keys(votesMap).length === 0) {
    return baseVariants;
  }

  const result: BarcodeVariant[] = [];

  for (const v of baseVariants) {
    const record = votesMap[v.code];
    if (record) {
      // Condition 2: 15 dislikes -> Barcode auto-deleted from app & dashboard
      if (record.isDeleted || (record.dislikes >= 15)) {
        continue;
      }

      // Condition 1: 15 likes -> Barcode transitions to 'marjane' case (Valid BLEU, Marjane icon, no like buttons)
      const isPromoted = record.statusOverride === 'Valide' || record.likes >= 15;
      const status = isPromoted ? 'Valide' : v.status;
      const userVote = currentWorkerNumber ? record.voters?.[currentWorkerNumber] || null : null;

      if (isPromoted) {
        result.push({
          ...v,
          type: 'marjane',
          label: 'MARJANE',
          status: 'Valide',
          accentColor: '#0759A4',
          badgeBg: '#EFF6FF',
          badgeText: '#1E40AF',
          hasMarjaneIcon: true,
          iconType: 'marjane',
          canVote: false, // like buttons disappear
          likes: record.likes || 0,
          dislikes: record.dislikes || 0,
          userVote,
          isCommunityApproved: true,
        });
      } else {
        result.push({
          ...v,
          status,
          likes: record.likes || 0,
          dislikes: record.dislikes || 0,
          userVote,
          isCommunityApproved: false,
          accentColor: v.accentColor,
          badgeBg: v.badgeBg,
          badgeText: v.badgeText,
          hasMarjaneIcon: v.hasMarjaneIcon,
          iconType: v.iconType,
          canVote: v.canVote,
        });
      }
    } else {
      result.push(v);
    }
  }

  return result;
}

export interface NoCodeVisibilitySettings {
  allowAllWithoutCode?: boolean;
  disabledCodeProductIds?: number[] | Set<number>;
}

/**
 * Checks whether code/barcode requirement is disabled for this product
 * (either per-article or via global admin setting).
 */
export function isProductCodeDisabled(
  product: Product,
  settings?: NoCodeVisibilitySettings
): boolean {
  if (product.codeDisabled) return true;
  if (settings?.allowAllWithoutCode) return true;
  const ids = settings?.disabledCodeProductIds;
  if (!ids) return false;
  if (ids instanceof Set) return ids.has(product.id);
  return Array.isArray(ids) && ids.includes(product.id);
}

/**
 * Check if a product has at least one valid and active barcode.
 */
export function hasProductBarcodes(
  product: Product,
  votesMap?: Record<string, import('../types').BarcodeVoteRecord>
): boolean {
  return getEffectiveBarcodeVariants(product, votesMap).length > 0;
}

/**
 * Returns true if the product should be visible in search & department library.
 * Strict rule: ONLY products with at least one active barcode are visible.
 */
export function isProductVisibleInCatalog(
  product: Product,
  votesMap?: Record<string, import('../types').BarcodeVoteRecord>,
  _noCodeSettings?: NoCodeVisibilitySettings
): boolean {
  if (!product.isEnabled) return false;
  if (isProductCodeXXXX(product.code)) return false;
  return hasProductBarcodes(product, votesMap);
}

export type ProductDisplayStatus =
  | 'HIDDEN_XXXX'             // Code XXXX -> Never shown
  | 'HIDDEN_NO_CODE_NO_BC'    // No code and no barcode -> Hidden (shown in Aidez-nous)
  | 'UNAVAILABLE_NO_BARCODE'  // Has code, but no barcode -> Hidden (shown in Aidez-nous)
  | 'AVAILABLE_CODE_DISABLED' // Legacy status kept for compatibility
  | 'AVAILABLE_NO_CODE'       // Has barcode, but no code -> Shown, clickable, code badge says "Indisponible"
  | 'AVAILABLE_NON_ADRESSE'   // Has barcode and code 0000 / disabled / verified -> Shown, clickable, code badge says "Non adressé"
  | 'AVAILABLE_FULL';         // Has code AND barcode -> Normal active product

/**
 * Determines exact display and interaction status based on user rules:
 * 1. LI 3ANDO CODE XXXX MKIBANCH BMERA
 * 2. Only products WITH a barcode appear in search/catalog; products without barcodes go to Aidez-nous
 * 3. Products with disabled code (codeDisabled), code 0000, or verified barcode show "Non adressé"
 */
export function getProductDisplayStatus(
  product: Product,
  votesMap?: Record<string, import('../types').BarcodeVoteRecord>,
  noCodeSettings?: NoCodeVisibilitySettings
): ProductDisplayStatus {
  const isXXXX = isProductCodeXXXX(product.code);
  if (isXXXX) return 'HIDDEN_XXXX';

  const hasCode = hasValidProductCode(product.code);
  const hasBc = hasProductBarcodes(product, votesMap);
  const codeDisabled = isProductCodeDisabled(product, noCodeSettings);

  if (!hasBc) {
    return hasCode ? 'UNAVAILABLE_NO_BARCODE' : 'HIDDEN_NO_CODE_NO_BC';
  }

  if (codeDisabled || isProductCode0000(product.code)) {
    return 'AVAILABLE_NON_ADRESSE';
  }

  if (!hasCode) {
    if (isProductBarcodeVerified(product, votesMap)) {
      return 'AVAILABLE_NON_ADRESSE';
    }
    return 'AVAILABLE_NO_CODE';
  }

  return 'AVAILABLE_FULL';
}

function tokenizeWords(text: string): string[] {
  return normalizeSearchText(text)
    .split(/[\s\-_'’.,/()]+/)
    .filter(Boolean);
}

function pickSingleBestCodeMatch(list: Product[]): Product[] {
  if (list.length <= 1) return list;
  const sorted = [...list].sort((a, b) => {
    const aVer = a.verificationStatus === '100' || a.isVerified100 ? 1 : 0;
    const bVer = b.verificationStatus === '100' || b.isVerified100 ? 1 : 0;
    if (aVer !== bVer) return bVer - aVer;
    const aImg = a.imageUrl ? 1 : 0;
    const bImg = b.imageUrl ? 1 : 0;
    if (aImg !== bImg) return bImg - aImg;
    return a.id - b.id;
  });
  return [sorted[0]];
}

/**
 * Filter products in real-time (< 100ms) with strict rules:
 * - Products with code XXXX are hidden
 * - ONLY products with barcodes appear when onlyWithBarcodes=true
 * - Search ONLY matches by CODE (short code / barcode) OR product NAME
 * - If searching by CODE (exact code or exact barcode): returns ONLY 1 article
 * - If searching by NAME: returns strictly products whose name matches what the user typed
 */
export function filterProducts(
  products: Product[],
  query: string,
  departmentFilter?: Department | 'ALL',
  categoryFilter?: string | 'ALL',
  onlyWithBarcodes = true,
  includeXXXX = false,
  barcodeVotes?: Record<string, import('../types').BarcodeVoteRecord>,
  currentWorkerNumber?: string,
  noCodeSettings?: NoCodeVisibilitySettings
): Product[] {
  const cleanQuery = (query || '').replace(/^#\s*/, '').trim();
  const normQuery = normalizeSearchText(cleanQuery);
  const isNumericQuery = /^\d+$/.test(normQuery);
  const queryWords = tokenizeWords(cleanQuery);

  // 1. Initial filter by active state and user visibility rules
  const candidates = products.filter((p) => {
    if (!p.isEnabled) return false;

    // Rule 1: LI 3ANDO CODE XXXX MKIBANCH BMERA
    if (!includeXXXX && isProductCodeXXXX(p.code)) {
      return false;
    }

    // Rule 6: ONLY products with barcodes appear in search & library
    if (onlyWithBarcodes && !hasProductBarcodes(p, barcodeVotes)) {
      return false;
    }

    const status = getProductDisplayStatus(p, barcodeVotes, noCodeSettings);

    if (!includeXXXX && status === 'HIDDEN_XXXX') {
      return false;
    }

    if (onlyWithBarcodes && (status === 'HIDDEN_NO_CODE_NO_BC' || status === 'UNAVAILABLE_NO_BARCODE')) {
      return false;
    }

    if (departmentFilter && departmentFilter !== 'ALL' && p.department !== departmentFilter) {
      return false;
    }

    if (categoryFilter && categoryFilter !== 'ALL' && p.category !== categoryFilter) {
      return false;
    }

    return true;
  });

  if (!normQuery) {
    return candidates;
  }

  // 2A. NUMERIC QUERY: CODE (short code / barcode) OR numeric word in product name
  if (isNumericQuery) {
    const exactCodeMatches: Product[] = [];
    const exactBarcodeMatches: Product[] = [];
    const prefixCodeMatches: Product[] = [];
    const prefixBarcodeMatches: Product[] = [];
    const nameNumericMatches: Array<{ product: Product; score: number }> = [];

    for (const p of candidates) {
      const codeDisabled = isProductCodeDisabled(p, noCodeSettings);
      const rawCode = codeDisabled ? '' : getCleanProductCode(p.code);
      const normCode = rawCode.toLowerCase();
      const variants = getEffectiveBarcodeVariants(p, barcodeVotes, currentWorkerNumber);

      if (normCode && normCode === normQuery) {
        exactCodeMatches.push(p);
        continue;
      }

      if (variants.some((v) => v.code === normQuery)) {
        exactBarcodeMatches.push(p);
        continue;
      }

      if (normCode && normCode.startsWith(normQuery)) {
        prefixCodeMatches.push(p);
        continue;
      }

      if (normQuery.length >= 6 && variants.some((v) => v.code.startsWith(normQuery))) {
        prefixBarcodeMatches.push(p);
        continue;
      }

      const nameWords = tokenizeWords(p.name);
      if (nameWords.some((w) => w === normQuery || w.startsWith(normQuery))) {
        nameNumericMatches.push({
          product: p,
          score: nameWords.some((w) => w === normQuery) ? 200 : 100,
        });
      }
    }

    // Rule 4: If code matches, strictly return ONLY ONE article
    if (exactCodeMatches.length > 0) {
      return pickSingleBestCodeMatch(exactCodeMatches);
    }
    if (exactBarcodeMatches.length > 0) {
      return pickSingleBestCodeMatch(exactBarcodeMatches);
    }
    if (prefixCodeMatches.length > 0) {
      prefixCodeMatches.sort((a, b) => {
        const ca = getCleanProductCode(a.code).length;
        const cb = getCleanProductCode(b.code).length;
        if (ca !== cb) return ca - cb;
        return a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' });
      });
      return prefixCodeMatches;
    }
    if (prefixBarcodeMatches.length > 0) {
      return prefixBarcodeMatches;
    }

    nameNumericMatches.sort((a, b) => b.score - a.score);
    return nameNumericMatches.map((m) => m.product);
  }

  // 2B. TEXT QUERY: STRICTLY PRODUCT NAME (or exact alphanumeric short code)
  const exactAlnumCodeMatches: Product[] = [];
  const scoredNames: Array<{ product: Product; score: number }> = [];

  for (const p of candidates) {
    const codeDisabled = isProductCodeDisabled(p, noCodeSettings);
    const rawCode = codeDisabled ? '' : getCleanProductCode(p.code);
    const normCode = rawCode.toLowerCase();

    if (normCode && normCode === normQuery) {
      exactAlnumCodeMatches.push(p);
      continue;
    }

    const normName = normalizeSearchText(p.name);
    const nameWords = tokenizeWords(p.name);

    let score = 0;
    if (normName === normQuery) {
      score = 10000;
    } else if (normName.startsWith(normQuery)) {
      score = 7000;
    } else if (
      queryWords.length > 0 &&
      queryWords.every((token) => nameWords.some((w) => w.startsWith(token)))
    ) {
      score = 3000;
      if (queryWords.every((token) => nameWords.includes(token))) {
        score += 2000;
      }
      if (normName.includes(normQuery)) {
        score += 1500;
      }
    }

    if (score > 0) {
      scoredNames.push({ product: p, score });
    }
  }

  if (exactAlnumCodeMatches.length > 0) {
    return pickSingleBestCodeMatch(exactAlnumCodeMatches);
  }

  scoredNames.sort((a, b) => b.score - a.score);
  return scoredNames.map((s) => s.product);
}

export type ProductSortMode =
  | 'default'
  | 'alpha-asc'
  | 'alpha-desc'
  | 'code-asc'
  | 'code-desc'
  | 'category-asc';

const FRENCH_NUMERIC_COLLATOR = new Intl.Collator('fr', {
  sensitivity: 'base',
  numeric: true,
});

/**
 * Returns the normalized uppercase A-Z first character (or '#' for digits/other) of a product name.
 */
export function getNormalizedInitialLetter(name: string): string {
  const norm = normalizeSearchText(name);
  if (!norm) return '#';
  const ch = norm.charAt(0).toUpperCase();
  return ch >= 'A' && ch <= 'Z' ? ch : '#';
}

/**
 * Returns sorted unique initial letters present across a list of products.
 */
export function getAvailableInitialLetters(list: Product[]): string[] {
  const set = new Set<string>();
  for (const p of list) {
    set.add(getNormalizedInitialLetter(p.name));
  }
  return Array.from(set).sort((a, b) => {
    if (a === '#') return 1;
    if (b === '#') return -1;
    return a.localeCompare(b, 'fr');
  });
}

/**
 * Sorts a list of products by alphabetical name, short code, or category without mutating the source array.
 */
export function sortProducts(list: Product[], mode: ProductSortMode): Product[] {
  if (mode === 'default' || list.length <= 1) {
    return list;
  }

  const copy = [...list];

  switch (mode) {
    case 'alpha-asc':
      return copy.sort((a, b) => {
        const cmp = FRENCH_NUMERIC_COLLATOR.compare((a.name || '').trim(), (b.name || '').trim());
        return cmp !== 0 ? cmp : a.id - b.id;
      });

    case 'alpha-desc':
      return copy.sort((a, b) => {
        const cmp = FRENCH_NUMERIC_COLLATOR.compare((b.name || '').trim(), (a.name || '').trim());
        return cmp !== 0 ? cmp : a.id - b.id;
      });

    case 'code-asc':
    case 'code-desc': {
      const dir = mode === 'code-asc' ? 1 : -1;
      return copy.sort((a, b) => {
        const codeA = getCleanProductCode(a.code);
        const codeB = getCleanProductCode(b.code);
        if (!codeA && !codeB) {
          return FRENCH_NUMERIC_COLLATOR.compare((a.name || '').trim(), (b.name || '').trim());
        }
        if (!codeA) return 1; // Products without code always at bottom
        if (!codeB) return -1;
        const cmp = FRENCH_NUMERIC_COLLATOR.compare(codeA, codeB) * dir;
        if (cmp !== 0) return cmp;
        return FRENCH_NUMERIC_COLLATOR.compare((a.name || '').trim(), (b.name || '').trim());
      });
    }

    case 'category-asc':
      return copy.sort((a, b) => {
        const catA = (a.category || 'Général').trim();
        const catB = (b.category || 'Général').trim();
        const cmp = FRENCH_NUMERIC_COLLATOR.compare(catA, catB);
        if (cmp !== 0) return cmp;
        return FRENCH_NUMERIC_COLLATOR.compare((a.name || '').trim(), (b.name || '').trim());
      });

    default:
      return list;
  }
}

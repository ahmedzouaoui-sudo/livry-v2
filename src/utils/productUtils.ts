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
 * Format product code badge:
 * - If code is 0000 -> "Non adressé"
 * - If empty or invalid -> "Indisponible"
 * - Otherwise -> clean code
 */
export function formatProductCodeBadge(code: string | undefined): string {
  if (!code) return 'Indisponible';
  const clean = getCleanProductCode(code);
  if (!clean || clean === '-' || clean.trim() === '') return 'Indisponible';
  if (clean === '0000') return 'Non adressé';
  return clean;
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

/**
 * Check if a product has at least one valid and active barcode.
 */
export function hasProductBarcodes(
  product: Product,
  votesMap?: Record<string, import('../types').BarcodeVoteRecord>
): boolean {
  return getEffectiveBarcodeVariants(product, votesMap).length > 0;
}

export type ProductDisplayStatus =
  | 'HIDDEN_XXXX'           // Code XXXX -> Never shown
  | 'HIDDEN_NO_CODE_NO_BC'   // No code and no barcode -> Never shown
  | 'UNAVAILABLE_NO_BARCODE' // Has code, but no barcode -> Hidden by user rule "okhbi libla code barres"
  | 'AVAILABLE_NO_CODE'      // Has barcode, but no code -> Shown, clickable, code badge says "Indisponible"
  | 'AVAILABLE_NON_ADRESSE'  // Has barcode and code 0000 -> Shown, clickable, code badge says "Non adressé"
  | 'AVAILABLE_FULL';        // Has code AND barcode -> Normal active product

/**
 * Determines exact display and interaction status based on user rules:
 * 1. LI 3ANDO CODE XXXX MKIBANCH BMERA
 * 2. okhbi libla code barres kidima khli ghir li fihom codebarre -> Any product without barcode is hidden
 * 3. 0000 -> Non adressé
 */
export function getProductDisplayStatus(
  product: Product,
  votesMap?: Record<string, import('../types').BarcodeVoteRecord>
): ProductDisplayStatus {
  const isXXXX = isProductCodeXXXX(product.code);
  if (isXXXX) return 'HIDDEN_XXXX';

  const hasCode = hasValidProductCode(product.code);
  const hasBc = hasProductBarcodes(product, votesMap);

  // User rule: "okhbi libla code barres kidima khlighirli fihom codebarre"
  if (!hasBc) {
    return hasCode ? 'UNAVAILABLE_NO_BARCODE' : 'HIDDEN_NO_CODE_NO_BC';
  }

  if (isProductCode0000(product.code)) {
    return 'AVAILABLE_NON_ADRESSE';
  }

  if (!hasCode) {
    return 'AVAILABLE_NO_CODE';
  }

  return 'AVAILABLE_FULL';
}

/**
 * Filter products in real-time (< 100ms) with multiple criteria.
 * Enforces user rules:
 * - Products with code XXXX are hidden
 * - Products without barcodes are hidden (okhbi libla code barres kidima khli ghir li fihom codebarre)
 * - Products with code 0000 are displayed with "Non adressé"
 */
export function filterProducts(
  products: Product[],
  query: string,
  departmentFilter?: Department | 'ALL',
  categoryFilter?: string | 'ALL',
  onlyWithBarcodes = true,
  includeXXXX = false,
  barcodeVotes?: Record<string, import('../types').BarcodeVoteRecord>,
  currentWorkerNumber?: string
): Product[] {
  const cleanQuery = (query || '').replace(/^#\s*/, '').trim();
  const normQuery = normalizeSearchText(cleanQuery);
  const isNumericQuery = /^\d+$/.test(normQuery);
  const queryTokens = normQuery.split(/\s+/).filter(Boolean);

  // 1. Initial filter by active state and user visibility rules
  const candidates = products.filter((p) => {
    if (!p.isEnabled) return false;

    // RULE: Products without barcodes NEVER appear in search or library
    // (Until a barcode is entered for them, then they become accessible)
    if (!hasProductBarcodes(p, barcodeVotes)) {
      return false;
    }

    // Rule 1: LI 3ANDO CODE XXXX MKIBANCH BMERA
    if (!includeXXXX && isProductCodeXXXX(p.code)) {
      return false;
    }

    const status = getProductDisplayStatus(p, barcodeVotes);

    if (!includeXXXX && status === 'HIDDEN_XXXX') {
      return false;
    }

    // Rule 2: okhbi libla code barres kidima khli ghir li fihom codebarre
    if (status === 'HIDDEN_NO_CODE_NO_BC' || status === 'UNAVAILABLE_NO_BARCODE') {
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

  // 2. Score candidate products
  interface ScoredProduct {
    product: Product;
    score: number;
  }

  const scored: ScoredProduct[] = [];

  for (const p of candidates) {
    const rawCode = getCleanProductCode(p.code);
    const normCode = rawCode.toLowerCase();
    const is0000 = isProductCode0000(p.code);
    const normName = normalizeSearchText(p.name);
    const normCategory = normalizeSearchText(p.category || '');
    const variants = getEffectiveBarcodeVariants(p, barcodeVotes, currentWorkerNumber);

    let score = 0;

    // --- Search for 'non adresse' matching 0000 items ---
    if (is0000 && (normQuery === 'non adresse' || normQuery === 'non adresse' || normQuery.includes('non adr') || (queryTokens.includes('non') && queryTokens.includes('adresse')))) {
      score += 10000;
    }

    // --- A. NUMERIC SHORT CODE QUERY (2, 3, 4 digits or any digits) ---
    if (isNumericQuery) {
      // 1. Exact match on short code (e.g. typing "6037", "552", "12", "83", "0000") -> Top Priority
      if (normCode === normQuery) {
        score += 10000;
      }
      // 2. Short code starts with query (e.g. typing "60" matches "6037", "12" matches "125")
      else if (normCode && normCode.startsWith(normQuery)) {
        score += 6000 + Math.max(0, 50 - normCode.length);
      }
      // 3. Short code ends with query
      else if (normCode && normCode.endsWith(normQuery)) {
        score += 4000;
      }
      // 4. Short code contains query
      else if (normCode && normCode.includes(normQuery)) {
        score += 3000;
      }

      // 5. Barcode matching
      for (const v of variants) {
        const cleanVCode = v.code;
        // Exact barcode match
        if (cleanVCode === normQuery) {
          score += 2500;
          break;
        }
        // Barcode starts with query
        else if (cleanVCode.startsWith(normQuery)) {
          score += 1500;
          break;
        }
        // Barcode contains query (only for queries >= 4 digits to avoid noise with 2 or 3 digits)
        else if (normQuery.length >= 4 && cleanVCode.includes(normQuery)) {
          score += 1000;
          break;
        }
      }

      // 6. Product name contains the numeric query (e.g., "500" matching "500g")
      if (normName.includes(normQuery)) {
        score += 500;
      }
    }

    // --- B. TEXT QUERY OR MULTI-WORD QUERY (Product Name / Designation) ---
    if (score === 0) {
      // Exact name match
      if (normName === normQuery) {
        score += 8000;
      }
      // Name starts with query
      else if (normName.startsWith(normQuery)) {
        score += 5000;
      }
      // Code match (alphanumeric code)
      else if (normCode && normCode === normQuery) {
        score += 7000;
      }
      // Multi-word matching across name, category, and code
      else if (queryTokens.length > 0) {
        const combined = `${normName} ${normCategory} ${normCode} ${is0000 ? 'non adresse' : ''}`;
        const allTokensFound = queryTokens.every((token) => combined.includes(token));
        if (allTokensFound) {
          score += 2000;
          // Extra bonus if all tokens found directly in product name
          if (queryTokens.every((token) => normName.includes(token))) {
            score += 1000;
          }
          // Extra bonus if product name contains exact phrase
          if (normName.includes(normQuery)) {
            score += 1000;
          }
        }
      }
    }

    if (score > 0) {
      scored.push({ product: p, score });
    }
  }

  // Sort descending by relevance score
  scored.sort((a, b) => b.score - a.score);

  return scored.map((s) => s.product);
}

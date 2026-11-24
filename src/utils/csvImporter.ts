import { Department, Product } from '../types';
import { cleanImageUrl } from '../services/supabaseService';
import { extractPureUnit } from './productWeight';
import { sanitizeCsvCell } from './securityUtils';
import { normalizeSearchText } from './productUtils';

/**
 * Robust CSV parser that handles BOM, quotes, escaped quotes, and commas/semicolons.
 */
export function parseCSVLines(rawText: string): string[][] {
  const text = (rawText || '').replace(/^\uFEFF/, '');
  const lines: string[][] = [];
  let row: string[] = [];
  let current = '';
  let inQuotes = false;

  // Detect delimiter: comma or semicolon
  const firstLine = text.slice(0, 1000).split(/\r?\n/)[0] || '';
  const delimiter = firstLine.includes(';') && !firstLine.includes(',') ? ';' : ',';

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === delimiter && !inQuotes) {
      row.push(current.trim());
      current = '';
    } else if ((char === '\r' || char === '\n') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') {
        i++;
      }
      row.push(current.trim());
      if (row.some((cell) => cell.length > 0)) {
        lines.push(row);
      }
      row = [];
      current = '';
    } else {
      current += char;
    }
  }

  if (current.length > 0 || row.length > 0) {
    row.push(current.trim());
    if (row.some((cell) => cell.length > 0)) {
      lines.push(row);
    }
  }

  return lines;
}

const cleanBarcode = (val: string | undefined): string | undefined => {
  if (!val) return undefined;
  let s = val.trim();
  if (s.endsWith('.0')) s = s.slice(0, -2);
  if (
    s === '0' ||
    s === '0.0' ||
    s === '-' ||
    s === '' ||
    s.toLowerCase() === 'sans' ||
    s.toUpperCase() === 'XXXX'
  ) {
    return undefined;
  }
  const digitsOnly = s.replace(/\D/g, '');
  if (digitsOnly.length >= 8 && digitsOnly.length <= 14) {
    return digitsOnly;
  }
  return undefined;
};

const mapDept = (dept: string): Department => {
  const d = normalizeSearchText(dept || '').toUpperCase();
  if (d.includes('BOUCHERIE') || d.includes('VOLAIL') || d.includes('VIANDE')) {
    return 'Boucherie et volaille';
  }
  if (d.includes('STAND') || d.includes('FROMAG') || d.includes('CHARCUT') || d.includes('CREMER')) {
    return 'Fromage et charcuterie';
  }
  if (d.includes('BOULANG') || d.includes('PATISS') || d.includes('PAIN') || d.includes('VIENNOIS')) {
    return 'Boulangerie et pâtisserie';
  }
  if (d.includes('MARCHE') || d.includes('FRUIT') || d.includes('LEGUM') || d.includes('PRIMEUR')) {
    return 'Fruits et légumes';
  }
  return 'Fruits et légumes';
};

interface CategoryRule {
  category: string;
  department: Department;
  keywords: string[];
}

const CATEGORY_TAXONOMY_RULES: CategoryRule[] = [
  {
    category: 'Volaille',
    department: 'Boucherie et volaille',
    keywords: [
      'poulet', 'poule', 'coquelet', 'dinde', 'dindonneau', 'escalope de dinde',
      'blanc de poulet', 'cuisse de poulet', 'haut de cuisse', 'pilon', 'aile de poulet',
      'aiguillette', 'gesier', 'canard', 'caille', 'lapin', 'volaille', 'djaj', 'bibi',
    ],
  },
  {
    category: 'Viandes',
    department: 'Boucherie et volaille',
    keywords: [
      'boeuf', 'bœuf', 'veau', 'agneau', 'mouton', 'viande', 'kefta', 'hachee', 'hache',
      'steak', 'beefsteak', 'entrecote', 'cotelette', 'cote de boeuf', 'brochette',
      'merguez', 'saucisse', 'chipolata', 'gigot', 'epaule d', 'collier', 'jarret',
      'foie de', 'cervelle', 'langue de', 'roti de', 'tendre', 'bavette', 'flank',
      'faux filet', 'filet de boeuf', 'rumsteck', 'bourguignon', 'lham', 'kfta',
    ],
  },
  {
    category: 'Charcuterie',
    department: 'Fromage et charcuterie',
    keywords: [
      'charcuterie', 'jambon', 'mortadelle', 'mortadella', 'salami', 'cachir', 'kachir',
      'saucisson', 'chorizo', 'pate ', 'pâté', 'rillettes', 'dinde fumee', 'poulet fume',
      'blanc de dinde fume', 'roti fume', 'bacon', 'halal fume', 'cervelas',
    ],
  },
  {
    category: 'Fromages',
    department: 'Fromage et charcuterie',
    keywords: [
      'fromage', 'edam', 'gouda', 'emmental', 'gruyere', 'comte', 'mozzarella',
      'parmesan', 'cheddar', 'brie', 'camembert', 'roquefort', 'feta', 'chèvre', 'chevre',
      'mascarpone', 'ricotta', 'mimolette', 'raclette', 'maasdam', 'coulommiers',
      'fromage rouge', 'fromage blanc', 'kiri', 'president', 'kashkaval', 'fermage',
    ],
  },
  {
    category: 'Champignon',
    department: 'Fruits et légumes',
    keywords: ['champignon', 'pleurote', 'shiitake', 'girolle', 'cepe', 'portobello'],
  },
  {
    category: 'Herbes et salades',
    department: 'Fruits et légumes',
    keywords: [
      'salade', 'laitue', 'iceberg', 'batavia', 'romaine', 'roquette', 'mache', 'cresson',
      'epinard', 'blette', 'persil', 'coriandre', 'qazbor', 'maadnous', 'menthe', 'naana',
      'basilic', 'ciboulette', 'aneth', 'thym', 'romarin', 'celeri branche', 'celerie branche',
      'oseille', 'mesclun', 'chicoree', 'endive', 'kale', 'jeune pousse', 'jeunes pousses',
      'bok choy', 'asperge',
    ],
  },
  {
    category: 'Legumes',
    department: 'Fruits et légumes',
    keywords: [
      'tomate', 'pomme de terre', 'patate', 'pdt ', 'oignon', 'ail', 'echalote', 'carotte',
      'courgette', 'aubergine', 'poivron', 'piment', 'concombre', 'haricot', 'petit pois',
      'petits pois', 'feve', 'chou', 'choux', 'brocoli', 'artichaut', 'betterave', 'bettrave',
      'navet', 'radis', 'fenouil', 'poireau', 'potiron', 'citrouille', 'courge', 'mais doux',
      'olive', 'gingembre', 'oingurge', 'curcuma', 'celerie', 'celeri', 'legume', 'légume',
      'btata', 'khizo', 'maticha', 'flfla', 'bissara',
    ],
  },
  {
    category: 'Fruits',
    department: 'Fruits et légumes',
    keywords: [
      'banane', 'pomme', 'poire', 'orange', 'clementine', 'mandarine', 'citron', 'lime',
      'fraise', 'framboise', 'myrtille', 'mure', 'raisin', 'pasteque', 'melon',
      'mangue', 'ananas', 'kiwi', 'kiwano', 'peche', 'peach', 'brugnon', 'nectarine',
      'abricot', 'prune', 'cerise', 'grenade', 'grenadine', 'figue', 'datte', 'avocat',
      'coco', 'kaki', 'pamplemousse', 'litchi', 'papaye', 'fruit', 'physalis', 'goyave',
      'grandilla', 'granadilla', 'carambole', 'carombole', 'chataigne', 'marron', 'coing',
      'pitaya', 'lulo', 'tamarin', 'salak', 'nefle',
    ],
  },
  {
    category: 'Viennoiseries',
    department: 'Boulangerie et pâtisserie',
    keywords: [
      'croissant', 'pain au chocolat', 'chocolatine', 'pain aux raisins', 'chausson',
      'brioche', 'viennois', 'viennoiserie', 'palmier', 'donut', 'beignet', 'muffin',
      'escargot', 'torsade', 'suisse',
    ],
  },
  {
    category: 'Gâteaux traditionnels',
    department: 'Boulangerie et pâtisserie',
    keywords: [
      'corne de gazelle', 'kaab', 'chebakia', 'briouate', 'ghriba', 'feqqas', 'fekkas',
      'sellou', 'makrouth', 'baklava', 'beldi', 'marocain', 'traditionnel', 'amlou',
      'msemen', 'baghrir', 'batbout', 'harcha', 'meloui', 'rghaif', 'sfinj',
    ],
  },
  {
    category: 'Pâtisseries et galettes',
    department: 'Boulangerie et pâtisserie',
    keywords: [
      'patisserie', 'pâtisserie', 'gateau', 'gâteau', 'tarte', 'eclair', 'millefeuille',
      'opera', 'tiramisu', 'cheesecake', 'fraisier', 'galette', 'fondant', 'brownie',
      'macaron', 'buche', 'mousse', 'genoise', 'cupcake', 'flan', 'cake', 'clafoutis',
      'paris-brest', 'religieuse', 'choux a la creme', 'chou a la creme', 'pate a choux',
    ],
  },
  {
    category: 'Pains et baguettes',
    department: 'Boulangerie et pâtisserie',
    keywords: [
      'pain', 'baguette', 'batard', 'miche', 'boule', 'complet', 'cereal', 'seigle',
      'son', 'orge', 'semoule', 'tortilla', 'wrap', 'pita', 'burger', 'hot dog',
      'panini', 'ciabatta', 'focaccia', 'toast', 'khobz', 'fougasse', 'navette',
    ],
  },
];

const GENERIC_CATEGORY_WORDS = new Set([
  '',
  'general',
  'général',
  'generale',
  'générale',
  'autre',
  'autres',
  'divers',
  'none',
  'null',
  'undefined',
  'marjane',
  'produit',
  'produits',
  'non classe',
  'non classé',
  'tous',
]);

/**
 * Infers an accurate real retail Category + Department from product name, DOM breadcrumb/category hint, or raw category.
 * Avoids returning generic 'Général' by classifying across all 12 Marjane categories.
 */
export function inferCategoryAndDepartment(
  productName: string,
  rawCategory?: string,
  rawDepartment?: string
): { category: string; department: Department } {
  const cleanedRawCat = (rawCategory || '').replace(/\s+/g, ' ').trim();
  const normRawCat = normalizeSearchText(cleanedRawCat);
  const normRawDept = normalizeSearchText(rawDepartment || '');
  const haystack = `${normRawCat} ${normalizeSearchText(productName)} ${normRawDept}`;

  // 1. If explicit valid non-generic category was supplied and matches a known canonical category
  if (cleanedRawCat && !GENERIC_CATEGORY_WORDS.has(normRawCat)) {
    for (const rule of CATEGORY_TAXONOMY_RULES) {
      if (
        normalizeSearchText(rule.category) === normRawCat ||
        rule.keywords.some((kw) => normRawCat.includes(normalizeSearchText(kw)))
      ) {
        return {
          category: rule.category,
          department: rawDepartment ? mapDept(rawDepartment) : rule.department,
        };
      }
    }
    // Keep clean supplied category (e.g. "Fruits secs", "Traiteur") with inferred department
    return {
      category: cleanedRawCat,
      department: inferDepartmentFromKeywords(haystack, rawDepartment),
    };
  }

  // 2. Match against rich French/Darija keyword taxonomy on product name & hints
  for (const rule of CATEGORY_TAXONOMY_RULES) {
    for (const kw of rule.keywords) {
      if (haystack.includes(normalizeSearchText(kw))) {
        return {
          category: rule.category,
          department: rawDepartment && normRawDept ? mapDept(rawDepartment) : rule.department,
        };
      }
    }
  }

  // 3. Fallback based on department so it NEVER inserts lazy 'Général'
  const fallbackDept = inferDepartmentFromKeywords(haystack, rawDepartment);
  switch (fallbackDept) {
    case 'Boucherie et volaille':
      return { category: 'Viandes', department: fallbackDept };
    case 'Fromage et charcuterie':
      return { category: 'Fromages', department: fallbackDept };
    case 'Boulangerie et pâtisserie':
      return { category: 'Pains et baguettes', department: fallbackDept };
    default:
      return { category: 'Fruits', department: 'Fruits et légumes' };
  }
}

function inferDepartmentFromKeywords(haystack: string, rawDept?: string): Department {
  if (rawDept && rawDept.trim()) {
    const mapped = mapDept(rawDept);
    if (
      haystack.includes('bouch') ||
      haystack.includes('volail') ||
      haystack.includes('stand') ||
      haystack.includes('fromag') ||
      haystack.includes('charcut') ||
      haystack.includes('boulang') ||
      haystack.includes('patiss') ||
      haystack.includes('marche') ||
      haystack.includes('fruit') ||
      haystack.includes('legume')
    ) {
      return mapped;
    }
  }
  for (const rule of CATEGORY_TAXONOMY_RULES) {
    if (rule.keywords.some((kw) => haystack.includes(normalizeSearchText(kw)))) {
      return rule.department;
    }
  }
  return mapDept(rawDept || '');
}

/**
 * Parses raw CSV content into typed Product objects.
 */
export function parseProductsFromCsv(csvText: string): { products: Product[]; error?: string } {
  try {
    const rows = parseCSVLines(csvText);
    if (rows.length < 2) {
      return { products: [], error: 'Le fichier CSV est vide ou ne contient aucune ligne de données.' };
    }

    const headers = rows[0].map((h) => h.toLowerCase().trim());
    const dataRows = rows.slice(1);

    const codeIdx = headers.findIndex((h) => h === 'code' || h.includes('code art'));
    const nameIdx = headers.findIndex((h) => h === 'produit' || h === 'name' || h.includes('designation') || h.includes('nom'));
    const marjaneIdx = headers.findIndex((h) => h === 'marjane' || h.includes('marjane possible'));
    const p2Idx = headers.findIndex((h) => h === 'marjane 2' || h.includes('p 2') || h.includes('p2'));
    const interneIdx = headers.findIndex((h) => h === 'marjane interne' || h.includes('interne') || h.includes('valide'));
    const miniSecoursIdx = headers.findIndex((h) => h === 'marjane mini' || h.includes('mini secoure') || h.includes('mini secours'));
    const secoursIdx = headers.findIndex((h) => h === 'marjane sec' || (h.includes('secoure') && !h.includes('mini') && !h.includes('2')) || (h.includes('secours') && !h.includes('mini') && !h.includes('2')));
    const p3Idx = headers.findIndex((h) => h === 'marjane sec 2' || h.includes('p 3') || h.includes('p3') || h.includes('secours 2'));
    const imageIdx = headers.findIndex((h) => h === 'image_html' || h.includes('image') || h.includes('photo'));
    const deptIdx = headers.findIndex((h) => h === 'département' || h.includes('departement') || h.includes('rayon'));
    const catIdx = headers.findIndex((h) => h === 'catégorie' || h.includes('categorie'));
    const quantiteIdx = headers.findIndex((h) => h === 'quantite' || h === 'quantité' || h.includes('unite') || h.includes('unité'));

    const parsedProducts: Product[] = [];

    dataRows.forEach((cols, idx) => {
      const name = (nameIdx !== -1 ? cols[nameIdx] : cols[1]) || '';
      if (!name.trim()) return;

      const rawCode = (codeIdx !== -1 ? cols[codeIdx] : cols[0]) || '';
      const finalCode = rawCode.trim() === '' ? '-' : rawCode.trim();
      const rawUnit = quantiteIdx !== -1 ? cols[quantiteIdx] : undefined;
      const rawDept = deptIdx !== -1 ? cols[deptIdx] : cols[9];
      const rawCat = catIdx !== -1 ? cols[catIdx] : cols[10];
      const inferred = inferCategoryAndDepartment(name.trim(), rawCat, rawDept);

      const prod: Product = {
        id: idx + 1,
        code: finalCode,
        name: name.trim(),
        department: rawDept && rawDept.trim() ? mapDept(rawDept) : inferred.department,
        category: inferred.category,
        quantite: extractPureUnit(rawUnit || name),
        barcodeMarjane: cleanBarcode(marjaneIdx !== -1 ? cols[marjaneIdx] : cols[2]),
        barcodeP2: cleanBarcode(p2Idx !== -1 ? cols[p2Idx] : cols[3]),
        barcodeInterne: cleanBarcode(interneIdx !== -1 ? cols[interneIdx] : cols[4]),
        barcodeMiniSecours: cleanBarcode(miniSecoursIdx !== -1 ? cols[miniSecoursIdx] : cols[5]),
        barcodeSecours: cleanBarcode(secoursIdx !== -1 ? cols[secoursIdx] : cols[6]),
        barcodeP3: cleanBarcode(p3Idx !== -1 ? cols[p3Idx] : cols[7]),
        imageUrl: cleanImageUrl(imageIdx !== -1 ? cols[imageIdx] : cols[8]),
        isEnabled: true,
        barcodeMjValide: cleanBarcode(interneIdx !== -1 ? cols[interneIdx] : cols[2]),
      };

      parsedProducts.push(prod);
    });

    return { products: parsedProducts };
  } catch (e) {
    return { products: [], error: `Erreur de traitement du CSV : ${e instanceof Error ? e.message : 'Format invalide'}` };
  }
}

/**
 * Converts products list back into standard CSV with exact requested 12 columns:
 * code,produit,marjane,marjane 2,marjane Interne,marjane mini,marjane sec,marjane sec 2,image_html,département,catégorie,quantite
 */
export function exportProductsToCsv(products: Product[]): string {
  const headers = [
    'code',
    'produit',
    'marjane',
    'marjane 2',
    'marjane Interne',
    'marjane mini',
    'marjane sec',
    'marjane sec 2',
    'image_html',
    'département',
    'catégorie',
    'quantite',
  ];

  const rows = products.map((p) => {
    const pureUnit = p.quantite || extractPureUnit(p.name);
    return [
      sanitizeCsvCell(p.code),
      sanitizeCsvCell(p.name),
      sanitizeCsvCell(p.barcodeMarjane || '0'),
      sanitizeCsvCell(p.barcodeP2 || '0'),
      sanitizeCsvCell(p.barcodeInterne || p.barcodeMjValide || '0'),
      sanitizeCsvCell(p.barcodeMiniSecours || '0'),
      sanitizeCsvCell(p.barcodeSecours || '0'),
      sanitizeCsvCell(p.barcodeP3 || '0'),
      sanitizeCsvCell(p.imageUrl || 'sans'),
      sanitizeCsvCell(p.department),
      sanitizeCsvCell(p.category || 'Fruits'),
      sanitizeCsvCell(pureUnit),
    ].join(',');
  });

  return [headers.join(','), ...rows].join('\n');
}

// =========================================================================
// HTML & SCRIPT SMART EXTRACTOR HELPERS
// =========================================================================

const PLACEHOLDER_IMG_RE =
  /(data:image\/svg|1x1|blank\.gif|spacer\.gif|spinner|loading\.gif|loader|placeholder|no[-_]?image|default[-_]?product|skeleton|favicon|\.svg(\?|$))/i;

const GARBAGE_TEXT_RE =
  /^(ajouter|add to cart|voir|details|détails|promo|nouveau|new|livraison|stock|disponible|rupture|\d+[.,]?\d*\s*(dh|mad|€)|-\d+%)$/i;

/**
 * Resolves Next.js / proxy image wrappers (e.g. /_next/image?url=https%3A%2F%2F...)
 * and strips placeholder/broken image URLs so only working raster images are returned.
 */
function normalizeCandidateImageUrl(rawUrl?: string | null): string | undefined {
  if (!rawUrl) return undefined;
  let candidate = rawUrl.trim().replace(/&amp;/g, '&');
  if (!candidate || PLACEHOLDER_IMG_RE.test(candidate)) return undefined;

  // Pick largest URL if passed a srcset list accidentally
  if (candidate.includes(',') && /\s\d+[wx]/.test(candidate)) {
    candidate = pickBestSrcsetUrl(candidate) || '';
  }
  if (!candidate || PLACEHOLDER_IMG_RE.test(candidate)) return undefined;

  // Unwrap /_next/image?url=... or ?img=... CDN proxy links
  if (candidate.includes('_next/image') || candidate.includes('url=')) {
    try {
      const fakeBase = candidate.startsWith('http') ? undefined : 'https://www.marjane.ma';
      const parsed = new URL(candidate, fakeBase);
      const inner = parsed.searchParams.get('url') || parsed.searchParams.get('img');
      if (inner && inner.startsWith('http')) {
        candidate = decodeURIComponent(inner);
      }
    } catch {}
  }

  // Resolve known relative CDN paths cleanly
  if (candidate.startsWith('//')) {
    candidate = `https:${candidate}`;
  } else if (candidate.startsWith('/image/upload/') || candidate.startsWith('/v1')) {
    candidate = `https://res.cloudinary.com/dcphm6bor${candidate}`;
  }

  if (PLACEHOLDER_IMG_RE.test(candidate)) return undefined;
  return cleanImageUrl(candidate);
}

function pickBestSrcsetUrl(srcset: string): string | undefined {
  const parts = srcset
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
  if (parts.length === 0) return undefined;

  let bestUrl = '';
  let bestScore = -1;
  for (const part of parts) {
    const tokens = part.split(/\s+/);
    const url = tokens[0];
    if (!url || PLACEHOLDER_IMG_RE.test(url)) continue;
    const descriptor = tokens[1] || '';
    const numMatch = descriptor.match(/^(\d+)/);
    const score = numMatch ? Number(numMatch[1]) : 100;
    if (score >= bestScore) {
      bestScore = score;
      bestUrl = url;
    }
  }
  return bestUrl || undefined;
}

function extractBestImageFromDomElement(container: Element | null, imgEl?: Element | null): string | undefined {
  const imgs: Element[] = [];
  if (imgEl) imgs.push(imgEl);
  if (container) {
    container.querySelectorAll('picture source, img').forEach((node) => {
      if (!imgs.includes(node)) imgs.push(node);
    });
  }

  // Lazy-loading / high-res attributes take priority over potentially inline-SVG placeholder `src`
  const attrPriority = [
    'data-srcset',
    'srcset',
    'data-original',
    'data-src',
    'data-lazy-src',
    'data-lazy',
    'data-image',
    'data-zoom-image',
    'data-url',
    'src',
  ];

  for (const node of imgs) {
    for (const attr of attrPriority) {
      const val = node.getAttribute(attr);
      if (!val) continue;
      const candidate = attr.includes('srcset') ? pickBestSrcsetUrl(val) : val;
      const clean = normalizeCandidateImageUrl(candidate);
      if (clean) return clean;
    }
  }

  // Check inline CSS background-image: url(...)
  if (container) {
    const styledEls = [container, ...Array.from(container.querySelectorAll('[style*="background"]'))];
    for (const stEl of styledEls) {
      const styleAttr = stEl.getAttribute('style') || '';
      const bgMatch = styleAttr.match(/background(?:-image)?\s*:[^;]*url\(["']?([^"')]+)["']?\)/i);
      if (bgMatch?.[1]) {
        const clean = normalizeCandidateImageUrl(bgMatch[1]);
        if (clean) return clean;
      }
    }
  }

  return undefined;
}

function cleanExtractedProductName(raw: string): string {
  return (raw || '')
    .replace(/\s+/g, ' ')
    .replace(/\b\d+(?:[.,]\d{1,2})?\s*(?:DH|MAD|€)\b/gi, '')
    .replace(/[-+]\s*\d+\s*%/g, '')
    .replace(/^\s*[-|•:]+\s*|\s*[-|•:]+\s*$/g, '')
    .trim();
}

function extractContextCategoryHint(doc: Document, el: Element): string {
  const localCatEl = el.querySelector(
    '.category, .product-category, .cat, [data-category], [itemprop="category"], .rayon, .badge-category'
  );
  const localCat =
    el.getAttribute('data-category') ||
    el.getAttribute('data-cat') ||
    localCatEl?.getAttribute('data-category') ||
    localCatEl?.textContent?.trim() ||
    '';
  if (localCat && !GENERIC_CATEGORY_WORDS.has(normalizeSearchText(localCat))) {
    return localCat;
  }

  // Page-level breadcrumb or active heading category hint
  const pageCatSelectors = [
    '.breadcrumb li:last-child',
    '.breadcrumb a:last-of-type',
    'nav[aria-label*="breadcrumb" i] li:last-child',
    '[data-page-category]',
    'h1.category-title',
    '.category-header h1',
  ];
  for (const sel of pageCatSelectors) {
    const node = doc.querySelector(sel);
    const txt = node?.getAttribute('data-page-category') || node?.textContent?.trim() || '';
    if (txt && txt.length >= 3 && txt.length <= 50 && !GENERIC_CATEGORY_WORDS.has(normalizeSearchText(txt))) {
      return txt;
    }
  }
  return '';
}

function extractJsonLdProducts(doc: Document): any[] {
  const results: any[] = [];
  doc.querySelectorAll('script[type="application/ld+json"], script#__NEXT_DATA__').forEach((script) => {
    const raw = script.textContent?.trim();
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw);
      const walk = (node: any) => {
        if (!node || typeof node !== 'object') return;
        if (Array.isArray(node)) {
          node.forEach(walk);
          return;
        }
        const typeVal = String(node['@type'] || '').toLowerCase();
        if (
          typeVal === 'product' ||
          node.produit ||
          (node.name && (node.image || node.imageUrl || node.image_url || node.sku || node.gtin13))
        ) {
          results.push(node);
        }
        for (const val of Object.values(node)) {
          if (val && typeof val === 'object') {
            walk(val);
          }
        }
      };
      walk(parsed);
    } catch {}
  });
  return results;
}

/**
 * Smart extractor from raw HTML / scripts / JSON-LD or JSON dumps:
 * Extracts clean product name, working image URL (handling lazy data-src/srcset/_next/image),
 * real Category + Department (never defaulting blindly to 'Général'), code, barcodes, and pure unit.
 */
export function extractProductsFromHtmlOrScript(rawInput: string): Product[] {
  const extracted: Product[] = [];
  if (!rawInput || !rawInput.trim()) return extracted;

  const seenKeys = new Set<string>();
  let idCounter = 0;

  const pushExtractedItem = (params: {
    code?: string;
    name: string;
    imageUrl?: string;
    rawCategory?: string;
    rawDepartment?: string;
    quantiteRaw?: string;
    barcodeMarjane?: string;
    barcodeP2?: string;
    barcodeInterne?: string;
    barcodeMiniSecours?: string;
    barcodeSecours?: string;
    barcodeP3?: string;
  }) => {
    const cleanName = cleanExtractedProductName(params.name);
    if (!cleanName || cleanName.length < 3 || GARBAGE_TEXT_RE.test(cleanName)) return;

    const cleanImg = normalizeCandidateImageUrl(params.imageUrl);
    const inferred = inferCategoryAndDepartment(
      cleanName,
      params.rawCategory,
      params.rawDepartment
    );
    const pureUnit = extractPureUnit(params.quantiteRaw || cleanName);
    const key = `${cleanName.toLowerCase()}__${cleanImg || ''}`;
    if (seenKeys.has(key)) return;
    seenKeys.add(key);

    idCounter += 1;
    extracted.push({
      id: Date.now() + idCounter,
      code: (params.code || '-').trim() || '-',
      name: cleanName,
      department: inferred.department,
      category: inferred.category,
      quantite: pureUnit,
      barcodeMarjane: cleanBarcode(params.barcodeMarjane),
      barcodeP2: cleanBarcode(params.barcodeP2),
      barcodeInterne: cleanBarcode(params.barcodeInterne),
      barcodeMiniSecours: cleanBarcode(params.barcodeMiniSecours),
      barcodeSecours: cleanBarcode(params.barcodeSecours),
      barcodeP3: cleanBarcode(params.barcodeP3),
      imageUrl: cleanImg,
      isEnabled: true,
    });
  };

  // 1. Parse structured DOM first (including JSON-LD / __NEXT_DATA__ scripts inside HTML)
  if (typeof DOMParser !== 'undefined') {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(rawInput, 'text/html');

      // 1A. JSON-LD & embedded script state objects
      const scriptItems = extractJsonLdProducts(doc);
      for (const item of scriptItems) {
        const imgRaw = Array.isArray(item.image)
          ? item.image[0]
          : typeof item.image === 'object' && item.image?.url
            ? item.image.url
            : item.image_html || item.image_url || item.image || item.imageUrl || item.photo;
        pushExtractedItem({
          code: String(item.code || item.sku || item.ref || item.id || '-'),
          name: String(item.produit || item.name || item.title || item.libelle || ''),
          imageUrl: imgRaw,
          rawCategory: item.category || item.categorie || item['catégorie'],
          rawDepartment: item.department || item['département'],
          quantiteRaw: item.quantite,
          barcodeMarjane: item.marjane || item.gtin13 || item.ean || item.barcode,
          barcodeP2: item['marjane 2'] || item.marjane_2,
          barcodeInterne: item['marjane Interne'] || item.marjane_interne,
          barcodeMiniSecours: item['marjane mini'] || item.marjane_mini,
          barcodeSecours: item['marjane sec'] || item.marjane_sec,
          barcodeP3: item['marjane sec 2'] || item.marjane_sec_2,
        });
      }

      // 1B. Product cards / containers
      const cardSelectors =
        '.product, .product-card, .product-item, [data-product], [data-product-id], [itemtype*="Product"], article, .card, div.item, li.item, tr';
      doc.querySelectorAll(cardSelectors).forEach((el) => {
        const titleEl = el.querySelector(
          'h1, h2, h3, h4, h5, .product-title, .product-name, .title, .name, [itemprop="name"], a[title]'
        );
        const imgEl = el.querySelector('img');
        const codeEl = el.querySelector('.code, .sku, [data-sku], [data-code], [itemprop="sku"]');

        const rawTitle =
          titleEl?.textContent?.trim() ||
          titleEl?.getAttribute('title')?.trim() ||
          imgEl?.getAttribute('alt')?.trim() ||
          imgEl?.getAttribute('title')?.trim() ||
          el.getAttribute('data-name') ||
          '';

        const bestImg = extractBestImageFromDomElement(el, imgEl);
        if (!rawTitle || (!bestImg && !titleEl)) return;

        const code =
          codeEl?.textContent?.trim() ||
          codeEl?.getAttribute('data-sku') ||
          codeEl?.getAttribute('data-code') ||
          el.getAttribute('data-sku') ||
          el.getAttribute('data-code') ||
          '-';
        const catHint = extractContextCategoryHint(doc, el);
        const barcodeAttr =
          el.getAttribute('data-barcode') ||
          el.getAttribute('data-ean') ||
          el.querySelector('[itemprop="gtin13"], [itemprop="gtin"]')?.textContent?.trim();

        pushExtractedItem({
          code,
          name: rawTitle,
          imageUrl: bestImg,
          rawCategory: catHint,
          barcodeMarjane: barcodeAttr,
        });
      });

      // 1C. Any remaining standalone <img> tags with descriptive alt/title & working URL
      doc.querySelectorAll('img').forEach((img) => {
        const alt = img.getAttribute('alt')?.trim() || img.getAttribute('title')?.trim() || '';
        if (!alt || alt.length < 3 || GARBAGE_TEXT_RE.test(alt)) return;
        const bestImg = extractBestImageFromDomElement(img.parentElement, img);
        if (!bestImg) return;
        const alreadyHaveName = extracted.some(
          (e) => e.name.toLowerCase() === cleanExtractedProductName(alt).toLowerCase() && e.imageUrl
        );
        if (!alreadyHaveName) {
          pushExtractedItem({
            name: alt,
            imageUrl: bestImg,
            rawCategory: extractContextCategoryHint(doc, img),
          });
        }
      });
    } catch {}
  }

  // 2. Fallback standalone JSON blocks pasted without <script> tags
  const jsonMatches = rawInput.match(/\{[^{}]{10,1500}\}/g);
  if (jsonMatches) {
    for (const block of jsonMatches) {
      try {
        if (block.includes('name') || block.includes('produit') || block.includes('title')) {
          const parsed = JSON.parse(block);
          const name = parsed.produit || parsed.name || parsed.title || parsed.libelle;
          if (name && typeof name === 'string') {
            pushExtractedItem({
              code: String(parsed.code || parsed.sku || parsed.ref || parsed.id || '-'),
              name,
              imageUrl: parsed.image_html || parsed.image_url || parsed.image || parsed.imageUrl || parsed.photo,
              rawCategory: parsed.category || parsed.categorie || parsed['catégorie'],
              rawDepartment: parsed.department || parsed['département'],
              quantiteRaw: parsed.quantite,
              barcodeMarjane: parsed.marjane || parsed.barcode || parsed.ean,
              barcodeP2: parsed['marjane 2'] || parsed.marjane_2,
              barcodeInterne: parsed['marjane Interne'] || parsed.marjane_interne,
              barcodeMiniSecours: parsed['marjane mini'] || parsed.marjane_mini,
              barcodeSecours: parsed['marjane sec'] || parsed.marjane_sec,
              barcodeP3: parsed['marjane sec 2'] || parsed.marjane_sec_2,
            });
          }
        }
      } catch {}
    }
  }

  // 3. Final regex fallback for raw HTML fragments if nothing matched yet
  if (extracted.length === 0) {
    const imgRegex = /<img[^>]+>/gi;
    let tagMatch;
    while ((tagMatch = imgRegex.exec(rawInput)) !== null) {
      const tag = tagMatch[0];
      const altMatch = tag.match(/alt=["']([^"']+)["']/i);
      const lazySrcMatch = tag.match(/(?:data-src|data-original|data-lazy-src|data-srcset)=["']([^"']+)["']/i);
      const srcMatch = tag.match(/\bsrc=["']([^"']+)["']/i);
      const rawName = altMatch?.[1] || '';
      const rawImg = lazySrcMatch?.[1] || srcMatch?.[1] || '';
      if (rawName && rawImg) {
        pushExtractedItem({
          name: rawName,
          imageUrl: rawImg,
        });
      }
    }
  }

  return extracted;
}

export interface MergeResult {
  addedProducts: Product[];
  updatedProducts: Product[];
  skippedCount: number;
}

/**
 * Merges extracted products with the existing catalog:
 * - New products -> ADD
 * - Existing product without image when HTML has working image -> UPDATE image & enrich generic category
 * - Existing product with different working image -> ADD variant
 * - Exact duplicate (same name + same image) -> SKIP
 */
export function mergeExtractedProductsWithExisting(
  extracted: Product[],
  existingProducts: Product[]
): MergeResult {
  const addedProducts: Product[] = [];
  const updatedProductsMap = new Map<number, Product>();
  let skippedCount = 0;

  const existingByName = new Map<string, Product[]>();
  for (const ep of existingProducts) {
    const norm = ep.name.trim().toLowerCase();
    const list = existingByName.get(norm) || [];
    list.push(ep);
    existingByName.set(norm, list);
  }

  for (const item of extracted) {
    const norm = item.name.trim().toLowerCase();
    const existingMatches = existingByName.get(norm);

    if (!existingMatches || existingMatches.length === 0) {
      addedProducts.push(item);
      existingByName.set(norm, [item]);
      continue;
    }

    const exactImageMatch = existingMatches.find(
      (ep) => (ep.imageUrl || '').trim() === (item.imageUrl || '').trim()
    );

    if (exactImageMatch) {
      skippedCount++;
      continue;
    }

    const missingImageMatch = existingMatches.find((ep) => !ep.imageUrl || ep.imageUrl.trim() === '');
    if (missingImageMatch && item.imageUrl && item.imageUrl.trim()) {
      const updated: Product = {
        ...missingImageMatch,
        imageUrl: item.imageUrl,
        category:
          !missingImageMatch.category || GENERIC_CATEGORY_WORDS.has(normalizeSearchText(missingImageMatch.category))
            ? item.category
            : missingImageMatch.category,
      };
      updatedProductsMap.set(missingImageMatch.id, updated);
      missingImageMatch.imageUrl = item.imageUrl;
      continue;
    }

    if (item.imageUrl && item.imageUrl.trim()) {
      addedProducts.push(item);
      existingMatches.push(item);
    } else {
      skippedCount++;
    }
  }

  return {
    addedProducts,
    updatedProducts: Array.from(updatedProductsMap.values()),
    skippedCount,
  };
}

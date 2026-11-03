import { Department, Product } from '../types';
import { cleanImageUrl } from '../services/supabaseService';
import { extractPureUnit } from './productWeight';

/**
 * Robust CSV parser that handles quotes, escaped quotes, and commas/semicolons.
 */
export function parseCSVLines(text: string): string[][] {
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
  if (digitsOnly.length === 8 || digitsOnly.length === 13) {
    return digitsOnly;
  }
  return undefined;
};

const mapDept = (dept: string): Department => {
  const d = (dept || '').toUpperCase().trim();
  if (d.includes('BOUCHERIE')) return 'Boucherie et volaille';
  if (d.includes('STAND') || d.includes('FROMAGE') || d.includes('CHARCUTERIE')) return 'Fromage et charcuterie';
  if (d.includes('MARCHE') || d.includes('FRUIT') || d.includes('LEGUME')) return 'Fruits et légumes';
  if (d.includes('BOULANGERIE') || d.includes('PATISSERIE')) return 'Boulangerie et pâtisserie';
  return 'Fruits et légumes';
};

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

    // Identify column indices based on exact user requested headers and legacy aliases
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

      const prod: Product = {
        id: idx + 1,
        code: finalCode,
        name: name.trim(),
        department: mapDept(deptIdx !== -1 ? cols[deptIdx] : cols[9]),
        category: (catIdx !== -1 ? cols[catIdx] : cols[10])?.trim() || 'Général',
        quantite: extractPureUnit(rawUnit || name),
        barcodeMarjane: cleanBarcode(marjaneIdx !== -1 ? cols[marjaneIdx] : cols[2]),
        barcodeP2: cleanBarcode(p2Idx !== -1 ? cols[p2Idx] : cols[3]),
        barcodeInterne: cleanBarcode(interneIdx !== -1 ? cols[interneIdx] : cols[4]),
        barcodeMiniSecours: cleanBarcode(miniSecoursIdx !== -1 ? cols[miniSecoursIdx] : cols[5]),
        barcodeSecours: cleanBarcode(secoursIdx !== -1 ? cols[secoursIdx] : cols[6]),
        barcodeP3: cleanBarcode(p3Idx !== -1 ? cols[p3Idx] : cols[7]),
        imageUrl: cleanImageUrl(imageIdx !== -1 ? cols[imageIdx] : cols[8]),
        isEnabled: true,
        // Legacy alias
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
      `"${p.code}"`,
      `"${p.name.replace(/"/g, '""')}"`,
      `"${p.barcodeMarjane || '0'}"`,
      `"${p.barcodeP2 || '0'}"`,
      `"${p.barcodeInterne || p.barcodeMjValide || '0'}"`,
      `"${p.barcodeMiniSecours || '0'}"`,
      `"${p.barcodeSecours || '0'}"`,
      `"${p.barcodeP3 || '0'}"`,
      `"${p.imageUrl || 'sans'}"`,
      `"${p.department}"`,
      `"${p.category || 'Général'}"`,
      `"${pureUnit}"`,
    ].join(',');
  });

  return [headers.join(','), ...rows].join('\n');
}

/**
 * Smart extractor from raw HTML / scripts or JSON dumps:
 * Extracts product name, image, category, code, barcodes, and pure unit.
 */
export function extractProductsFromHtmlOrScript(rawInput: string): Product[] {
  const extracted: Product[] = [];
  if (!rawInput || !rawInput.trim()) return extracted;

  const seenNames = new Set<string>();

  // 1. Try to find JSON objects inside script or text
  const jsonMatches = rawInput.match(/\{[\s\S]*?\}(?=\s*[,\]\}]|\s*$)/g);
  if (jsonMatches) {
    for (const block of jsonMatches) {
      try {
        if (block.includes('name') || block.includes('produit') || block.includes('title')) {
          const parsed = JSON.parse(block);
          const name = parsed.produit || parsed.name || parsed.title || parsed.libelle;
          if (name && typeof name === 'string' && name.trim().length > 2) {
            const cleanName = name.trim();
            const code = String(parsed.code || parsed.ref || parsed.id || '-');
            const img = parsed.image_html || parsed.image_url || parsed.image || parsed.imageUrl || parsed.photo;
            const cat = parsed.category || parsed.categorie || parsed['catégorie'] || 'Général';
            const dept = mapDept(parsed.department || parsed['département'] || cat);
            const pureUnit = extractPureUnit(parsed.quantite || name);
            const cleanImg = cleanImageUrl(img);

            const key = `${cleanName.toLowerCase()}__${cleanImg || ''}`;
            if (!seenNames.has(key)) {
              seenNames.add(key);
              extracted.push({
                id: Date.now() + Math.floor(Math.random() * 1000000),
                code: code.trim() || '-',
                name: cleanName,
                department: dept,
                category: String(cat).trim(),
                quantite: pureUnit,
                barcodeMarjane: cleanBarcode(parsed.marjane || parsed.barcode),
                barcodeP2: cleanBarcode(parsed['marjane 2'] || parsed.marjane_2),
                barcodeInterne: cleanBarcode(parsed['marjane Interne'] || parsed.marjane_interne),
                barcodeMiniSecours: cleanBarcode(parsed['marjane mini'] || parsed.marjane_mini),
                barcodeSecours: cleanBarcode(parsed['marjane sec'] || parsed.marjane_sec),
                barcodeP3: cleanBarcode(parsed['marjane sec 2'] || parsed.marjane_sec_2),
                imageUrl: cleanImg,
                isEnabled: true,
              });
            }
          }
        }
      } catch {}
    }
  }

  // 2. Parse HTML with DOMParser
  if (typeof DOMParser !== 'undefined') {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(rawInput, 'text/html');

      // A. Query standard product cards
      const elements = doc.querySelectorAll('.product, .product-card, [data-product], li, tr, .card, article, div.item');
      elements.forEach((el) => {
        const titleEl = el.querySelector('h1, h2, h3, h4, h5, .title, .product-title, .name, [itemprop="name"], .product-name');
        const imgEl = el.querySelector('img');
        const codeEl = el.querySelector('.code, .sku, [data-sku], [data-code], [data-product-id]');

        const name = titleEl?.textContent?.trim() || (imgEl?.getAttribute('alt')?.trim() ?? '');
        if (name && name.length >= 3) {
          const imgSrc =
            imgEl?.getAttribute('src') ||
            imgEl?.getAttribute('data-src') ||
            imgEl?.getAttribute('data-original') ||
            imgEl?.getAttribute('data-lazy-src') ||
            '';
          const code = codeEl?.textContent?.trim() || el.getAttribute('data-sku') || el.getAttribute('data-code') || '-';
          const pureUnit = extractPureUnit(name);
          const cleanImg = cleanImageUrl(imgSrc);

          const key = `${name.toLowerCase()}__${cleanImg || ''}`;
          if (!seenNames.has(key)) {
            seenNames.add(key);
            extracted.push({
              id: Date.now() + Math.floor(Math.random() * 1000000),
              code: code || '-',
              name: name,
              department: mapDept(name),
              category: 'Général',
              quantite: pureUnit,
              imageUrl: cleanImg,
              isEnabled: true,
            });
          }
        }
      });

      // B. Query any <img> tag with a non-empty alt that looks like a product title
      const allImages = doc.querySelectorAll('img[alt]');
      allImages.forEach((img) => {
        const alt = img.getAttribute('alt')?.trim();
        const src =
          img.getAttribute('src') ||
          img.getAttribute('data-src') ||
          img.getAttribute('data-original') ||
          img.getAttribute('data-lazy-src');
        if (alt && alt.length >= 3 && src) {
          const cleanImg = cleanImageUrl(src);
          const key = `${alt.toLowerCase()}__${cleanImg || ''}`;
          if (!seenNames.has(key)) {
            seenNames.add(key);
            extracted.push({
              id: Date.now() + Math.floor(Math.random() * 1000000),
              code: '-',
              name: alt,
              department: mapDept(alt),
              category: 'Général',
              quantite: extractPureUnit(alt),
              imageUrl: cleanImg,
              isEnabled: true,
            });
          }
        }
      });
    } catch {}
  }

  // 3. Fallback Regex for raw HTML strings (e.g. <img ... alt="..." src="...">)
  if (extracted.length === 0) {
    const imgRegex = /<img[^>]+(?:src|data-src)=["']([^"']+)["'][^>]*alt=["']([^"']+)["']/gi;
    let match;
    while ((match = imgRegex.exec(rawInput)) !== null) {
      const src = match[1];
      const alt = match[2];
      if (alt && alt.trim().length >= 3 && src) {
        const cleanImg = cleanImageUrl(src);
        const name = alt.trim();
        const key = `${name.toLowerCase()}__${cleanImg || ''}`;
        if (!seenNames.has(key)) {
          seenNames.add(key);
          extracted.push({
            id: Date.now() + Math.floor(Math.random() * 1000000),
            code: '-',
            name: name,
            department: mapDept(name),
            category: 'Général',
            quantite: extractPureUnit(name),
            imageUrl: cleanImg,
            isEnabled: true,
          });
        }
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
 * Merges extracted products with the existing catalog according to user rules:
 * 1. "O AY PRODUIT DEJA KAYN F DASHBOARD MKHASOCH ITZAD" :
 *    If product exists with same name AND same image -> skip (do not duplicate).
 * 2. "AY PRODUIT BLA IMAGE O LQITIHA F HTML KHASEK TZIDHA" :
 *    If product exists with same name BUT has no image, and HTML has an image -> UPDATE existing product with image.
 * 3. "ILA KAN PRODUIT DEJA KAYN WLAKIN BCHI TSWIRA MKHTALFA HATO HTA HOWA F DASH" :
 *    If product exists with same name BUT HTML has a DIFFERENT image -> ADD as new variant in dashboard.
 * 4. If product does not exist at all -> ADD to dashboard.
 */
export function mergeExtractedProductsWithExisting(
  extracted: Product[],
  existingProducts: Product[]
): MergeResult {
  const addedProducts: Product[] = [];
  const updatedProductsMap = new Map<number, Product>();
  let skippedCount = 0;

  // Build lookup maps of existing products by normalized name
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

    // Case 1: Product does not exist at all in dashboard -> ADD
    if (!existingMatches || existingMatches.length === 0) {
      addedProducts.push(item);
      // Register in local lookup so subsequent extracted items don't duplicate
      existingByName.set(norm, [item]);
      continue;
    }

    // Case 2: Matching product(s) exist
    // Check if any existing product matches exact image
    const exactImageMatch = existingMatches.find(
      (ep) => (ep.imageUrl || '').trim() === (item.imageUrl || '').trim()
    );

    if (exactImageMatch) {
      // Already exists with exact same image -> SKIP
      skippedCount++;
      continue;
    }

    // Check if any existing product has NO image and this item HAS an image -> UPDATE
    const missingImageMatch = existingMatches.find((ep) => !ep.imageUrl || ep.imageUrl.trim() === '');
    if (missingImageMatch && item.imageUrl && item.imageUrl.trim()) {
      const updated = {
        ...missingImageMatch,
        imageUrl: item.imageUrl,
      };
      updatedProductsMap.set(missingImageMatch.id, updated);
      // Update our lookup so we don't treat it as missing again
      missingImageMatch.imageUrl = item.imageUrl;
      continue;
    }

    // Case 3: "ILA KAN PRODUIT DEJA KAYN WLAKIN BCHI TSWIRA MKHTALFA HATO HTA HOWA F DASH"
    // Existing has an image, and item has a DIFFERENT image -> ADD as new item in dashboard
    if (item.imageUrl && item.imageUrl.trim()) {
      addedProducts.push(item);
      existingMatches.push(item);
    } else {
      // Neither has image or already handled
      skippedCount++;
    }
  }

  return {
    addedProducts,
    updatedProducts: Array.from(updatedProductsMap.values()),
    skippedCount,
  };
}


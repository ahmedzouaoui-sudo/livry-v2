import { Department, Product } from '../types';
import { cleanImageUrl } from '../services/supabaseService';

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

    const parsedProducts: Product[] = [];

    dataRows.forEach((cols, idx) => {
      const name = (nameIdx !== -1 ? cols[nameIdx] : cols[1]) || '';
      if (!name.trim()) return;

      const rawCode = (codeIdx !== -1 ? cols[codeIdx] : cols[0]) || '';
      const finalCode = rawCode.trim() === '' ? '-' : rawCode.trim();

      const prod: Product = {
        id: idx + 1,
        code: finalCode,
        name: name.trim(),
        department: mapDept(deptIdx !== -1 ? cols[deptIdx] : cols[9]),
        category: (catIdx !== -1 ? cols[catIdx] : cols[10])?.trim() || 'Général',
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
 * Converts products list back into standard CSV with exact requested columns:
 * code,produit,marjane,marjane 2,marjane Interne,marjane mini,marjane sec,marjane sec 2,image_html,département,catégorie
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
  ];

  const rows = products.map((p) => {
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
    ].join(',');
  });

  return [headers.join(','), ...rows].join('\n');
}

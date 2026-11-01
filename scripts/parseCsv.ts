import fs from 'fs';
import path from 'path';

const csvPath = path.resolve('public/assets/aistudio/produits-livry_CATEGORIES_-_Produits_69c39b71.csv');
const rawContent = fs.readFileSync(csvPath, 'utf-8');

// Parse CSV taking into account quotes
function parseCSV(text: string): string[][] {
  const lines: string[][] = [];
  let row: string[] = [];
  let current = '';
  let inQuotes = false;

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
    } else if (char === ',' && !inQuotes) {
      row.push(current.trim());
      current = '';
    } else if ((char === '\r' || char === '\n') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') {
        i++;
      }
      row.push(current.trim());
      if (row.some(cell => cell.length > 0)) {
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
    if (row.some(cell => cell.length > 0)) {
      lines.push(row);
    }
  }

  return lines;
}

const parsed = parseCSV(rawContent);
const header = parsed[0];
console.log('Headers:', header);

const cleanBarcode = (val: string | undefined): string | undefined => {
  if (!val) return undefined;
  let s = val.trim();
  // Strip .0 if parsed as float e.g. 2600488005000.0
  if (s.endsWith('.0')) s = s.slice(0, -2);
  if (s === '0' || s === '0.0' || s === '-' || s === '' || s.toLowerCase() === 'sans' || s === 'XXXX') {
    return undefined;
  }
  // Remove non-digit characters if any
  const digitsOnly = s.replace(/\D/g, '');
  // GS1 rule: strictly 8 or 13 digits
  if (digitsOnly.length === 8 || digitsOnly.length === 13) {
    return digitsOnly;
  }
  return undefined;
};

const mapDept = (dept: string): 'Boulangerie et pâtisserie' | 'Fruits et légumes' | 'Boucherie et volaille' | 'Fromage et charcuterie' => {
  const d = (dept || '').toUpperCase().trim();
  if (d.includes('BOUCHERIE')) return 'Boucherie et volaille';
  if (d.includes('STAND')) return 'Fromage et charcuterie';
  if (d.includes('MARCHE')) return 'Fruits et légumes';
  if (d.includes('BOULANGERIE')) return 'Boulangerie et pâtisserie';
  return 'Fruits et légumes';
};

const cleanImage = (url: string | undefined): string | undefined => {
  if (!url) return undefined;
  const s = url.trim();
  if (s === 'sans' || s === '-' || s === '' || s === '0') return undefined;
  if (s.startsWith('http')) return s;
  return undefined;
};

const products = parsed.slice(1).map((cols, idx) => {
  const [
    code,
    produit,
    barcodeMjValide,
    barcodeMarjane,
    barcodeSecours,
    barcodeMiniSecours,
    barcodeP2,
    barcodeP3,
    imageUrl,
    departement,
    categorie
  ] = cols;

  const rawCode = (code || '').trim();
  const finalCode = rawCode === '' ? '-' : rawCode;

  return {
    id: idx + 1,
    code: finalCode,
    name: (produit || '').trim(),
    department: mapDept(departement),
    category: (categorie || '').trim() || 'Général',
    barcodeMjValide: cleanBarcode(barcodeMjValide),
    barcodeMarjane: cleanBarcode(barcodeMarjane),
    barcodeSecours: cleanBarcode(barcodeSecours),
    barcodeMiniSecours: cleanBarcode(barcodeMiniSecours),
    barcodeP2: cleanBarcode(barcodeP2),
    barcodeP3: cleanBarcode(barcodeP3),
    imageUrl: cleanImage(imageUrl),
    isEnabled: true,
  };
});

console.log('Total parsed products:', products.length);
const withCodes = products.filter(p => p.barcodeMjValide || p.barcodeMarjane || p.barcodeSecours || p.barcodeMiniSecours || p.barcodeP2 || p.barcodeP3);
console.log('Products with at least one valid barcode:', withCodes.length);

const outContent = `import { Product } from '../types';

export const INITIAL_PRODUCTS: Product[] = ${JSON.stringify(products, null, 2)};
`;

fs.mkdirSync(path.resolve('src/data'), { recursive: true });
fs.writeFileSync(path.resolve('src/data/initialProducts.ts'), outContent, 'utf-8');
console.log('Written to src/data/initialProducts.ts successfully!');

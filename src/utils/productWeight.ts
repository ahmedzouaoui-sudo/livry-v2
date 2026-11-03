import { generateVariableWeightBarcode } from './barcode';

export interface ProductUnitInfo {
  type: 'weight' | 'piece';
  baseValue: number; // e.g., 100 for 100g, 500 for 500g, 1000 for 1Kg
  unit: 'g' | 'kg' | 'pièce';
  label: string; // e.g. "100g", "500g", "1Kg", "1 pièce"
}

/**
 * Extracts the base unit and weight/count from the product name.
 * Priority:
 * 1. Specific grams: 100g, 200g, 250g, 300g, 500g, etc.
 * 2. Specific kilograms: 1Kg, 1,25Kg, 1,5Kg, 2Kg, 3,5Kg, 8Kg, etc.
 * 3. Specific pieces: x2, x3, 2 unités, 3 unités, 6 unités
 * 4. General weight: "au kg", "le kg", "1kg" -> 1000g
 * 5. Piece: "à la pièce", "la pièce" -> 1 pièce
 */
export function extractProductUnitInfo(productName: string): ProductUnitInfo {
  const name = productName.toLowerCase();

  // Check for grams: e.g. "100g", "250g", "500g", "25g", "110g"
  const gramMatch = name.match(/(\d+)\s*g\b/);
  if (gramMatch) {
    const val = parseInt(gramMatch[1], 10);
    return {
      type: 'weight',
      baseValue: val,
      unit: 'g',
      label: `${val}g`,
    };
  }

  // Check for kilograms: e.g. "1,25kg", "1.5kg", "1kg", "2kg", "3,5kg", "8kg"
  const kgMatch = name.match(/(\d+(?:[.,]\d+)?)\s*k?g\b/);
  if (kgMatch && name.includes('kg')) {
    const rawVal = parseFloat(kgMatch[1].replace(',', '.'));
    const grams = Math.round(rawVal * 1000);
    return {
      type: 'weight',
      baseValue: grams,
      unit: grams >= 1000 ? 'kg' : 'g',
      label: rawVal === 1 ? '1 Kg' : `${rawVal} Kg`,
    };
  }

  // Check for "au kg" or "le kg" or "/ kg"
  if (name.includes('au kg') || name.includes('le kg') || name.includes('/ kg') || name.includes('/kg')) {
    return {
      type: 'weight',
      baseValue: 1000,
      unit: 'kg',
      label: '1 Kg',
    };
  }

  // Check for unit counts: e.g. "x2", "x3", "x6", "2 unités", "3 unités", "6 unités"
  const multiPieceMatch = name.match(/x\s*(\d+)|(\d+)\s*unités/);
  if (multiPieceMatch) {
    const count = parseInt(multiPieceMatch[1] || multiPieceMatch[2], 10);
    return {
      type: 'piece',
      baseValue: count,
      unit: 'pièce',
      label: `${count} pièces`,
    };
  }

  // Default to 1 piece
  return {
    type: 'piece',
    baseValue: 1,
    unit: 'pièce',
    label: '1 pièce',
  };
}

/**
 * Strictly returns ONLY pure unit without numbers: 'kg' | 'g' | 'pièce'.
 * Automatically extracted from product title or raw unit input.
 */
export function extractPureUnit(nameOrUnitRaw: string | undefined): 'kg' | 'g' | 'pièce' {
  if (!nameOrUnitRaw) return 'pièce';
  const clean = String(nameOrUnitRaw).toLowerCase().trim();

  // Pure unit match without numbers
  if (clean === 'kg' || clean === 'kilo' || clean === 'kilogramme') return 'kg';
  if (clean === 'g' || clean === 'gramme' || clean === 'gr') return 'g';
  if (clean === 'pièce' || clean === 'piece' || clean === 'pc' || clean === 'unite' || clean === 'unité') return 'pièce';

  // Detect kg in title (e.g., "Banane 1kg", "Pommes au kg")
  if (/\b\d*(?:[.,]\d+)?\s*kg\b/i.test(clean) || clean.includes('kg') || clean.includes('/kg') || clean.includes('au kg')) {
    return 'kg';
  }

  // Detect grams in title (e.g., "Fromage 200g", "Pâte 500g")
  if (/\b\d+\s*g\b/i.test(clean) || /\b\d+\s*gr\b/i.test(clean)) {
    return 'g';
  }

  return 'pièce';
}

/**
 * Calculates adjusted weight/count based on multiplier:
 * Example: baseValue = 100g, multiplier = 5 -> totalValue = 500g
 * Result text: "100g × 5 = 500g"
 */
export function calculateTargetQuantity(
  unitInfo: ProductUnitInfo,
  multiplier: number
): {
  multiplier: number;
  totalGramsOrUnits: number;
  displayCalculation: string;
  totalDisplay: string;
} {
  const m = Math.max(1, Math.round(multiplier));
  const total = unitInfo.baseValue * m;

  if (unitInfo.type === 'weight') {
    const totalDisplay =
      total >= 1000 ? `${(total / 1000).toLocaleString('fr-FR', { maximumFractionDigits: 2 })} Kg` : `${total}g`;
    const baseDisplay = unitInfo.label;
    const displayCalculation = `${baseDisplay} × ${m} = ${totalDisplay}`;

    return {
      multiplier: m,
      totalGramsOrUnits: total,
      displayCalculation,
      totalDisplay,
    };
  } else {
    const totalDisplay = `${total} ${total > 1 ? 'pièces' : 'pièce'}`;
    const displayCalculation = `${unitInfo.label} × ${m} = ${totalDisplay}`;

    return {
      multiplier: m,
      totalGramsOrUnits: total,
      displayCalculation,
      totalDisplay,
    };
  }
}

/**
 * Recalculates barcode for variable weight product based on multiplier.
 * If base is 100g and multiplier is 5: generates barcode for 500g!
 */
export function recalculateBarcodeWithMultiplier(
  baseBarcode: string,
  unitInfo: ProductUnitInfo,
  multiplier: number
): string {
  const digits = baseBarcode.replace(/\D/g, '');
  if (digits.length !== 13) return baseBarcode;

  // Codes contenant '2000014' sont des codes fixes (le poids ne s'applique pas)
  if (digits.includes('2000014')) {
    return baseBarcode;
  }

  const target = unitInfo.baseValue * Math.max(1, multiplier);
  return generateVariableWeightBarcode(baseBarcode, target);
}

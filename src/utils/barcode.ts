/**
 * GS1 Barcode Generator for EAN-13 and EAN-8
 * High-precision module encoding adhering strictly to GS1 General Specifications.
 */

const TABLE_L: Record<string, string> = {
  '0': '0001101',
  '1': '0011001',
  '2': '0010011',
  '3': '0111101',
  '4': '0100011',
  '5': '0110001',
  '6': '0101111',
  '7': '0111011',
  '8': '0110111',
  '9': '0001011',
};

const TABLE_R: Record<string, string> = {
  '0': '1110010',
  '1': '1100110',
  '2': '1101100',
  '3': '1000010',
  '4': '1011100',
  '5': '1001110',
  '6': '1010000',
  '7': '1000100',
  '8': '1001000',
  '9': '1110100',
};

const TABLE_G: Record<string, string> = {
  '0': '0100111',
  '1': '0110011',
  '2': '0011011',
  '3': '0100001',
  '4': '0011101',
  '5': '0111001',
  '6': '0000101',
  '7': '0010001',
  '8': '0001001',
  '9': '0010111',
};

// Parity structures for first digit in EAN-13
const PARITY_PATTERNS: Record<string, string[]> = {
  '0': ['L', 'L', 'L', 'L', 'L', 'L'],
  '1': ['L', 'L', 'G', 'L', 'G', 'G'],
  '2': ['L', 'L', 'G', 'G', 'L', 'G'],
  '3': ['L', 'L', 'G', 'G', 'G', 'L'],
  '4': ['L', 'G', 'L', 'L', 'G', 'G'],
  '5': ['L', 'G', 'G', 'L', 'L', 'G'],
  '6': ['L', 'G', 'G', 'G', 'L', 'L'],
  '7': ['L', 'G', 'L', 'G', 'L', 'G'],
  '8': ['L', 'G', 'L', 'G', 'G', 'L'],
  '9': ['L', 'G', 'G', 'L', 'G', 'L'],
};

/**
 * Calculates GS1 EAN-13 check digit for 12 digits.
 */
export function calculateEan13CheckDigit(first12: string): number {
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    const digit = parseInt(first12[i], 10) || 0;
    sum += i % 2 === 0 ? digit * 1 : digit * 3;
  }
  return (10 - (sum % 10)) % 10;
}

/**
 * Calculates GS1 EAN-8 check digit for 7 digits.
 */
export function calculateEan8CheckDigit(first7: string): number {
  let sum = 0;
  for (let i = 0; i < 7; i++) {
    const digit = parseInt(first7[i], 10) || 0;
    sum += i % 2 === 0 ? digit * 3 : digit * 1;
  }
  return (10 - (sum % 10)) % 10;
}

/**
 * Ensures code has valid length and check digit.
 */
export function normalizeBarcode(rawCode: string): { code: string; format: 'EAN-13' | 'EAN-8'; isValid: boolean } {
  const digits = rawCode.replace(/\D/g, '');
  if (digits.length === 12) {
    const check = calculateEan13CheckDigit(digits);
    return { code: digits + check, format: 'EAN-13', isValid: true };
  }
  if (digits.length === 13) {
    const expected = calculateEan13CheckDigit(digits.slice(0, 12));
    const actual = parseInt(digits[12], 10);
    // If check digit doesn't match, we keep standard GS1 corrected
    const validCode = digits.slice(0, 12) + expected;
    return { code: validCode, format: 'EAN-13', isValid: true };
  }
  if (digits.length === 7) {
    const check = calculateEan8CheckDigit(digits);
    return { code: digits + check, format: 'EAN-8', isValid: true };
  }
  if (digits.length === 8) {
    const expected = calculateEan8CheckDigit(digits.slice(0, 7));
    const validCode = digits.slice(0, 7) + expected;
    return { code: validCode, format: 'EAN-8', isValid: true };
  }
  return { code: digits, format: digits.length <= 8 ? 'EAN-8' : 'EAN-13', isValid: false };
}

export interface BarcodeModule {
  bit: '0' | '1';
  isGuard: boolean;
}

/**
 * Encodes an EAN-13 into 95 binary modules with guard flags.
 */
export function encodeEan13(code13: string): { modules: BarcodeModule[]; leftText: string; rightText: string; firstDigit: string } {
  const normalized = normalizeBarcode(code13).code.padStart(13, '0').slice(-13);
  const firstDigit = normalized[0];
  const leftDigits = normalized.slice(1, 7);
  const rightDigits = normalized.slice(7, 13);
  const pattern = PARITY_PATTERNS[firstDigit] || PARITY_PATTERNS['0'];

  const modules: BarcodeModule[] = [];

  // Start Guard: 101
  modules.push({ bit: '1', isGuard: true }, { bit: '0', isGuard: true }, { bit: '1', isGuard: true });

  // Left 6 digits
  for (let i = 0; i < 6; i++) {
    const digit = leftDigits[i];
    const parity = pattern[i];
    const bits = parity === 'L' ? TABLE_L[digit] : TABLE_G[digit];
    for (const b of bits) {
      modules.push({ bit: b as '0' | '1', isGuard: false });
    }
  }

  // Center Guard: 01010
  modules.push(
    { bit: '0', isGuard: true },
    { bit: '1', isGuard: true },
    { bit: '0', isGuard: true },
    { bit: '1', isGuard: true },
    { bit: '0', isGuard: true }
  );

  // Right 6 digits
  for (let i = 0; i < 6; i++) {
    const digit = rightDigits[i];
    const bits = TABLE_R[digit];
    for (const b of bits) {
      modules.push({ bit: b as '0' | '1', isGuard: false });
    }
  }

  // Stop Guard: 101
  modules.push({ bit: '1', isGuard: true }, { bit: '0', isGuard: true }, { bit: '1', isGuard: true });

  return {
    modules,
    leftText: leftDigits,
    rightText: rightDigits,
    firstDigit,
  };
}

/**
 * Encodes an EAN-8 into 67 binary modules with guard flags.
 */
export function encodeEan8(code8: string): { modules: BarcodeModule[]; leftText: string; rightText: string } {
  const normalized = normalizeBarcode(code8).code.padStart(8, '0').slice(-8);
  const leftDigits = normalized.slice(0, 4);
  const rightDigits = normalized.slice(4, 8);

  const modules: BarcodeModule[] = [];

  // Start Guard: 101
  modules.push({ bit: '1', isGuard: true }, { bit: '0', isGuard: true }, { bit: '1', isGuard: true });

  // Left 4 digits (Table L)
  for (let i = 0; i < 4; i++) {
    const digit = leftDigits[i];
    const bits = TABLE_L[digit];
    for (const b of bits) {
      modules.push({ bit: b as '0' | '1', isGuard: false });
    }
  }

  // Center Guard: 01010
  modules.push(
    { bit: '0', isGuard: true },
    { bit: '1', isGuard: true },
    { bit: '0', isGuard: true },
    { bit: '1', isGuard: true },
    { bit: '0', isGuard: true }
  );

  // Right 4 digits (Table R)
  for (let i = 0; i < 4; i++) {
    const digit = rightDigits[i];
    const bits = TABLE_R[digit];
    for (const b of bits) {
      modules.push({ bit: b as '0' | '1', isGuard: false });
    }
  }

  // Stop Guard: 101
  modules.push({ bit: '1', isGuard: true }, { bit: '0', isGuard: true }, { bit: '1', isGuard: true });

  return {
    modules,
    leftText: leftDigits,
    rightText: rightDigits,
  };
}

/**
 * Formats a barcode string nicely for human readability:
 * EAN-13: "2 654740 001000"
 * EAN-8: "3013 6724"
 */
export function formatBarcodeDigits(code: string): string {
  const digits = code.replace(/\D/g, '');
  if (digits.length === 13) {
    return `${digits[0]} ${digits.slice(1, 7)} ${digits.slice(7, 13)}`;
  }
  if (digits.length === 8) {
    return `${digits.slice(0, 4)} ${digits.slice(4, 8)}`;
  }
  return code;
}

/**
 * Generates an adjusted EAN-13 for variable weight or multiplier.
 * Marjane scale format: Prefix (2 chars e.g. 26/20) + Product scale code (5 chars) + Weight in grams (5 chars) + Check digit
 */
export function generateVariableWeightBarcode(baseBarcode: string, targetGrams: number): string {
  const digits = baseBarcode.replace(/\D/g, '');
  if (digits.length !== 13) return baseBarcode;

  // Check if it's a weighable prefix (20 to 29)
  const prefix = digits.slice(0, 2);
  if (['20', '21', '22', '23', '24', '25', '26', '27', '28', '29'].includes(prefix)) {
    const itemCode = digits.slice(2, 7);
    const weightStr = Math.min(Math.max(1, Math.round(targetGrams)), 99999).toString().padStart(5, '0');
    const first12 = prefix + itemCode + weightStr;
    const checkDigit = calculateEan13CheckDigit(first12);
    return first12 + checkDigit;
  }
  return baseBarcode;
}

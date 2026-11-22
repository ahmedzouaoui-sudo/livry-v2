/**
 * Security & sanitization utilities for Livry Code Finder.
 * Protects against unsafe URL schemes, spreadsheet formula injection,
 * and unvalidated storage overrides.
 */

const SAFE_RASTER_DATA_URI_RE =
  /^data:image\/(png|jpeg|jpg|webp|gif);base64,[A-Za-z0-9+/=]+$/i;

/**
 * Validates and cleans image URLs to permit only:
 * - http:// / https:// URLs
 * - local /assets/... relative paths (no '..' traversal)
 * - safe raster base64 data URIs (blocks svg+xml / html / javascript:)
 */
export function sanitizeImageUrl(urlRaw: unknown): string | undefined {
  if (!urlRaw) return undefined;
  let s = String(urlRaw).trim();
  if (
    !s ||
    s === '0' ||
    s === '0.0' ||
    s === '-' ||
    s.toLowerCase() === 'sans' ||
    s.toLowerCase() === 'null' ||
    s.toLowerCase() === 'undefined'
  ) {
    return undefined;
  }

  // Extract from HTML <img src="..."> if pasted
  const match = s.match(/src=["']([^"']+)["']/i);
  if (match && match[1]) {
    s = match[1].trim();
  }

  s = s.replace(/^["'`]+|["'`]+$/g, '').trim();
  if (!s) return undefined;

  // Strip control characters and whitespace tricks before checking protocol
  const protocolCheck = s.replace(/[\u0000-\u001F\u007F\s]/g, '').toLowerCase();
  if (
    protocolCheck.startsWith('javascript:') ||
    protocolCheck.startsWith('vbscript:') ||
    protocolCheck.startsWith('file:')
  ) {
    return undefined;
  }

  if (s.startsWith('//')) {
    s = 'https:' + s;
  }

  if (s.startsWith('/assets/') && !s.includes('..')) {
    return s;
  }

  if (SAFE_RASTER_DATA_URI_RE.test(s)) {
    return s;
  }

  try {
    const parsed = new URL(s);
    if (parsed.protocol === 'https:' || parsed.protocol === 'http:') {
      return parsed.href;
    }
  } catch {
    return undefined;
  }

  return undefined;
}

/**
 * Validates custom Supabase endpoint URLs (HTTPS only, valid host, no path injection).
 */
export function sanitizeSupabaseEndpointUrl(rawUrl: string): string | null {
  try {
    const cleaned = rawUrl
      .trim()
      .replace(/\/rest\/v1\/?$/, '')
      .replace(/\/+$/, '');
    const parsed = new URL(cleaned);
    if (parsed.protocol !== 'https:') return null;
    if (!parsed.hostname || parsed.hostname.length < 4) return null;
    return `${parsed.protocol}//${parsed.host}`;
  } catch {
    return null;
  }
}

/**
 * Neutralizes CSV/Spreadsheet Formula Injection (CWE-1236 pattern) while preserving
 * standalone '-' missing-code placeholders and clean numeric values.
 */
export function sanitizeCsvCell(value: unknown): string {
  const raw = value === null || value === undefined ? '' : String(value);
  const trimmed = raw.trim();

  // Preserve harmless standalone '-' placeholder used for missing codes
  if (trimmed === '-') {
    return '"-"';
  }

  // Check if starts with dangerous formula trigger characters (=, +, @, -, tab, CR)
  const firstChar = raw.charAt(0);
  const isFormulaTrigger =
    firstChar === '=' ||
    firstChar === '+' ||
    firstChar === '@' ||
    firstChar === '\t' ||
    firstChar === '\r' ||
    (firstChar === '-' && !/^-\d+(\.\d+)?$/.test(trimmed));

  const neutralized = isFormulaTrigger ? `'${raw}` : raw;
  return `"${neutralized.replace(/"/g, '""')}"`;
}

/**
 * Constant-time string comparison to reduce timing leaks when comparing hashes/tokens.
 */
export function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

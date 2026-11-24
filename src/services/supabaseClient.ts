import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { sanitizeSupabaseEndpointUrl } from '../utils/securityUtils';

const DEFAULT_SUPABASE_URL = 'https://pssizsvkbgabnarlyawj.supabase.co';
const DEFAULT_SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_Edhz1UUdYBSAmU65NCv08w_Z5u-D2mp';

const STORAGE_OVERRIDE_KEY_NAMES = [
  'VITE_SUPABASE_ANON_KEY',
  'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
  'SUPABASE_PUBLISHABLE_KEY',
] as const;

/**
 * Ensures a Supabase key used in the browser is a public/publishable/anon key.
 * Strictly rejects `sb_secret_*` and JWT `service_role` keys so browsers never
 * send privileged keys (which Supabase blocks with "Forbidden use of secret API key in browser").
 */
export function isBrowserSafeSupabaseKey(rawKey?: string | null): boolean {
  const key = (rawKey || '').trim();
  if (!key || key.length < 20) return false;
  if (/^sb_secret_/i.test(key) || key.toLowerCase().includes('service_role')) {
    return false;
  }
  if (key.startsWith('eyJ') && key.split('.').length === 3) {
    try {
      const b64 = key.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
      const padded = b64 + '='.repeat((4 - (b64.length % 4)) % 4);
      const payload = JSON.parse(atob(padded));
      if (payload?.role === 'service_role') return false;
    } catch {
      return false;
    }
  }
  return true;
}

const getStoredValue = (name: string): string => {
  try {
    if (typeof localStorage !== 'undefined') {
      const stored = localStorage.getItem(name);
      if (stored && stored.trim()) return stored.trim();
    }
  } catch {}
  return '';
};

const getSafeStoredKey = (): string => {
  for (const storageKey of STORAGE_OVERRIDE_KEY_NAMES) {
    const val = getStoredValue(storageKey);
    if (!val) continue;
    if (isBrowserSafeSupabaseKey(val)) {
      return val;
    }
    try {
      localStorage.removeItem(storageKey);
    } catch {}
  }
  return '';
};

const getStaticEnvUrl = (): string => {
  try {
    return (import.meta.env?.VITE_SUPABASE_URL || '').trim();
  } catch {
    return '';
  }
};

const getSafeStaticEnvKey = (): string => {
  try {
    const envKey = (import.meta.env?.VITE_SUPABASE_ANON_KEY || '').trim();
    return isBrowserSafeSupabaseKey(envKey) ? envKey : '';
  } catch {
    return '';
  }
};

// Clean and normalize Supabase project URL
const rawUrl =
  getStoredValue('VITE_SUPABASE_URL') ||
  getStoredValue('NEXT_PUBLIC_SUPABASE_URL') ||
  getStoredValue('SUPABASE_URL') ||
  getStaticEnvUrl() ||
  DEFAULT_SUPABASE_URL;

const cleanUrl = sanitizeSupabaseEndpointUrl(rawUrl) || DEFAULT_SUPABASE_URL;

const anonKey =
  getSafeStoredKey() ||
  getSafeStaticEnvKey() ||
  DEFAULT_SUPABASE_PUBLISHABLE_KEY;

export let SUPABASE_URL = cleanUrl;
export let SUPABASE_ANON_KEY = anonKey.trim();

export const setCustomSupabaseCredentials = (url: string, key: string): boolean => {
  if (typeof localStorage === 'undefined') return false;
  const trimmedKey = key.trim();
  if (trimmedKey && !isBrowserSafeSupabaseKey(trimmedKey)) {
    return false;
  }
  const validUrl = url ? sanitizeSupabaseEndpointUrl(url) : null;
  if (validUrl) localStorage.setItem('VITE_SUPABASE_URL', validUrl);
  if (trimmedKey) {
    localStorage.setItem('VITE_SUPABASE_ANON_KEY', trimmedKey);
  }
  return true;
};

export const resetSupabaseCredentialsToDefault = () => {
  if (typeof localStorage !== 'undefined') {
    localStorage.removeItem('VITE_SUPABASE_URL');
    localStorage.removeItem('VITE_SUPABASE_ANON_KEY');
    localStorage.removeItem('NEXT_PUBLIC_SUPABASE_URL');
    localStorage.removeItem('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY');
    localStorage.removeItem('SUPABASE_URL');
    localStorage.removeItem('SUPABASE_PUBLISHABLE_KEY');
  }
};

export const getSupabaseProjectId = (): string => {
  try {
    const parsed = new URL(SUPABASE_URL);
    return parsed.hostname.split('.')[0] || 'pssizsvkbgabnarlyawj';
  } catch {
    return 'pssizsvkbgabnarlyawj';
  }
};

// Client for 'api' schema (current exposed schema on project)
export const supabaseApi: SupabaseClient<any, any, any> = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  db: { schema: 'api' },
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});

// Client for 'public' schema (standard PostgreSQL schema)
export const supabasePublic: SupabaseClient<any, any, any> = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  db: { schema: 'public' },
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});

// Default active client - starts with supabasePublic (where products reside)
export let supabase: SupabaseClient<any, any, any> = supabasePublic;
export let activeSchema: 'api' | 'public' = 'public';

export function setActiveSchema(schema: 'api' | 'public') {
  activeSchema = schema;
  supabase = schema === 'public' ? supabasePublic : supabaseApi;
}



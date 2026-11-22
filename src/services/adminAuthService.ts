import { supabaseApi, supabasePublic, activeSchema } from './supabaseClient';
import { getOrCreateDeviceId } from './deviceTrackerService';
import { constantTimeEqual } from '../utils/securityUtils';
import { logAppEvent } from './activityLogService';

const STORAGE_KEY_AUTH_CONFIG = 'finder_livry_admin_auth_v2';
const STORAGE_KEY_ADMIN_SESSION = 'finder_livry_admin_session_v2';
const STORAGE_KEY_LEGACY_ROLE = 'finder_livry_role_v1';
const STORAGE_KEY_AUTH_ATTEMPTS = 'finder_livry_auth_attempts_v2';

export const ADMIN_AUTH_CLOUD_ID = 'app_admin_auth_config_v2';
export const ADMIN_AUTH_CLOUD_CATEGORY = 'app_security_config';

const PBKDF2_ITERATIONS = 120_000;
const SESSION_DURATION_MS = 12 * 60 * 60 * 1000; // 12 hours
const MAX_FREE_ATTEMPTS = 5;

export interface AdminAuthConfig {
  version: number;
  saltHex: string;
  hashHex: string;
  iterations: number;
  updatedAt: string;
  updatedByDeviceId: string;
}

export interface AdminSessionRecord {
  role: 'Admin';
  version: number;
  issuedAt: number;
  expiresAt: number;
  tokenHex: string;
}

interface AuthAttemptState {
  failedCount: number;
  lockedUntil: number;
  lastFailedAt: number;
}

function getClient() {
  return activeSchema === 'api' ? supabaseApi : supabasePublic;
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function hexToBytes(hex: string): Uint8Array {
  const clean = hex.replace(/[^0-9a-f]/gi, '');
  const out = new Uint8Array(Math.floor(clean.length / 2));
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

function generateSaltHex(byteLength = 16): string {
  const buf = new Uint8Array(byteLength);
  crypto.getRandomValues(buf);
  return bytesToHex(buf);
}

async function derivePbkdf2HashHex(
  passcode: string,
  saltHex: string,
  iterations = PBKDF2_ITERATIONS
): Promise<string> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(passcode),
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  );

  const saltBytes = hexToBytes(saltHex);
  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: saltBytes.buffer as ArrayBuffer,
      iterations,
      hash: 'SHA-256',
    },
    keyMaterial,
    256
  );

  return bytesToHex(new Uint8Array(derivedBits));
}

async function computeSessionSignature(
  issuedAt: number,
  expiresAt: number,
  version: number,
  hashHex: string
): Promise<string> {
  const enc = new TextEncoder();
  const payload = `admin|v${version}|${issuedAt}|${expiresAt}|${hashHex.slice(0, 24)}`;
  const digest = await crypto.subtle.digest('SHA-256', enc.encode(payload));
  return bytesToHex(new Uint8Array(digest));
}

/**
 * Returns local config, optionally falling back to VITE_ADMIN_PASSCODE_HASH env var
 * (format: "saltHex:hashHex"). Zero hardcoded password literals exist in client source.
 */
export function getLocalAuthConfig(): AdminAuthConfig | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_AUTH_CONFIG);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed?.saltHex && parsed?.hashHex) {
        return parsed as AdminAuthConfig;
      }
    }
  } catch {}

  try {
    const envHash = import.meta?.env?.VITE_ADMIN_PASSCODE_HASH as string | undefined;
    if (envHash && envHash.includes(':')) {
      const [saltHex, hashHex] = envHash.split(':');
      if (saltHex && hashHex) {
        return {
          version: 1,
          saltHex: saltHex.trim(),
          hashHex: hashHex.trim(),
          iterations: PBKDF2_ITERATIONS,
          updatedAt: new Date(0).toISOString(),
          updatedByDeviceId: 'env',
        };
      }
    }
  } catch {}

  return null;
}

function saveLocalAuthConfig(cfg: AdminAuthConfig): void {
  try {
    localStorage.setItem(STORAGE_KEY_AUTH_CONFIG, JSON.stringify(cfg));
  } catch {}
}

/**
 * Syncs Admin passcode hash config from Supabase so changing the Data password
 * takes effect across devices without hardcoding secrets in client code.
 */
export async function syncAdminAuthConfigFromCloud(): Promise<AdminAuthConfig | null> {
  const local = getLocalAuthConfig();
  if (typeof navigator !== 'undefined' && !navigator.onLine) return local;

  try {
    const client = getClient();
    const { data, error } = await client
      .from('tips')
      .select('content')
      .eq('id', ADMIN_AUTH_CLOUD_ID)
      .maybeSingle();

    if (!error && data?.content) {
      const remote = JSON.parse(data.content) as AdminAuthConfig;
      if (remote?.saltHex && remote?.hashHex) {
        if (!local || (remote.version || 0) >= (local.version || 0)) {
          saveLocalAuthConfig(remote);
          return remote;
        }
      }
    }
  } catch {}

  return local;
}

async function pushAuthConfigToCloud(cfg: AdminAuthConfig): Promise<void> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) return;
  try {
    const client = getClient();
    await client.from('tips').upsert(
      {
        id: ADMIN_AUTH_CLOUD_ID,
        title: 'Configuration Sécurité Admin',
        content: JSON.stringify(cfg),
        category: ADMIN_AUTH_CLOUD_CATEGORY,
        author_role: 'Admin',
        author_name: cfg.updatedByDeviceId,
        created_at: cfg.updatedAt,
        likes: 0,
        image_url: '',
        target_audience: 'Admin',
      },
      { onConflict: 'id' }
    );
  } catch {}
}

export function getAttemptState(): AuthAttemptState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_AUTH_ATTEMPTS);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        failedCount: Number(parsed.failedCount || 0),
        lockedUntil: Number(parsed.lockedUntil || 0),
        lastFailedAt: Number(parsed.lastFailedAt || 0),
      };
    }
  } catch {}
  return { failedCount: 0, lockedUntil: 0, lastFailedAt: 0 };
}

function saveAttemptState(state: AuthAttemptState): void {
  try {
    localStorage.setItem(STORAGE_KEY_AUTH_ATTEMPTS, JSON.stringify(state));
  } catch {}
}

export function getRemainingLockoutSeconds(): number {
  const st = getAttemptState();
  const diff = st.lockedUntil - Date.now();
  return diff > 0 ? Math.ceil(diff / 1000) : 0;
}

async function createSignedAdminSession(cfg: AdminAuthConfig): Promise<AdminSessionRecord> {
  const issuedAt = Date.now();
  const expiresAt = issuedAt + SESSION_DURATION_MS;
  const tokenHex = await computeSessionSignature(issuedAt, expiresAt, cfg.version, cfg.hashHex);
  const session: AdminSessionRecord = {
    role: 'Admin',
    version: cfg.version,
    issuedAt,
    expiresAt,
    tokenHex,
  };
  try {
    localStorage.setItem(STORAGE_KEY_ADMIN_SESSION, JSON.stringify(session));
    localStorage.setItem(STORAGE_KEY_LEGACY_ROLE, 'Admin');
  } catch {}
  return session;
}

export function clearAdminSession(): void {
  try {
    localStorage.removeItem(STORAGE_KEY_ADMIN_SESSION);
    localStorage.setItem(STORAGE_KEY_LEGACY_ROLE, 'Pickeur');
  } catch {}
}

/**
 * Validates the persisted Admin session against expiry, config version, and signature.
 */
export async function validatePersistedAdminSession(): Promise<boolean> {
  try {
    const cfg = getLocalAuthConfig();
    if (!cfg) return false;

    const raw = localStorage.getItem(STORAGE_KEY_ADMIN_SESSION);
    if (!raw) return false;

    const session = JSON.parse(raw) as AdminSessionRecord;
    if (
      session?.role !== 'Admin' ||
      !session.tokenHex ||
      !session.issuedAt ||
      !session.expiresAt
    ) {
      return false;
    }

    if (Date.now() > session.expiresAt) {
      clearAdminSession();
      return false;
    }

    if (session.version !== cfg.version) {
      clearAdminSession();
      return false;
    }

    const expectedSig = await computeSessionSignature(
      session.issuedAt,
      session.expiresAt,
      cfg.version,
      cfg.hashHex
    );
    if (!constantTimeEqual(session.tokenHex, expectedSig)) {
      clearAdminSession();
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

export function getActiveSessionInfo(): AdminSessionRecord | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_ADMIN_SESSION);
    if (!raw) return null;
    return JSON.parse(raw) as AdminSessionRecord;
  } catch {
    return null;
  }
}

/**
 * Checks whether an Admin password has already been initialized.
 */
export async function checkIsAdminPasswordConfigured(): Promise<boolean> {
  const cfg = await syncAdminAuthConfigFromCloud();
  return Boolean(cfg && cfg.hashHex && cfg.saltHex);
}

/**
 * First-run setup flow: creates the initial Admin/Data password (min 6 chars),
 * stores its salted PBKDF2-SHA256 hash locally + in Supabase, unlocks Admin session,
 * and logs the security event.
 */
export async function setupInitialAdminPassword(newPassword: string): Promise<{
  success: boolean;
  error?: string;
}> {
  const trimmed = newPassword.trim();
  if (trimmed.length < 6) {
    return {
      success: false,
      error: 'Le mot de passe doit contenir au moins 6 caractères.',
    };
  }

  const existing = await syncAdminAuthConfigFromCloud();
  if (existing) {
    return {
      success: false,
      error: 'Un mot de passe Administrateur existe déjà. Veuillez le saisir.',
    };
  }

  const saltHex = generateSaltHex(16);
  const hashHex = await derivePbkdf2HashHex(trimmed, saltHex, PBKDF2_ITERATIONS);
  const cfg: AdminAuthConfig = {
    version: 1,
    saltHex,
    hashHex,
    iterations: PBKDF2_ITERATIONS,
    updatedAt: new Date().toISOString(),
    updatedByDeviceId: getOrCreateDeviceId(),
  };

  saveLocalAuthConfig(cfg);
  await pushAuthConfigToCloud(cfg);
  await createSignedAdminSession(cfg);
  saveAttemptState({ failedCount: 0, lockedUntil: 0, lastFailedAt: 0 });

  await logAppEvent({
    category: 'AUTH',
    action: 'ADMIN_PASSWORD_CONFIGURED',
    actorRole: 'Admin',
    target: 'Sécurité Data',
    details: 'Mot de passe Administrateur initial configuré avec hachage PBKDF2-SHA256.',
  });

  return { success: true };
}

/**
 * Verifies the entered Admin password with brute-force lockout protection.
 */
export async function verifyAdminPassword(passcode: string): Promise<{
  success: boolean;
  lockedSeconds?: number;
  remainingAttempts?: number;
  error?: string;
}> {
  const lockSec = getRemainingLockoutSeconds();
  if (lockSec > 0) {
    return {
      success: false,
      lockedSeconds: lockSec,
      error: `Trop de tentatives. Réessayez dans ${lockSec}s.`,
    };
  }

  const cfg = await syncAdminAuthConfigFromCloud();
  if (!cfg) {
    return {
      success: false,
      error: 'Aucun mot de passe configuré.',
    };
  }

  const trimmed = passcode.trim();
  if (!trimmed) {
    return {
      success: false,
      error: 'Veuillez saisir le mot de passe.',
    };
  }

  const derived = await derivePbkdf2HashHex(trimmed, cfg.saltHex, cfg.iterations || PBKDF2_ITERATIONS);
  const isMatch = constantTimeEqual(derived, cfg.hashHex);

  if (isMatch) {
    saveAttemptState({ failedCount: 0, lockedUntil: 0, lastFailedAt: 0 });
    await createSignedAdminSession(cfg);
    await logAppEvent({
      category: 'AUTH',
      action: 'ADMIN_UNLOCK_SUCCESS',
      actorRole: 'Admin',
      target: 'Panneau Admin',
      details: 'Session Administrateur déverrouillée avec succès.',
    });
    return { success: true };
  }

  const prevState = getAttemptState();
  const nextFailed = prevState.failedCount + 1;
  let lockedUntil = 0;

  if (nextFailed >= MAX_FREE_ATTEMPTS) {
    const penaltySeconds = nextFailed >= 10 ? 300 : nextFailed >= 8 ? 180 : 60;
    lockedUntil = Date.now() + penaltySeconds * 1000;
  }

  saveAttemptState({
    failedCount: nextFailed,
    lockedUntil,
    lastFailedAt: Date.now(),
  });

  await logAppEvent({
    category: 'AUTH',
    action: lockedUntil > 0 ? 'ADMIN_LOCKOUT_TRIGGERED' : 'ADMIN_LOGIN_FAILED',
    actorRole: 'Pickeur',
    target: 'Accès Data Admin',
    details:
      lockedUntil > 0
        ? `Verrouillage temporaire activé après ${nextFailed} tentatives incorrectes.`
        : `Tentative d'accès refusée (mot de passe incorrect, essai #${nextFailed}).`,
  });

  if (lockedUntil > 0) {
    const sec = Math.ceil((lockedUntil - Date.now()) / 1000);
    return {
      success: false,
      lockedSeconds: sec,
      error: `Trop de tentatives incorrectes. Bloqué pendant ${sec}s.`,
    };
  }

  const remaining = Math.max(0, MAX_FREE_ATTEMPTS - nextFailed);
  return {
    success: false,
    remainingAttempts: remaining,
    error: `Mot de passe incorrect (${remaining} essai${remaining > 1 ? 's' : ''} restant${remaining > 1 ? 's' : ''}).`,
  };
}

/**
 * Changes the Admin/Data password from inside the Admin dashboard,
 * increments the config version to invalidate prior sessions on other devices,
 * and re-issues a fresh session on the current device.
 */
export async function changeAdminPassword(
  currentPassword: string,
  newPassword: string
): Promise<{ success: boolean; error?: string }> {
  const cfg = await syncAdminAuthConfigFromCloud();
  if (!cfg) {
    return { success: false, error: 'Configuration sécurité introuvable.' };
  }

  const currentTrimmed = currentPassword.trim();
  const newTrimmed = newPassword.trim();

  if (newTrimmed.length < 6) {
    return {
      success: false,
      error: 'Le nouveau mot de passe doit contenir au moins 6 caractères.',
    };
  }

  if (currentTrimmed === newTrimmed) {
    return {
      success: false,
      error: 'Le nouveau mot de passe doit être différent de l’ancien.',
    };
  }

  const currentDerived = await derivePbkdf2HashHex(
    currentTrimmed,
    cfg.saltHex,
    cfg.iterations || PBKDF2_ITERATIONS
  );

  if (!constantTimeEqual(currentDerived, cfg.hashHex)) {
    await logAppEvent({
      category: 'AUTH',
      action: 'PASSWORD_CHANGE_FAILED',
      actorRole: 'Admin',
      target: 'Mot de passe Data',
      details: 'Échec de modification du mot de passe : mot de passe actuel incorrect.',
    });
    return { success: false, error: 'Le mot de passe actuel est incorrect.' };
  }

  const nextSaltHex = generateSaltHex(16);
  const nextHashHex = await derivePbkdf2HashHex(newTrimmed, nextSaltHex, PBKDF2_ITERATIONS);
  const nextCfg: AdminAuthConfig = {
    version: (cfg.version || 1) + 1,
    saltHex: nextSaltHex,
    hashHex: nextHashHex,
    iterations: PBKDF2_ITERATIONS,
    updatedAt: new Date().toISOString(),
    updatedByDeviceId: getOrCreateDeviceId(),
  };

  saveLocalAuthConfig(nextCfg);
  await pushAuthConfigToCloud(nextCfg);
  await createSignedAdminSession(nextCfg);

  await logAppEvent({
    category: 'AUTH',
    action: 'PASSWORD_CHANGED',
    actorRole: 'Admin',
    target: 'Mot de passe Data',
    details: `Mot de passe Administrateur modifié avec succès (Version sécurité v${nextCfg.version}). Les anciennes sessions ont été invalidées.`,
  });

  return { success: true };
}

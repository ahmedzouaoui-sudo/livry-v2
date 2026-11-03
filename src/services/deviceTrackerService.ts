import { supabasePublic, supabaseApi, activeSchema } from './supabaseClient';
import { UserDevice, DeviceStats } from '../types';

const STORAGE_KEY_DEVICE_ID = 'finder_device_tracker_id_v1';
const STORAGE_KEY_SESSION_FLAG = 'finder_device_session_active_v1';
const STORAGE_KEY_CACHED_TIME = 'finder_device_local_time_seconds_v1';
const STORAGE_KEY_USER_IP = 'finder_livry_user_ip';
const STORAGE_KEY_LOCAL_DEVICES = 'finder_tracked_devices_local_v2';

export const USER_DEVICES_SETUP_SQL = `-- =========================================================================
-- TABLE DES TÉLÉPHONES / APPAREILS CONNECTÉS ET TEMPS D'UTILISATION
-- À copier et exécuter dans : Supabase Dashboard -> SQL Editor -> New query -> Run
-- =========================================================================

CREATE TABLE IF NOT EXISTS public.user_devices (
  device_id TEXT PRIMARY KEY,
  ip_address TEXT,
  device_type TEXT NOT NULL DEFAULT 'Mobile',
  device_brand TEXT,
  user_agent TEXT,
  screen_size TEXT,
  first_seen_at TIMESTAMPTZ DEFAULT NOW(),
  last_active_at TIMESTAMPTZ DEFAULT NOW(),
  total_time_seconds INT DEFAULT 0,
  visits_count INT DEFAULT 1,
  is_online BOOLEAN DEFAULT true,
  worker_number TEXT,
  city TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Activation de la sécurité RLS (Row Level Security) avec accès en lecture/écriture
ALTER TABLE public.user_devices ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "user_devices_all_access" ON public.user_devices;
CREATE POLICY "user_devices_all_access" ON public.user_devices FOR ALL USING (true) WITH CHECK (true);
GRANT ALL ON TABLE public.user_devices TO anon, authenticated, service_role;

-- Notification pour recharger le cache schéma PostgREST
NOTIFY pgrst, 'reload schema';
`;

// In-memory flag to know if Supabase table has been confirmed missing
let isSupabaseDeviceTableMissing = false;

/**
 * Gets or creates a persistent unique ID for this device / phone.
 */
export function getOrCreateDeviceId(): string {
  try {
    let id = localStorage.getItem(STORAGE_KEY_DEVICE_ID);
    if (!id) {
      const rand = Math.random().toString(36).substring(2, 10);
      const timestamp = Date.now().toString(36);
      id = `phone_${timestamp}_${rand}`;
      localStorage.setItem(STORAGE_KEY_DEVICE_ID, id);
    }
    return id;
  } catch {
    return `phone_guest_${Date.now()}`;
  }
}

/**
 * Safe local storage devices retrieval (Local-first resilient fallback).
 */
export function getLocalTrackedDevices(): UserDevice[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_LOCAL_DEVICES);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Save devices to local storage.
 */
export function saveLocalTrackedDevices(devices: UserDevice[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_LOCAL_DEVICES, JSON.stringify(devices.slice(0, 500)));
  } catch {}
}

/**
 * Detects friendly device information, brand and OS.
 */
export function detectDeviceDetails(): {
  device_type: string;
  device_brand: string;
  screen_size: string;
} {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return {
      device_type: 'Inconnu',
      device_brand: 'Inconnu',
      screen_size: '0x0',
    };
  }

  const ua = navigator.userAgent || '';
  const screen_size = `${window.screen?.width || window.innerWidth || 0}x${
    window.screen?.height || window.innerHeight || 0
  }`;

  let device_type = 'Ordinateur';
  let device_brand = 'Desktop';

  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
  const isTablet = /(ipad|tablet|(android(?!.*mobile))|(windows(?!.*phone)(.*touch))|kindle|playbook|silk|(puffin(?!.*(IP|AP|WP))))/i.test(
    ua
  );

  if (isTablet) {
    device_type = 'Tablette';
  } else if (isMobile) {
    device_type = 'Mobile';
  } else {
    device_type = 'Ordinateur';
  }

  // Detect detailed brand / OS
  if (/iPhone/i.test(ua)) {
    device_type = 'Mobile (iPhone)';
    device_brand = 'Apple iPhone';
  } else if (/iPad/i.test(ua)) {
    device_type = 'Tablette (iPad)';
    device_brand = 'Apple iPad';
  } else if (/Android/i.test(ua)) {
    device_type = 'Mobile (Android)';
    if (/Samsung/i.test(ua) || /SM-/i.test(ua)) {
      device_brand = 'Samsung Galaxy';
    } else if (/Redmi|POCO|Xiaomi/i.test(ua)) {
      device_brand = 'Xiaomi / Redmi';
    } else if (/Huawei|Honor/i.test(ua)) {
      device_brand = 'Huawei';
    } else if (/OPPO/i.test(ua)) {
      device_brand = 'Oppo';
    } else if (/Vivo/i.test(ua)) {
      device_brand = 'Vivo';
    } else if (/Realme/i.test(ua)) {
      device_brand = 'Realme';
    } else if (/Pixel/i.test(ua)) {
      device_brand = 'Google Pixel';
    } else {
      device_brand = 'Smartphone Android';
    }
  } else if (/Macintosh|Mac OS X/i.test(ua)) {
    device_type = 'Ordinateur (Mac)';
    device_brand = 'Apple Mac';
  } else if (/Windows/i.test(ua)) {
    device_type = 'Ordinateur (Windows)';
    device_brand = 'PC Windows';
  } else if (/Linux/i.test(ua)) {
    device_type = 'Ordinateur (Linux)';
    device_brand = 'Linux';
  }

  return {
    device_type,
    device_brand,
    screen_size,
  };
}

/**
 * Fetch client IP address safely without hanging or throwing CORS errors.
 */
export async function getClientIpSafe(): Promise<string> {
  try {
    const cached = localStorage.getItem(STORAGE_KEY_USER_IP);
    if (cached && cached.trim()) return cached.trim();
  } catch {}

  const endpoints = [
    'https://api.ipify.org?format=json',
    'https://api64.ipify.org?format=json',
  ];

  for (const url of endpoints) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);
      if (res.ok) {
        const data = await res.json();
        if (data && data.ip) {
          try {
            localStorage.setItem(STORAGE_KEY_USER_IP, data.ip);
          } catch {}
          return data.ip;
        }
      }
    } catch {}
  }

  return 'Client Web / Mobile';
}

/**
 * Registers or updates this phone entry both locally and in Supabase `user_devices` table.
 * Guaranteed to never crash and always track the device even if Supabase table is not yet created.
 */
export async function registerDeviceEntry(providedIp?: string): Promise<{
  success: boolean;
  device?: UserDevice;
  isLocalOnly?: boolean;
  error?: string;
}> {
  try {
    const device_id = getOrCreateDeviceId();
    const details = detectDeviceDetails();
    const ua = typeof navigator !== 'undefined' ? navigator.userAgent : 'Unknown UA';
    const nowIso = new Date().toISOString();

    // Determine IP
    let ip = providedIp || '';
    if (!ip) {
      ip = await getClientIpSafe();
    }

    // Check if new session
    let isNewSession = false;
    try {
      if (!sessionStorage.getItem(STORAGE_KEY_SESSION_FLAG)) {
        isNewSession = true;
        sessionStorage.setItem(STORAGE_KEY_SESSION_FLAG, 'true');
      }
    } catch {
      isNewSession = true;
    }

    // 1. Update in local storage first (Guaranteed local survival)
    const localDevices = getLocalTrackedDevices();
    let localIndex = localDevices.findIndex((d) => d.device_id === device_id);
    let existingLocal = localIndex >= 0 ? localDevices[localIndex] : null;

    const currentVisits = existingLocal ? Number(existingLocal.visits_count || 1) : 0;
    const visits_count = isNewSession ? currentVisits + 1 : Math.max(1, currentVisits);
    const total_time_seconds = existingLocal ? Number(existingLocal.total_time_seconds || 0) : 0;
    const first_seen_at = existingLocal?.first_seen_at || nowIso;

    const payload: UserDevice = {
      device_id,
      ip_address: ip || existingLocal?.ip_address || 'Non détectée',
      device_type: details.device_type,
      device_brand: details.device_brand,
      user_agent: ua,
      screen_size: details.screen_size,
      first_seen_at,
      last_active_at: nowIso,
      total_time_seconds,
      visits_count,
      is_online: true,
      updated_at: nowIso,
    };

    if (localIndex >= 0) {
      localDevices[localIndex] = payload;
    } else {
      localDevices.unshift(payload);
    }
    saveLocalTrackedDevices(localDevices);

    // 2. Try to sync to Supabase (if available)
    try {
      const client = activeSchema === 'api' ? supabaseApi : supabasePublic;
      const fallbackClient = activeSchema === 'api' ? supabasePublic : supabaseApi;

      // Attempt upsert
      let { error } = await client.from('user_devices').upsert(payload, { onConflict: 'device_id' });
      if (error) {
        const resAlt = await fallbackClient.from('user_devices').upsert(payload, { onConflict: 'device_id' });
        if (resAlt.error) {
          isSupabaseDeviceTableMissing = true;
          return { success: true, device: payload, isLocalOnly: true, error: resAlt.error.message };
        }
      }

      isSupabaseDeviceTableMissing = false;
      return { success: true, device: payload, isLocalOnly: false };
    } catch (sbErr: any) {
      isSupabaseDeviceTableMissing = true;
      return { success: true, device: payload, isLocalOnly: true, error: sbErr.message };
    }
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Updates active heartbeat: records usage time and updates `last_active_at`.
 */
export async function sendDeviceHeartbeat(secondsToAdd = 30): Promise<void> {
  try {
    const device_id = getOrCreateDeviceId();
    const nowIso = new Date().toISOString();

    // 1. Always update local storage
    const localDevices = getLocalTrackedDevices();
    const idx = localDevices.findIndex((d) => d.device_id === device_id);
    let newTotal = secondsToAdd;

    if (idx >= 0) {
      const current = Number(localDevices[idx].total_time_seconds || 0);
      newTotal = current + secondsToAdd;
      localDevices[idx].total_time_seconds = newTotal;
      localDevices[idx].last_active_at = nowIso;
      localDevices[idx].is_online = true;
      localDevices[idx].updated_at = nowIso;
      saveLocalTrackedDevices(localDevices);
    }

    try {
      const current = Number(localStorage.getItem(STORAGE_KEY_CACHED_TIME) || 0);
      localStorage.setItem(STORAGE_KEY_CACHED_TIME, String(current + secondsToAdd));
    } catch {}

    // 2. Try Supabase update if not permanently missing
    if (!isSupabaseDeviceTableMissing) {
      const client = activeSchema === 'api' ? supabaseApi : supabasePublic;
      const fallbackClient = activeSchema === 'api' ? supabasePublic : supabaseApi;

      const updatePayload = {
        last_active_at: nowIso,
        total_time_seconds: newTotal,
        is_online: true,
        updated_at: nowIso,
      };

      const { error } = await client
        .from('user_devices')
        .update(updatePayload)
        .eq('device_id', device_id);

      if (error) {
        await fallbackClient
          .from('user_devices')
          .update(updatePayload)
          .eq('device_id', device_id);
      }
    }
  } catch {}
}

/**
 * Marks device as offline when leaving / backgrounding.
 */
export function markDeviceOffline(): void {
  try {
    const device_id = getOrCreateDeviceId();
    const nowIso = new Date().toISOString();

    // Local
    const localDevices = getLocalTrackedDevices();
    const idx = localDevices.findIndex((d) => d.device_id === device_id);
    if (idx >= 0) {
      localDevices[idx].is_online = false;
      localDevices[idx].last_active_at = nowIso;
      saveLocalTrackedDevices(localDevices);
    }

    // Supabase non-blocking
    if (!isSupabaseDeviceTableMissing) {
      const client = activeSchema === 'api' ? supabaseApi : supabasePublic;
      Promise.resolve(
        client
          .from('user_devices')
          .update({ is_online: false, last_active_at: nowIso, updated_at: nowIso })
          .eq('device_id', device_id)
      ).catch(() => {});
    }
  } catch {}
}

/**
 * Calculates aggregate statistics for an array of devices.
 */
function calculateStats(devices: UserDevice[]): DeviceStats {
  const now = Date.now();
  const TWO_MINUTES_MS = 2 * 60 * 1000;

  let totalSeconds = 0;
  let onlineCount = 0;
  let mobileCount = 0;
  let desktopCount = 0;

  for (const d of devices) {
    const lastActiveMs = d.last_active_at ? new Date(d.last_active_at).getTime() : 0;
    const isRecentlyActive = now - lastActiveMs < TWO_MINUTES_MS;
    const isOnline = isRecentlyActive || (d.is_online === true && now - lastActiveMs < 5 * 60 * 1000);

    const timeSec = Number(d.total_time_seconds || 0);
    totalSeconds += timeSec;

    if (isOnline) onlineCount++;

    const dtype = String(d.device_type || '');
    if (dtype.includes('Mobile') || dtype.includes('iPhone') || dtype.includes('Android')) {
      mobileCount++;
    } else {
      desktopCount++;
    }
  }

  return {
    totalDevices: devices.length,
    onlineDevices: onlineCount,
    totalTimeSeconds: totalSeconds,
    mobileCount,
    desktopCount,
  };
}

/**
 * Fetches all registered phones / devices and calculates aggregate statistics.
 * Resilient fallback: If Supabase table is not yet created or returns 404, returns local devices seamlessly!
 */
export async function fetchUserDevices(): Promise<{
  success: boolean;
  devices: UserDevice[];
  stats: DeviceStats;
  isLocalOnly: boolean;
  error?: string;
}> {
  // 1. Try Supabase
  try {
    const client = activeSchema === 'api' ? supabaseApi : supabasePublic;
    const fallbackClient = activeSchema === 'api' ? supabasePublic : supabaseApi;

    let { data, error } = await client
      .from('user_devices')
      .select('*')
      .order('last_active_at', { ascending: false });

    if (error) {
      const resAlt = await fallbackClient
        .from('user_devices')
        .select('*')
        .order('last_active_at', { ascending: false });
      if (!resAlt.error) {
        data = resAlt.data;
        error = null;
      }
    }

    if (!error && data) {
      isSupabaseDeviceTableMissing = false;

      const mapped: UserDevice[] = data.map((row: any) => ({
        device_id: String(row.device_id || ''),
        ip_address: String(row.ip_address || '-'),
        device_type: row.device_type || 'Mobile',
        device_brand: row.device_brand || undefined,
        user_agent: String(row.user_agent || ''),
        screen_size: String(row.screen_size || '-'),
        first_seen_at: row.first_seen_at || row.created_at || new Date().toISOString(),
        last_active_at: row.last_active_at || row.updated_at || new Date().toISOString(),
        total_time_seconds: Number(row.total_time_seconds || 0),
        visits_count: Number(row.visits_count || 1),
        is_online: Boolean(row.is_online),
        worker_number: row.worker_number || undefined,
        city: row.city || undefined,
        created_at: row.created_at,
        updated_at: row.updated_at,
      }));

      // Merge with current local device in case Supabase didn't have it yet
      const currentDeviceId = getOrCreateDeviceId();
      const hasCurrent = mapped.some((m) => m.device_id === currentDeviceId);
      if (!hasCurrent) {
        const localList = getLocalTrackedDevices();
        const currentLocal = localList.find((l) => l.device_id === currentDeviceId);
        if (currentLocal) {
          mapped.unshift(currentLocal);
        }
      }

      // Cache to local storage
      saveLocalTrackedDevices(mapped);

      return {
        success: true,
        devices: mapped,
        stats: calculateStats(mapped),
        isLocalOnly: false,
      };
    }
  } catch {}

  // 2. Resilient Fallback to Local Storage
  isSupabaseDeviceTableMissing = true;
  const localDevices = getLocalTrackedDevices();

  // If local list is empty, ensure at least the current user's phone is listed
  if (localDevices.length === 0) {
    const currentId = getOrCreateDeviceId();
    const details = detectDeviceDetails();
    const defaultDev: UserDevice = {
      device_id: currentId,
      ip_address: '127.0.0.1 (Local)',
      device_type: details.device_type,
      device_brand: details.device_brand,
      user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
      screen_size: details.screen_size,
      first_seen_at: new Date().toISOString(),
      last_active_at: new Date().toISOString(),
      total_time_seconds: 30,
      visits_count: 1,
      is_online: true,
      updated_at: new Date().toISOString(),
    };
    localDevices.push(defaultDev);
    saveLocalTrackedDevices(localDevices);
  }

  return {
    success: true,
    devices: localDevices,
    stats: calculateStats(localDevices),
    isLocalOnly: true,
    error: 'Table Supabase `user_devices` non trouvée. Données enregistrées localement.',
  };
}

/**
 * Format seconds into a friendly human-readable string (e.g. "1h 45m" or "25 min 10s").
 */
export function formatUsageDuration(seconds: number): string {
  if (!seconds || seconds <= 0) return 'Moins d\'une min';
  const sec = Math.floor(seconds);
  const hrs = Math.floor(sec / 3600);
  const mins = Math.floor((sec % 3600) / 60);
  const remainingSecs = sec % 60;

  if (hrs > 0) {
    return `${hrs}h ${mins}m`;
  }
  if (mins > 0) {
    return `${mins} min ${remainingSecs > 0 ? remainingSecs + 's' : ''}`;
  }
  return `${remainingSecs} sec`;
}

/**
 * Format date time to Moroccan / French locale with hours & minutes.
 */
export function formatDateTime(isoString: string): string {
  if (!isoString) return '-';
  try {
    const d = new Date(isoString);
    return d.toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  } catch {
    return isoString;
  }
}

/**
 * Relative time helper (e.g. "Actif à l'instant", "Il y a 5 min", "Il y a 2h").
 */
export function formatRelativeTime(isoString: string): string {
  if (!isoString) return '-';
  try {
    const diffMs = Date.now() - new Date(isoString).getTime();
    const diffSec = Math.floor(diffMs / 1000);
    if (diffSec < 60) return 'À l\'instant';
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `Il y a ${diffMin} min`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `Il y a ${diffHours}h`;
    const diffDays = Math.floor(diffHours / 24);
    return `Il y a ${diffDays} j`;
  } catch {
    return isoString;
  }
}

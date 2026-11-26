import {
  supabasePublic,
  supabaseApi,
  activeSchema,
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
} from './supabaseClient';
import { UserDevice, DeviceStats } from '../types';

const STORAGE_KEY_DEVICE_ID = 'finder_device_tracker_id_v1';
const STORAGE_KEY_SESSION_FLAG = 'finder_device_session_active_v1';
const STORAGE_KEY_CACHED_TIME = 'finder_device_local_time_seconds_v1';
const STORAGE_KEY_USER_IP = 'finder_livry_user_ip';
const STORAGE_KEY_LOCAL_DEVICES = 'finder_tracked_devices_local_v2';

/** Real-time timeout threshold: if no heartbeat for 25s and not in Realtime Presence -> Hors ligne */
export const REALTIME_ONLINE_THRESHOLD_MS = 25_000;

/** Live set of device_ids currently connected via Supabase Realtime Presence */
let realtimeOnlineIds = new Set<string>();

export function setRealtimeOnlineDeviceIds(ids: Iterable<string>): void {
  realtimeOnlineIds = new Set(Array.from(ids).filter(Boolean));
}

export function getRealtimeOnlineDeviceIds(): Set<string> {
  return realtimeOnlineIds;
}

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

    // 2. Multi-tier cloud persistence to Supabase
    // A) Always sync to Supabase shared cloud persistence (tips table with category 'device_tracker_record')
    try {
      const client = activeSchema === 'api' ? supabaseApi : supabasePublic;
      const fallbackClient = activeSchema === 'api' ? supabasePublic : supabaseApi;
      const cloudRecord = {
        id: `dev_rec_${payload.device_id}`,
        title: `${payload.device_brand || payload.device_type} (${payload.device_type})`,
        content: JSON.stringify(payload),
        category: 'device_tracker_record',
        author_role: payload.device_type,
        author_name: payload.ip_address,
        likes: payload.total_time_seconds,
        target_audience: 'Tous',
      };
      const { error: cloudErr } = await client.from('tips').upsert(cloudRecord, { onConflict: 'id' });
      if (cloudErr) {
        await fallbackClient.from('tips').upsert(cloudRecord, { onConflict: 'id' });
      }
    } catch (e) {
      console.warn('Cloud device record notice:', e);
    }

    // B) Also sync to dedicated user_devices table if present
    try {
      const client = activeSchema === 'api' ? supabaseApi : supabasePublic;
      const fallbackClient = activeSchema === 'api' ? supabasePublic : supabaseApi;

      let { error } = await client.from('user_devices').upsert(payload, { onConflict: 'device_id' });
      if (error) {
        const resAlt = await fallbackClient.from('user_devices').upsert(payload, { onConflict: 'device_id' });
        if (resAlt.error) {
          isSupabaseDeviceTableMissing = true;
          return { success: true, device: payload, isLocalOnly: false };
        }
      }

      isSupabaseDeviceTableMissing = false;
      return { success: true, device: payload, isLocalOnly: false };
    } catch {
      isSupabaseDeviceTableMissing = true;
      return { success: true, device: payload, isLocalOnly: false };
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
    let updatedDevice: UserDevice | null = null;

    if (idx >= 0) {
      const current = Number(localDevices[idx].total_time_seconds || 0);
      newTotal = current + secondsToAdd;
      localDevices[idx].total_time_seconds = newTotal;
      localDevices[idx].last_active_at = nowIso;
      localDevices[idx].is_online = true;
      localDevices[idx].updated_at = nowIso;
      updatedDevice = localDevices[idx];
      saveLocalTrackedDevices(localDevices);
    }

    try {
      const current = Number(localStorage.getItem(STORAGE_KEY_CACHED_TIME) || 0);
      localStorage.setItem(STORAGE_KEY_CACHED_TIME, String(current + secondsToAdd));
    } catch {}

    // 2. Sync active time to Supabase cloud shared persistence
    if (updatedDevice) {
      try {
        const client = activeSchema === 'api' ? supabaseApi : supabasePublic;
        const fallbackClient = activeSchema === 'api' ? supabasePublic : supabaseApi;
        const cloudRecord = {
          id: `dev_rec_${device_id}`,
          title: `${updatedDevice.device_brand || updatedDevice.device_type} (${updatedDevice.device_type})`,
          content: JSON.stringify(updatedDevice),
          category: 'device_tracker_record',
          author_role: updatedDevice.device_type,
          author_name: updatedDevice.ip_address,
          likes: newTotal,
          target_audience: 'Tous',
        };
        Promise.resolve(client.from('tips').upsert(cloudRecord, { onConflict: 'id' }))
          .then(({ error }) => {
            if (error) {
              Promise.resolve(fallbackClient.from('tips').upsert(cloudRecord, { onConflict: 'id' })).catch(() => {});
            }
          })
          .catch(() => {});
      } catch {}
    }

    // 3. Also update dedicated user_devices table if present
    if (!isSupabaseDeviceTableMissing) {
      const client = activeSchema === 'api' ? supabaseApi : supabasePublic;
      const fallbackClient = activeSchema === 'api' ? supabasePublic : supabaseApi;

      const updatePayload = {
        last_active_at: nowIso,
        total_time_seconds: newTotal,
        is_online: true,
        updated_at: nowIso,
      };

      Promise.resolve(client.from('user_devices').update(updatePayload).eq('device_id', device_id))
        .then(({ error }) => {
          if (error) {
            Promise.resolve(fallbackClient.from('user_devices').update(updatePayload).eq('device_id', device_id)).catch(() => {});
          }
        })
        .catch(() => {});
    }
  } catch {}
}

/**
 * Marks device as offline immediately when leaving / backgrounding / closing the app.
 * Uses `fetch(..., { keepalive: true })` so browsers complete the request even during tab/app termination.
 */
export function markDeviceOffline(): void {
  try {
    const device_id = getOrCreateDeviceId();
    const nowIso = new Date().toISOString();

    // Update Realtime Presence set locally
    realtimeOnlineIds.delete(device_id);

    // Local update
    const localDevices = getLocalTrackedDevices();
    const idx = localDevices.findIndex((d) => d.device_id === device_id);
    let devObj: UserDevice | null = null;
    if (idx >= 0) {
      localDevices[idx].is_online = false;
      localDevices[idx].last_active_at = nowIso;
      localDevices[idx].updated_at = nowIso;
      devObj = localDevices[idx];
      saveLocalTrackedDevices(localDevices);
    }

    const baseRest = `${SUPABASE_URL.replace(/\/+$/, '')}/rest/v1`;
    const commonHeaders: Record<string, string> = {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
      'Content-Profile': activeSchema,
    };

    // Cloud tips sync with keepalive
    if (devObj) {
      const cloudRecord = {
        id: `dev_rec_${device_id}`,
        title: `${devObj.device_brand || devObj.device_type} (${devObj.device_type})`,
        content: JSON.stringify(devObj),
        category: 'device_tracker_record',
        author_role: devObj.device_type,
        author_name: devObj.ip_address,
        likes: devObj.total_time_seconds,
        target_audience: 'Tous',
      };
      if (typeof fetch !== 'undefined') {
        fetch(`${baseRest}/tips?on_conflict=id`, {
          method: 'POST',
          keepalive: true,
          headers: {
            ...commonHeaders,
            Prefer: 'resolution=merge-duplicates',
          },
          body: JSON.stringify(cloudRecord),
        }).catch(() => {});
      }
    }

    // user_devices table update with keepalive
    if (!isSupabaseDeviceTableMissing && typeof fetch !== 'undefined') {
      fetch(`${baseRest}/user_devices?device_id=eq.${encodeURIComponent(device_id)}`, {
        method: 'PATCH',
        keepalive: true,
        headers: commonHeaders,
        body: JSON.stringify({
          is_online: false,
          last_active_at: nowIso,
          updated_at: nowIso,
        }),
      }).catch(() => {});
    }
  } catch {}
}

/**
 * Determines in real time whether a device is currently Online (app actively open) or Hors ligne.
 */
export function isDeviceCurrentlyOnline(device: UserDevice, nowMs = Date.now()): boolean {
  const currentId = getOrCreateDeviceId();

  // For THIS device, real-time truth is whether this app tab/window is currently visible & connected
  if (device.device_id === currentId) {
    const isVisible = typeof document === 'undefined' || document.visibilityState === 'visible';
    const isNetOnline = typeof navigator === 'undefined' || navigator.onLine !== false;
    return isVisible && isNetOnline;
  }

  // 1. Live WebSocket Presence: connected inside the app right now -> En ligne
  if (realtimeOnlineIds.has(device.device_id)) {
    return true;
  }

  // 2. Fallback check: only online if explicit DB is_online=true AND recent active heartbeat within 25s
  if (device.is_online !== true) {
    return false;
  }
  const lastActiveMs = device.last_active_at ? new Date(device.last_active_at).getTime() : 0;
  if (!Number.isFinite(lastActiveMs) || lastActiveMs <= 0) return false;
  const ageMs = nowMs - lastActiveMs;
  return ageMs >= -5000 && ageMs < REALTIME_ONLINE_THRESHOLD_MS;
}

/**
 * Calculates aggregate statistics using already-resolved real-time `is_online` flags.
 */
export function calculateDeviceStats(devices: UserDevice[]): DeviceStats {
  let totalSeconds = 0;
  let onlineCount = 0;
  let mobileCount = 0;
  let desktopCount = 0;

  for (const d of devices) {
    const timeSec = Number(d.total_time_seconds || 0);
    totalSeconds += timeSec;

    if (d.is_online) onlineCount++;

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
 * Re-evaluates real-time Online/Hors-ligne statuses and sorts Online devices first,
 * then by `last_active_at` descending.
 */
export function applyLivePresenceToDevices(devices: UserDevice[]): {
  devices: UserDevice[];
  stats: DeviceStats;
} {
  const nowMs = Date.now();
  const updated = devices
    .map((d) => {
      const liveOnline = isDeviceCurrentlyOnline(d, nowMs);
      return liveOnline === d.is_online ? d : { ...d, is_online: liveOnline };
    })
    .sort((a, b) => {
      const onlineDiff = (b.is_online ? 1 : 0) - (a.is_online ? 1 : 0);
      if (onlineDiff !== 0) return onlineDiff;
      const timeA = new Date(a.last_active_at || 0).getTime();
      const timeB = new Date(b.last_active_at || 0).getTime();
      return timeB - timeA;
    });

  return {
    devices: updated,
    stats: calculateDeviceStats(updated),
  };
}

/**
 * Pick whichever device snapshot has the fresher `last_active_at` timestamp,
 * keeping accumulated usage counters monotonic.
 */
function mergeNewerDeviceSnapshot(a: UserDevice, b: UserDevice): UserDevice {
  const msA = a.last_active_at ? new Date(a.last_active_at).getTime() : 0;
  const msB = b.last_active_at ? new Date(b.last_active_at).getTime() : 0;
  const newer = msB >= msA ? b : a;
  const older = newer === b ? a : b;

  return {
    ...older,
    ...newer,
    ip_address:
      newer.ip_address && newer.ip_address !== '-' && newer.ip_address !== 'Détection en cours'
        ? newer.ip_address
        : older.ip_address,
    total_time_seconds: Math.max(
      Number(a.total_time_seconds || 0),
      Number(b.total_time_seconds || 0)
    ),
    visits_count: Math.max(Number(a.visits_count || 1), Number(b.visits_count || 1)),
    is_online: Boolean(newer.is_online),
    last_active_at: newer.last_active_at || older.last_active_at,
  };
}

/**
 * Fetches all registered phones / devices and calculates real-time status + aggregate statistics.
 */
export async function fetchUserDevices(): Promise<{
  success: boolean;
  devices: UserDevice[];
  stats: DeviceStats;
  isLocalOnly: boolean;
  error?: string;
}> {
  const mergedMap = new Map<string, UserDevice>();

  // 1. Fetch from Supabase Cloud shared persistence (tips table with category 'device_tracker_record')
  try {
    const client = activeSchema === 'api' ? supabaseApi : supabasePublic;
    const fallbackClient = activeSchema === 'api' ? supabasePublic : supabaseApi;

    let { data: cloudData, error: cloudErr } = await client
      .from('tips')
      .select('*')
      .eq('category', 'device_tracker_record');

    if (cloudErr) {
      const alt = await fallbackClient
        .from('tips')
        .select('*')
        .eq('category', 'device_tracker_record');
      if (!alt.error && alt.data) {
        cloudData = alt.data;
        cloudErr = null;
      }
    }

    if (!cloudErr && cloudData && Array.isArray(cloudData)) {
      for (const row of cloudData) {
        try {
          if (row.content) {
            const parsed = JSON.parse(row.content);
            if (parsed && parsed.device_id) {
              const existing = mergedMap.get(parsed.device_id);
              mergedMap.set(
                parsed.device_id,
                existing ? mergeNewerDeviceSnapshot(existing, parsed) : parsed
              );
            }
          }
        } catch {}
      }
    }
  } catch (err) {
    console.warn('Cloud devices query notice:', err);
  }

  // 2. Also fetch from dedicated user_devices table if present
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

    if (!error && data && Array.isArray(data)) {
      isSupabaseDeviceTableMissing = false;
      for (const row of data) {
        const id = String(row.device_id || '');
        if (id) {
          const dev: UserDevice = {
            device_id: id,
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
          };
          const existing = mergedMap.get(id);
          mergedMap.set(id, existing ? mergeNewerDeviceSnapshot(existing, dev) : dev);
        }
      }
    }
  } catch {}

  // 3. Merge with local storage devices (only newer wins; keeps current device fast)
  const localDevices = getLocalTrackedDevices();
  for (const loc of localDevices) {
    if (loc && loc.device_id) {
      const existing = mergedMap.get(loc.device_id);
      if (!existing) {
        mergedMap.set(loc.device_id, loc);
      } else {
        mergedMap.set(loc.device_id, mergeNewerDeviceSnapshot(existing, loc));
      }
    }
  }

  // Ensure current device is present
  const currentDeviceId = getOrCreateDeviceId();
  if (!mergedMap.has(currentDeviceId)) {
    const details = detectDeviceDetails();
    const currentDev: UserDevice = {
      device_id: currentDeviceId,
      ip_address: 'Détection en cours',
      device_type: details.device_type,
      device_brand: details.device_brand,
      user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
      screen_size: details.screen_size,
      first_seen_at: new Date().toISOString(),
      last_active_at: new Date().toISOString(),
      total_time_seconds: 10,
      visits_count: 1,
      is_online: true,
      updated_at: new Date().toISOString(),
    };
    mergedMap.set(currentDeviceId, currentDev);
  }

  // Apply real-time presence resolution (Online if app open, Hors ligne otherwise)
  const { devices: finalDevices, stats } = applyLivePresenceToDevices(
    Array.from(mergedMap.values())
  );

  // Save merged state to local storage cache
  saveLocalTrackedDevices(finalDevices);

  return {
    success: true,
    devices: finalDevices,
    stats,
    isLocalOnly: false,
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

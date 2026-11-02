import { supabasePublic, supabaseApi, activeSchema } from './supabaseClient';
import { UserDevice, DeviceStats } from '../types';

const STORAGE_KEY_DEVICE_ID = 'finder_device_tracker_id_v1';
const STORAGE_KEY_SESSION_FLAG = 'finder_device_session_active_v1';
const STORAGE_KEY_CACHED_TIME = 'finder_device_local_time_seconds_v1';
const STORAGE_KEY_USER_IP = 'finder_livry_user_ip';

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
 * Registers or updates this phone entry into Supabase `user_devices` table.
 * Strictly guarantees that every phone entering the app is recorded.
 */
export async function registerDeviceEntry(providedIp?: string): Promise<{
  success: boolean;
  device?: UserDevice;
  error?: string;
}> {
  try {
    const device_id = getOrCreateDeviceId();
    const details = detectDeviceDetails();
    const ua = typeof navigator !== 'undefined' ? navigator.userAgent : 'Unknown UA';

    // Retrieve IP
    let ip = providedIp || '';
    if (!ip) {
      try {
        ip = localStorage.getItem(STORAGE_KEY_USER_IP) || '';
      } catch {}
    }

    if (!ip) {
      try {
        const res = await fetch('https://api.ipify.org?format=json', { signal: AbortSignal.timeout(3000) });
        if (res.ok) {
          const d = await res.json();
          ip = d.ip || '';
          if (ip) {
            localStorage.setItem(STORAGE_KEY_USER_IP, ip);
          }
        }
      } catch {
        // Fallback
        ip = 'En attente IP...';
      }
    }

    // Check if new session
    const isNewSession = !sessionStorage.getItem(STORAGE_KEY_SESSION_FLAG);
    if (isNewSession) {
      try {
        sessionStorage.setItem(STORAGE_KEY_SESSION_FLAG, 'true');
      } catch {}
    }

    // Get current device row from Supabase to preserve cumulative time and count
    const client = activeSchema === 'api' ? supabaseApi : supabasePublic;
    const fallbackClient = activeSchema === 'api' ? supabasePublic : supabaseApi;

    let existingDevice: any = null;
    try {
      const { data } = await client
        .from('user_devices')
        .select('*')
        .eq('device_id', device_id)
        .maybeSingle();
      existingDevice = data;
    } catch {
      // try fallback
      try {
        const { data } = await fallbackClient
          .from('user_devices')
          .select('*')
          .eq('device_id', device_id)
          .maybeSingle();
        existingDevice = data;
      } catch {}
    }

    const nowIso = new Date().toISOString();
    const currentVisits = existingDevice ? Number(existingDevice.visits_count || 1) : 0;
    const visits_count = isNewSession ? currentVisits + 1 : Math.max(1, currentVisits);
    const total_time_seconds = existingDevice ? Number(existingDevice.total_time_seconds || 0) : 0;
    const first_seen_at = existingDevice?.first_seen_at || nowIso;

    const payload: UserDevice = {
      device_id,
      ip_address: ip || existingDevice?.ip_address || 'Non détectée',
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

    // Upsert into Supabase
    let { error } = await client.from('user_devices').upsert(payload, { onConflict: 'device_id' });
    if (error) {
      // try fallback client
      const resAlt = await fallbackClient.from('user_devices').upsert(payload, { onConflict: 'device_id' });
      if (resAlt.error) {
        console.warn('[DeviceTracker] Erreur upsert device:', error.message || resAlt.error.message);
        return { success: false, device: payload, error: resAlt.error.message };
      }
    }

    return { success: true, device: payload };
  } catch (err: any) {
    console.warn('[DeviceTracker] Exception enregistrement téléphone:', err);
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

    // Cache locally
    try {
      const current = Number(localStorage.getItem(STORAGE_KEY_CACHED_TIME) || 0);
      localStorage.setItem(STORAGE_KEY_CACHED_TIME, String(current + secondsToAdd));
    } catch {}

    const client = activeSchema === 'api' ? supabaseApi : supabasePublic;
    const fallbackClient = activeSchema === 'api' ? supabasePublic : supabaseApi;

    // Fetch current total time to increment accurately
    let existing: any = null;
    try {
      const { data } = await client
        .from('user_devices')
        .select('total_time_seconds, visits_count')
        .eq('device_id', device_id)
        .maybeSingle();
      existing = data;
    } catch {
      try {
        const { data } = await fallbackClient
          .from('user_devices')
          .select('total_time_seconds, visits_count')
          .eq('device_id', device_id)
          .maybeSingle();
        existing = data;
      } catch {}
    }

    const currentTotal = existing ? Number(existing.total_time_seconds || 0) : 0;
    const newTotal = currentTotal + secondsToAdd;

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
  } catch (err) {
    console.warn('[DeviceTracker] Erreur heartbeat:', err);
  }
}

/**
 * Marks device as offline when leaving / backgrounding.
 */
export function markDeviceOffline(): void {
  try {
    const device_id = getOrCreateDeviceId();
    const nowIso = new Date().toISOString();
    const client = activeSchema === 'api' ? supabaseApi : supabasePublic;
    
    // Asynchronous non-blocking update
    Promise.resolve(
      client
        .from('user_devices')
        .update({ is_online: false, last_active_at: nowIso, updated_at: nowIso })
        .eq('device_id', device_id)
    ).catch(() => {});
  } catch {}
}

/**
 * Fetches all registered phones / devices and calculates aggregate statistics.
 */
export async function fetchUserDevices(): Promise<{
  success: boolean;
  devices: UserDevice[];
  stats: DeviceStats;
  error?: string;
}> {
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

    if (error) {
      return {
        success: false,
        devices: [],
        stats: {
          totalDevices: 0,
          onlineDevices: 0,
          totalTimeSeconds: 0,
          mobileCount: 0,
          desktopCount: 0,
        },
        error: error.message,
      };
    }

    const now = Date.now();
    const TWO_MINUTES_MS = 2 * 60 * 1000;

    let totalSeconds = 0;
    let onlineCount = 0;
    let mobileCount = 0;
    let desktopCount = 0;

    const mapped: UserDevice[] = (data || []).map((row: any) => {
      const lastActiveMs = row.last_active_at ? new Date(row.last_active_at).getTime() : 0;
      const isRecentlyActive = now - lastActiveMs < TWO_MINUTES_MS;
      const isOnline = isRecentlyActive || (row.is_online === true && now - lastActiveMs < 5 * 60 * 1000);

      const timeSec = Number(row.total_time_seconds || 0);
      totalSeconds += timeSec;

      if (isOnline) onlineCount++;

      const dtype = String(row.device_type || '');
      if (dtype.includes('Mobile') || dtype.includes('iPhone') || dtype.includes('Android')) {
        mobileCount++;
      } else {
        desktopCount++;
      }

      return {
        device_id: String(row.device_id || ''),
        ip_address: String(row.ip_address || '-'),
        device_type: dtype || 'Mobile',
        device_brand: row.device_brand || undefined,
        user_agent: String(row.user_agent || ''),
        screen_size: String(row.screen_size || '-'),
        first_seen_at: row.first_seen_at || row.created_at || new Date().toISOString(),
        last_active_at: row.last_active_at || row.updated_at || new Date().toISOString(),
        total_time_seconds: timeSec,
        visits_count: Number(row.visits_count || 1),
        is_online: isOnline,
        worker_number: row.worker_number || undefined,
        city: row.city || undefined,
        created_at: row.created_at,
        updated_at: row.updated_at,
      };
    });

    return {
      success: true,
      devices: mapped,
      stats: {
        totalDevices: mapped.length,
        onlineDevices: onlineCount,
        totalTimeSeconds: totalSeconds,
        mobileCount,
        desktopCount,
      },
    };
  } catch (err: any) {
    return {
      success: false,
      devices: [],
      stats: {
        totalDevices: 0,
        onlineDevices: 0,
        totalTimeSeconds: 0,
        mobileCount: 0,
        desktopCount: 0,
      },
      error: err.message,
    };
  }
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

export interface VersionCheckResult {
  outdated: boolean;
  remoteBuildId?: string;
  reason?: 'version_json_mismatch' | 'sw_waiting' | 'asset_hash_mismatch' | 'preload_error';
}

export const CURRENT_APP_BUILD_ID: string =
  typeof __APP_BUILD_ID__ !== 'undefined' ? __APP_BUILD_ID__ : 'dev-local';

export const CURRENT_APP_BUILD_TIME: number =
  typeof __APP_BUILD_TIME__ !== 'undefined' ? __APP_BUILD_TIME__ : 0;

function extractMainEntryScript(html: string): string | null {
  const match = html.match(/<script[^>]+src=["']([^"']*\/assets\/index-[^"']+\.js)["']/i);
  return match ? match[1] : null;
}

/**
 * Checks whether the running browser bundle is older than the live version deployed on the server.
 * Never falsely triggers when offline.
 */
export async function checkServerVersion(): Promise<VersionCheckResult> {
  if (typeof window === 'undefined' || !navigator.onLine) {
    return { outdated: false };
  }

  try {
    // 1. Primary check: /version.json (always bypassed from caches & SW)
    const res = await fetch(`/version.json?t=${Date.now()}`, {
      method: 'GET',
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        Pragma: 'no-cache',
      },
    });

    if (res.ok) {
      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('application/json') || contentType.includes('text/plain')) {
        const data = await res.json();
        const remoteId = typeof data?.buildId === 'string' ? data.buildId.trim() : '';
        if (remoteId && remoteId !== CURRENT_APP_BUILD_ID) {
          return {
            outdated: true,
            remoteBuildId: remoteId,
            reason: 'version_json_mismatch',
          };
        }
        // Remote version.json matches currently running bundle
        return { outdated: false, remoteBuildId: remoteId };
      }
    }
  } catch {
    // Network blip or blocked request; try HTML script hash fallback below
  }

  try {
    // 2. Fallback check: compare live index.html main JS chunk vs active <script>
    const activeScript = document
      .querySelector('script[src*="/assets/index-"]')
      ?.getAttribute('src');

    if (activeScript) {
      const htmlRes = await fetch(`/index.html?t=${Date.now()}`, {
        method: 'GET',
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          Pragma: 'no-cache',
        },
      });
      if (htmlRes.ok) {
        const html = await htmlRes.text();
        const remoteScript = extractMainEntryScript(html);
        if (remoteScript && remoteScript !== activeScript) {
          return {
            outdated: true,
            reason: 'asset_hash_mismatch',
          };
        }
      }
    }
  } catch {
    // Ignore transient network errors
  }

  // 3. Service Worker waiting check
  if ('serviceWorker' in navigator) {
    try {
      const registrations = await navigator.serviceWorker.getRegistrations();
      for (const reg of registrations) {
        if (reg.waiting && navigator.serviceWorker.controller) {
          return { outdated: true, reason: 'sw_waiting' };
        }
      }
    } catch {
      // Ignore
    }
  }

  return { outdated: false };
}

/**
 * Unregisters old Service Workers, clears CacheStorage caches, and performs a forced cache-busting reload.
 */
export async function forceHardRefreshApp(): Promise<void> {
  try {
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(
        registrations.map(async (reg) => {
          try {
            if (reg.waiting) {
              reg.waiting.postMessage({ type: 'SKIP_WAITING' });
            }
            await reg.unregister();
          } catch {
            // Ignore
          }
        })
      );
    }
  } catch {
    // Ignore
  }

  try {
    if ('caches' in window) {
      const keys = await window.caches.keys();
      await Promise.all(keys.map((k) => window.caches.delete(k).catch(() => false)));
    }
  } catch {
    // Ignore
  }

  try {
    const url = new URL(window.location.href);
    url.searchParams.set('_upd', String(Date.now()));
    window.location.replace(url.toString());
  } catch {
    window.location.reload();
  }
}

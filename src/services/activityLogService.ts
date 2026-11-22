import { ActivityCategory, AppActivityLog, Product, Role, UserDevice } from '../types';
import { supabaseApi, supabasePublic, activeSchema } from './supabaseClient';
import { getOrCreateDeviceId } from './deviceTrackerService';
import { sanitizeCsvCell } from '../utils/securityUtils';

const STORAGE_KEY_ACTIVITY_LOGS = 'finder_livry_activity_logs_v1';
const STORAGE_KEY_USER_IP = 'finder_livry_user_ip';
export const ACTIVITY_LOG_BATCH_ID = 'app_activity_log_batch_v1';
export const ACTIVITY_LOG_BATCH_CATEGORY = 'app_activity_log_batch';
const MAX_LOCAL_LOGS = 600;
const MAX_CLOUD_BATCH_LOGS = 300;

let isAuditTableAvailable: boolean | null = null;

function getSafeIp(): string {
  try {
    return localStorage.getItem(STORAGE_KEY_USER_IP) || 'Non détectée';
  } catch {
    return 'Non détectée';
  }
}

export function getLocalActivityLogs(): AppActivityLog[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_ACTIVITY_LOGS);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveLocalActivityLogs(logs: AppActivityLog[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_ACTIVITY_LOGS, JSON.stringify(logs.slice(0, MAX_LOCAL_LOGS)));
  } catch {
    // Handle storage quota gracefully by keeping half
    try {
      localStorage.setItem(
        STORAGE_KEY_ACTIVITY_LOGS,
        JSON.stringify(logs.slice(0, Math.floor(MAX_LOCAL_LOGS / 2)))
      );
    } catch {}
  }
}

function getClient() {
  return activeSchema === 'api' ? supabaseApi : supabasePublic;
}

function mergeLogsById(a: AppActivityLog[], b: AppActivityLog[]): AppActivityLog[] {
  const map = new Map<string, AppActivityLog>();
  for (const item of [...a, ...b]) {
    if (item && item.id) {
      map.set(item.id, item);
    }
  }
  return Array.from(map.values())
    .sort((x, y) => new Date(y.timestamp).getTime() - new Date(x.timestamp).getTime())
    .slice(0, MAX_LOCAL_LOGS);
}

/**
 * Records a structured app activity event locally and asynchronously syncs to Supabase.
 */
export async function logAppEvent(params: {
  category: ActivityCategory;
  action: string;
  actorRole?: Role;
  target?: string;
  details: string;
}): Promise<AppActivityLog> {
  const now = new Date();
  const entry: AppActivityLog = {
    id: `log_${now.getTime()}_${Math.random().toString(36).slice(2, 8)}`,
    timestamp: now.toISOString(),
    localDateTime: now.toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }),
    category: params.category,
    action: params.action,
    actorRole: params.actorRole || 'Pickeur',
    deviceId: getOrCreateDeviceId(),
    ipAddress: getSafeIp(),
    target: params.target,
    details: params.details,
  };

  const current = getLocalActivityLogs();
  const next = [entry, ...current].slice(0, MAX_LOCAL_LOGS);
  saveLocalActivityLogs(next);

  try {
    window.dispatchEvent(new CustomEvent('livry:activity-log-updated'));
  } catch {}

  // Sync to cloud in the background without blocking UI
  syncLogEntryToCloud(entry, next).catch(() => {});

  return entry;
}

async function syncLogEntryToCloud(entry: AppActivityLog, allLogs: AppActivityLog[]): Promise<void> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) return;
  const client = getClient();

  // 1. Try dedicated app_activity_logs table if present
  if (isAuditTableAvailable !== false) {
    try {
      const { error } = await client.from('app_activity_logs').upsert(
        {
          id: entry.id,
          timestamp: entry.timestamp,
          local_date_time: entry.localDateTime,
          category: entry.category,
          action: entry.action,
          actor_role: entry.actorRole,
          device_id: entry.deviceId,
          ip_address: entry.ipAddress,
          target: entry.target || '',
          details: entry.details,
        },
        { onConflict: 'id' }
      );
      if (!error) {
        isAuditTableAvailable = true;
      } else if (
        error.code === 'PGRST205' ||
        error.code === '42P01' ||
        error.message?.includes('Could not find the table')
      ) {
        isAuditTableAvailable = false;
      }
    } catch {
      // fallback below
    }
  }

  // 2. Always persist rolling batch snapshot inside tips sentinel row so Admin sees cross-device logs immediately
  try {
    const batchPayload = JSON.stringify(allLogs.slice(0, MAX_CLOUD_BATCH_LOGS));
    await client.from('tips').upsert(
      {
        id: ACTIVITY_LOG_BATCH_ID,
        title: 'Journal Complet Application',
        content: batchPayload,
        category: ACTIVITY_LOG_BATCH_CATEGORY,
        author_role: 'Admin',
        author_name: entry.deviceId,
        created_at: entry.timestamp,
        likes: 0,
        image_url: '',
        target_audience: 'Admin',
      },
      { onConflict: 'id' }
    );
  } catch {}
}

/**
 * Fetches activity logs from Supabase and merges them with local device logs.
 */
export async function fetchAllActivityLogs(): Promise<AppActivityLog[]> {
  const local = getLocalActivityLogs();
  if (typeof navigator !== 'undefined' && !navigator.onLine) return local;

  let remoteLogs: AppActivityLog[] = [];
  const client = getClient();

  try {
    if (isAuditTableAvailable !== false) {
      const { data, error } = await client
        .from('app_activity_logs')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(MAX_LOCAL_LOGS);

      if (!error && Array.isArray(data)) {
        isAuditTableAvailable = true;
        remoteLogs = data.map((row: any) => ({
          id: String(row.id),
          timestamp: String(row.timestamp || new Date().toISOString()),
          localDateTime: String(row.local_date_time || row.timestamp || ''),
          category: (row.category || 'SYSTEM') as ActivityCategory,
          action: String(row.action || ''),
          actorRole: (row.actor_role === 'Admin' ? 'Admin' : 'Pickeur') as Role,
          deviceId: String(row.device_id || ''),
          ipAddress: String(row.ip_address || ''),
          target: row.target ? String(row.target) : undefined,
          details: String(row.details || ''),
        }));
      } else if (error) {
        isAuditTableAvailable = false;
      }
    }
  } catch {}

  try {
    const { data: batchRow } = await client
      .from('tips')
      .select('content')
      .eq('id', ACTIVITY_LOG_BATCH_ID)
      .maybeSingle();

    if (batchRow?.content) {
      const parsed = JSON.parse(batchRow.content);
      if (Array.isArray(parsed)) {
        remoteLogs = mergeLogsById(remoteLogs, parsed);
      }
    }
  } catch {}

  const merged = mergeLogsById(local, remoteLogs);
  saveLocalActivityLogs(merged);
  return merged;
}

/**
 * Builds a complete CSV export of all recorded activity logs (formula-injection safe).
 */
export function buildActivityLogsCsv(logs: AppActivityLog[]): string {
  const headers = [
    'Date & Heure',
    'ISO Timestamp',
    'Catégorie',
    'Action',
    'Rôle',
    'Cible',
    'Détails',
    'Appareil ID',
    'Adresse IP',
  ];

  const rows = logs.map((l) =>
    [
      sanitizeCsvCell(l.localDateTime),
      sanitizeCsvCell(l.timestamp),
      sanitizeCsvCell(l.category),
      sanitizeCsvCell(l.action),
      sanitizeCsvCell(l.actorRole),
      sanitizeCsvCell(l.target || '-'),
      sanitizeCsvCell(l.details),
      sanitizeCsvCell(l.deviceId),
      sanitizeCsvCell(l.ipAddress),
    ].join(',')
  );

  return '\uFEFF' + [headers.join(','), ...rows].join('\n');
}

/**
 * Builds a comprehensive human-readable TXT dossier ("file fiha kolchi")
 * summarizing catalog health, security state, connected devices, and all app activity.
 */
export function buildFullAuditTextReport(params: {
  logs: AppActivityLog[];
  products: Product[];
  devices: UserDevice[];
}): string {
  const { logs, products, devices } = params;
  const nowStr = new Date().toLocaleString('fr-FR');
  const v100 = products.filter((p) => p.verificationStatus === '100' || p.isVerified100).length;
  const v50 = products.filter((p) => p.verificationStatus === '50').length;
  const vBroken = products.filter((p) => p.verificationStatus === 'broken').length;
  const enabledCount = products.filter((p) => p.isEnabled).length;
  const hiddenCount = products.length - enabledCount;

  const lines: string[] = [
    '================================================================================',
    '          LIVRY CODE FINDER — RAPPORT COMPLET & JOURNAL D\'ACTIVITÉ',
    '================================================================================',
    `Date d'export         : ${nowStr}`,
    `Total actions tracées : ${logs.length}`,
    `Total articles        : ${products.length} (Visibles: ${enabledCount} | Masqués: ${hiddenCount})`,
    `Statuts Code-Barres   : 100% Bleu=${v100} | 50% Orange=${v50} | Makhdamch Rouge=${vBroken}`,
    `Appareils suivis      : ${devices.length}`,
    '',
    '--------------------------------------------------------------------------------',
    '1. HISTORIQUE DÉTAILLÉ DES ACTIONS DANS L\'APPLICATION',
    '--------------------------------------------------------------------------------',
  ];

  if (logs.length === 0) {
    lines.push('Aucune action enregistrée pour le moment.');
  } else {
    logs.forEach((log, index) => {
      lines.push(
        `[${index + 1}] ${log.localDateTime} | ${log.category} | ${log.action} | Rôle: ${log.actorRole}`
      );
      if (log.target) lines.push(`    Cible    : ${log.target}`);
      lines.push(`    Détails  : ${log.details}`);
      lines.push(`    Appareil : ${log.deviceId} (IP: ${log.ipAddress})`);
      lines.push('');
    });
  }

  lines.push('--------------------------------------------------------------------------------');
  lines.push('2. APPAREILS ENREGISTRÉS');
  lines.push('--------------------------------------------------------------------------------');
  if (devices.length === 0) {
    lines.push('Aucun appareil enregistré.');
  } else {
    devices.forEach((d, idx) => {
      lines.push(
        `[${idx + 1}] ${d.device_brand || d.device_type} | ID: ${d.device_id} | IP: ${d.ip_address} | Visites: ${d.visits_count} | Temps: ${Math.round((d.total_time_seconds || 0) / 60)} min | Dernière activité: ${d.last_active_at}`
      );
    });
  }

  lines.push('');
  lines.push('================================================================================');
  lines.push('Fin du rapport complet Livry Code Finder.');
  lines.push('================================================================================');

  return lines.join('\n');
}

import { Product } from '../types';
import { supabaseApi, supabasePublic, activeSchema } from './supabaseClient';
import {
  deleteAllProductsFromSupabase,
  seedProductsToSupabase,
} from './supabaseService';
import { exportProductsToCsv, parseProductsFromCsv } from '../utils/csvImporter';

export const DAILY_BACKUP_CATEGORY = 'daily_catalog_backup';
export const SUPABASE_STORAGE_BUCKET = 'backups';
export const STORAGE_NIGHTLY_FOLDER = 'nightly';
export const STORAGE_MANUAL_FOLDER = 'manual';
export const NIGHTLY_BACKUP_START_HOUR = 22; // 22:00 every night

const LOCAL_BACKUPS_META_KEY = 'finder_livry_daily_backups_meta_v2';
const LOCAL_BACKUP_PREFIX = 'finder_livry_daily_backup_data_';
const LAST_AUTO_BACKUP_TS_KEY = 'finder_livry_last_nightly_backup_v2';
const LAST_STORAGE_STATUS_KEY = 'finder_livry_storage_bucket_status_v1';
const EMERGENCY_BACKUP_KEY = 'finder_livry_products_backup_v3';

const MAX_CLOUD_DAILY_BACKUPS = 30;
const MAX_LOCAL_BACKUPS = 3;
const MIN_PRODUCTS_FOR_AUTO_BACKUP = 10;

export const SUPABASE_STORAGE_BACKUP_SQL = `-- Activer le stockage automatique des fichiers backup (.csv & .json) dans Supabase Storage
-- À exécuter une seule fois dans : Supabase Dashboard → SQL Editor → Run

INSERT INTO storage.buckets (id, name, public)
VALUES ('backups', 'backups', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "backups_public_select" ON storage.objects;
DROP POLICY IF EXISTS "backups_public_insert" ON storage.objects;
DROP POLICY IF EXISTS "backups_public_update" ON storage.objects;
DROP POLICY IF EXISTS "backups_public_delete" ON storage.objects;

CREATE POLICY "backups_public_select" ON storage.objects
  FOR SELECT USING (bucket_id = 'backups');

CREATE POLICY "backups_public_insert" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'backups');

CREATE POLICY "backups_public_update" ON storage.objects
  FOR UPDATE USING (bucket_id = 'backups') WITH CHECK (bucket_id = 'backups');

CREATE POLICY "backups_public_delete" ON storage.objects
  FOR DELETE USING (bucket_id = 'backups');`;

export interface DailyBackupMeta {
  id: string;
  dateKey: string; // YYYY-MM-DD
  title: string;
  createdAt: string; // ISO timestamp
  productCount: number;
  type: 'Auto' | 'Manuel' | 'Urgence';
  source: 'storage+cloud' | 'storage' | 'cloud' | 'local';
  csvStoragePath?: string;
  jsonStoragePath?: string;
  csvPublicUrl?: string;
  jsonPublicUrl?: string;
  fileSizeBytes?: number;
}

export interface StorageBucketStatus {
  ready: boolean;
  bucketName: string;
  fileCount: number;
  needsSetup: boolean;
  error?: string;
  lastUploadedAt?: string;
}

/**
 * Returns today's calendar date key in local timezone: YYYY-MM-DD
 */
export function getTodayDateKey(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function isInNightlyBackupWindow(date = new Date()): boolean {
  const h = date.getHours();
  return h >= NIGHTLY_BACKUP_START_HOUR || h < 5;
}

function getClient() {
  return activeSchema === 'api' ? supabaseApi : supabasePublic;
}

function getFallbackClient() {
  return activeSchema === 'api' ? supabasePublic : supabaseApi;
}

function saveStorageStatusCache(status: StorageBucketStatus): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(LAST_STORAGE_STATUS_KEY, JSON.stringify(status));
  } catch {}
}

export function getCachedStorageBucketStatus(): StorageBucketStatus | null {
  if (typeof localStorage === 'undefined') return null;
  try {
    const raw = localStorage.getItem(LAST_STORAGE_STATUS_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function getPublicUrlForPath(path: string): string {
  const { data } = supabasePublic.storage
    .from(SUPABASE_STORAGE_BUCKET)
    .getPublicUrl(path);
  return data?.publicUrl || '';
}

/**
 * Uploads BOTH a 12-column .csv file AND a full .json file directly to Supabase Storage (bucket: "backups")
 */
export async function uploadBackupFilesToStorage(
  folder: 'nightly' | 'manual',
  baseName: string,
  products: Product[]
): Promise<{
  success: boolean;
  csvStoragePath?: string;
  jsonStoragePath?: string;
  csvPublicUrl?: string;
  jsonPublicUrl?: string;
  fileSizeBytes?: number;
  needsBucketSetup?: boolean;
  error?: string;
}> {
  const csvPath = `${folder}/${baseName}.csv`;
  const jsonPath = `${folder}/${baseName}.json`;

  // UTF-8 BOM ensures Excel opens French accents cleanly
  const csvString = '\uFEFF' + exportProductsToCsv(products);
  const jsonString = JSON.stringify(
    {
      exportedAt: new Date().toISOString(),
      productCount: products.length,
      products,
    },
    null,
    2
  );

  const csvBody =
    typeof Blob !== 'undefined'
      ? new Blob([csvString], { type: 'text/csv;charset=utf-8' })
      : new TextEncoder().encode(csvString);
  const jsonBody =
    typeof Blob !== 'undefined'
      ? new Blob([jsonString], { type: 'application/json;charset=utf-8' })
      : new TextEncoder().encode(jsonString);

  try {
    const [csvRes, jsonRes] = await Promise.all([
      supabasePublic.storage.from(SUPABASE_STORAGE_BUCKET).upload(csvPath, csvBody, {
        upsert: true,
        contentType: 'text/csv;charset=utf-8',
      }),
      supabasePublic.storage.from(SUPABASE_STORAGE_BUCKET).upload(jsonPath, jsonBody, {
        upsert: true,
        contentType: 'application/json;charset=utf-8',
      }),
    ]);

    const uploadErr = csvRes.error || jsonRes.error;
    if (uploadErr) {
      const msg = uploadErr.message || 'Erreur upload Supabase Storage';
      const lower = msg.toLowerCase();
      const needsBucketSetup =
        lower.includes('bucket not found') ||
        lower.includes('row-level security') ||
        lower.includes('nosuchbucket') ||
        lower.includes('accessdenied') ||
        lower.includes('not authorized');

      saveStorageStatusCache({
        ready: false,
        bucketName: SUPABASE_STORAGE_BUCKET,
        fileCount: 0,
        needsSetup: needsBucketSetup,
        error: msg,
      });

      return {
        success: false,
        needsBucketSetup,
        error: msg,
      };
    }

    const totalSize =
      new TextEncoder().encode(csvString).length +
      new TextEncoder().encode(jsonString).length;

    const nowIso = new Date().toISOString();
    saveStorageStatusCache({
      ready: true,
      bucketName: SUPABASE_STORAGE_BUCKET,
      fileCount: 2,
      needsSetup: false,
      lastUploadedAt: nowIso,
    });

    return {
      success: true,
      csvStoragePath: csvPath,
      jsonStoragePath: jsonPath,
      csvPublicUrl: getPublicUrlForPath(csvPath),
      jsonPublicUrl: getPublicUrlForPath(jsonPath),
      fileSizeBytes: totalSize,
    };
  } catch (err: any) {
    const msg = err?.message || 'Erreur réseau Supabase Storage';
    return {
      success: false,
      needsBucketSetup: false,
      error: msg,
    };
  }
}

/**
 * Lists backup files currently stored in Supabase Storage ("backups/nightly" and "backups/manual")
 */
async function listStorageBackupFiles(): Promise<{
  filesFound: DailyBackupMeta[];
  totalFiles: number;
  storageAccessible: boolean;
}> {
  const byStem = new Map<string, DailyBackupMeta>();
  let totalFiles = 0;

  try {
    const [nightlyRes, manualRes] = await Promise.all([
      supabasePublic.storage.from(SUPABASE_STORAGE_BUCKET).list(STORAGE_NIGHTLY_FOLDER, {
        limit: 120,
        sortBy: { column: 'name', order: 'desc' },
      }),
      supabasePublic.storage.from(SUPABASE_STORAGE_BUCKET).list(STORAGE_MANUAL_FOLDER, {
        limit: 120,
        sortBy: { column: 'name', order: 'desc' },
      }),
    ]);

    const processFolder = (
      folder: 'nightly' | 'manual',
      items: any[] | null
    ) => {
      if (!Array.isArray(items)) return;
      for (const item of items) {
        if (!item?.name || item.name === '.emptyFolderPlaceholder') continue;
        const isCsv = item.name.endsWith('.csv');
        const isJson = item.name.endsWith('.json');
        if (!isCsv && !isJson) continue;

        totalFiles++;
        const stem = item.name.replace(/\.(csv|json)$/i, '');
        const fullPath = `${folder}/${item.name}`;
        const dateMatch = stem.match(/(\d{4}-\d{2}-\d{2})/);
        const dateKey = dateMatch ? dateMatch[1] : getTodayDateKey();
        const isAuto = folder === STORAGE_NIGHTLY_FOLDER;

        // Align nightly ID with Cloud DB ID so both merge cleanly into a single row
        const key = isAuto
          ? `backup_daily_${dateKey}`
          : `storage_manual_${stem}`;

        const existing = byStem.get(key);
        const fileSize = Number(item.metadata?.size || 0);
        const updatedAt = item.updated_at || item.created_at || new Date().toISOString();

        const nextMeta: DailyBackupMeta = existing
          ? {
              ...existing,
              fileSizeBytes: (existing.fileSizeBytes || 0) + fileSize,
              createdAt:
                new Date(updatedAt).getTime() > new Date(existing.createdAt).getTime()
                  ? updatedAt
                  : existing.createdAt,
            }
          : {
              id: key,
              dateKey,
              title: isAuto
                ? `Backup Nuit (Fichiers) - ${dateKey}`
                : `Backup Manuel (Fichiers) - ${dateKey}`,
              createdAt: updatedAt,
              productCount: 0,
              type: isAuto ? 'Auto' : 'Manuel',
              source: 'storage',
              fileSizeBytes: fileSize,
            };

        if (isCsv) {
          nextMeta.csvStoragePath = fullPath;
          nextMeta.csvPublicUrl = getPublicUrlForPath(fullPath);
        }
        if (isJson) {
          nextMeta.jsonStoragePath = fullPath;
          nextMeta.jsonPublicUrl = getPublicUrlForPath(fullPath);
        }

        byStem.set(key, nextMeta);
      }
    };

    processFolder(STORAGE_NIGHTLY_FOLDER, nightlyRes.data);
    processFolder(STORAGE_MANUAL_FOLDER, manualRes.data);

    const hasError = Boolean(nightlyRes.error && manualRes.error);
    return {
      filesFound: Array.from(byStem.values()),
      totalFiles,
      storageAccessible: !hasError && totalFiles > 0,
    };
  } catch {
    return { filesFound: [], totalFiles: 0, storageAccessible: false };
  }
}

function saveLocalBackupSnapshot(meta: DailyBackupMeta, products: Product[]): void {
  if (typeof localStorage === 'undefined') return;
  try {
    const rawMeta = localStorage.getItem(LOCAL_BACKUPS_META_KEY);
    let metas: DailyBackupMeta[] = rawMeta ? JSON.parse(rawMeta) : [];
    if (!Array.isArray(metas)) metas = [];

    metas = [meta, ...metas.filter((m) => m.id !== meta.id)];

    while (metas.length > MAX_LOCAL_BACKUPS) {
      const removed = metas.pop();
      if (removed) {
        try {
          localStorage.removeItem(`${LOCAL_BACKUP_PREFIX}${removed.id}`);
        } catch {}
      }
    }

    localStorage.setItem(`${LOCAL_BACKUP_PREFIX}${meta.id}`, JSON.stringify(products));
    localStorage.setItem(LOCAL_BACKUPS_META_KEY, JSON.stringify(metas));
  } catch (err) {
    console.warn('[DailyBackup] Local storage quota notice:', err);
  }
}

function getLocalBackupsMeta(): DailyBackupMeta[] {
  if (typeof localStorage === 'undefined') return [];
  const results: DailyBackupMeta[] = [];

  try {
    const rawMeta = localStorage.getItem(LOCAL_BACKUPS_META_KEY);
    if (rawMeta) {
      const parsed = JSON.parse(rawMeta);
      if (Array.isArray(parsed)) {
        for (const m of parsed) {
          if (m && m.id) {
            results.push({ ...m, source: 'local' });
          }
        }
      }
    }
  } catch {}

  try {
    const emergencyRaw = localStorage.getItem(EMERGENCY_BACKUP_KEY);
    if (emergencyRaw) {
      const arr = JSON.parse(emergencyRaw);
      if (Array.isArray(arr) && arr.length > 0) {
        results.push({
          id: EMERGENCY_BACKUP_KEY,
          dateKey: getTodayDateKey(),
          title: "Sauvegarde d'urgence locale",
          createdAt: new Date().toISOString(),
          productCount: arr.length,
          type: 'Urgence',
          source: 'local',
        });
      }
    }
  } catch {}

  return results;
}

/**
 * Upserts a backup record into Supabase Cloud DB (zero-config mirror inside tips table)
 */
async function upsertBackupToCloudDb(
  id: string,
  title: string,
  type: 'Auto' | 'Manuel',
  createdAtIso: string,
  products: Product[]
): Promise<{ success: boolean; error?: string }> {
  const cloudRow = {
    id,
    title,
    content: JSON.stringify(products),
    category: DAILY_BACKUP_CATEGORY,
    author_role: type,
    author_name: createdAtIso,
    likes: products.length,
    target_audience: 'Admin',
  };

  try {
    const client = getClient();
    const { error } = await client.from('tips').upsert(cloudRow, { onConflict: 'id' });
    if (!error) return { success: true };

    const fallback = getFallbackClient();
    const { error: fallbackErr } = await fallback.from('tips').upsert(cloudRow, { onConflict: 'id' });
    if (!fallbackErr) return { success: true };

    return { success: false, error: error.message || fallbackErr.message };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Erreur réseau Supabase' };
  }
}

/**
 * Automatically uploads nightly backup files (.csv + .json) directly to Supabase Storage
 * + mirrors to Supabase Cloud DB and LocalStorage.
 *
 * Schedule ("Kola Lil" - Every Night):
 * - Runs automatically every night starting at 22:00 (and again after midnight for the new date).
 * - If no backup file exists yet for today (e.g. app wasn't open overnight), uploads immediately on first open.
 * - Safety protection: NEVER overwrites a healthy backup with an empty or suddenly shrunk catalog (-20+ items).
 * - Retention: automatically keeps the latest 30 nightly backup days.
 */
export async function ensureDailyBackup(
  products: Product[],
  forceRefresh = false
): Promise<{
  created: boolean;
  updated: boolean;
  backupId?: string;
  storageUploaded?: boolean;
  needsBucketSetup?: boolean;
  storageError?: string;
  skippedReason?: string;
}> {
  if (!Array.isArray(products) || products.length < MIN_PRODUCTS_FOR_AUTO_BACKUP) {
    return {
      created: false,
      updated: false,
      skippedReason: 'Catalogue trop petit pour auto-backup',
    };
  }

  const now = new Date();
  const dateKey = getTodayDateKey();
  const inNightWindow = isInNightlyBackupWindow(now);
  const backupId = `backup_daily_${dateKey}`;
  const storageBaseName = `backup_livry_${dateKey}`;
  const nowIso = now.toISOString();

  // Smart throttle unless forced
  if (!forceRefresh && typeof localStorage !== 'undefined') {
    try {
      const lastRunStr = localStorage.getItem(LAST_AUTO_BACKUP_TS_KEY);
      if (lastRunStr) {
        const parsed = JSON.parse(lastRunStr);
        const ageMs = Date.now() - Number(parsed.ts || 0);
        const alreadyDidNightly = Boolean(parsed.nightlyDone);
        const storageOk = Boolean(parsed.storageUploaded);

        // If we already uploaded today's backup with same count, AND either:
        // - it's not the nightly window yet, OR we already did tonight's nightly refresh
        // AND it's been less than 30 min (or storage is already uploaded)
        const nightRequirementSatisfied = !inNightWindow || alreadyDidNightly;
        if (
          parsed.dateKey === dateKey &&
          parsed.count === products.length &&
          nightRequirementSatisfied &&
          (storageOk || ageMs < 30 * 60 * 1000)
        ) {
          return {
            created: false,
            updated: false,
            backupId,
            storageUploaded: storageOk,
            skippedReason: 'Déjà sauvegardé récemment',
          };
        }
      }
    } catch {}
  }

  // Check existing Cloud DB backup count to protect against accidental catalog wipe
  let existingCount: number | null = null;
  try {
    const client = getClient();
    const { data } = await client
      .from('tips')
      .select('id, likes')
      .eq('id', backupId)
      .maybeSingle();

    if (data && typeof data.likes === 'number') {
      existingCount = data.likes;
    }
  } catch {}

  // CRITICAL PROTECTION: Do NOT overwrite today's healthy backup with a drastically smaller catalog
  if (!forceRefresh && existingCount !== null && existingCount >= products.length + 20) {
    return {
      created: false,
      updated: false,
      backupId,
      skippedReason: `Protection active : le backup du jour contient déjà ${existingCount} articles`,
    };
  }

  const title = inNightWindow
    ? `Backup Nuit Auto - ${dateKey}`
    : `Backup Auto - ${dateKey}`;

  // 1. Upload real .csv and .json files directly to Supabase Storage ("backups/nightly/...")
  const storageRes = await uploadBackupFilesToStorage(
    STORAGE_NIGHTLY_FOLDER,
    storageBaseName,
    products
  );

  // 2. Mirror to Supabase Cloud DB (guaranteed fallback even if Storage bucket isn't created yet)
  const cloudDbRes = await upsertBackupToCloudDb(backupId, title, 'Auto', nowIso, products);

  const meta: DailyBackupMeta = {
    id: backupId,
    dateKey,
    title,
    createdAt: nowIso,
    productCount: products.length,
    type: 'Auto',
    source: storageRes.success && cloudDbRes.success
      ? 'storage+cloud'
      : storageRes.success
      ? 'storage'
      : cloudDbRes.success
      ? 'cloud'
      : 'local',
    csvStoragePath: storageRes.csvStoragePath,
    jsonStoragePath: storageRes.jsonStoragePath,
    csvPublicUrl: storageRes.csvPublicUrl,
    jsonPublicUrl: storageRes.jsonPublicUrl,
    fileSizeBytes: storageRes.fileSizeBytes,
  };

  // 3. Always save local snapshot
  saveLocalBackupSnapshot({ ...meta, source: 'local' }, products);

  if (storageRes.success || cloudDbRes.success) {
    try {
      localStorage.setItem(
        LAST_AUTO_BACKUP_TS_KEY,
        JSON.stringify({
          dateKey,
          count: products.length,
          ts: Date.now(),
          nightlyDone: inNightWindow,
          storageUploaded: storageRes.success,
        })
      );
    } catch {}

    // Prune older nightly backups beyond 30 days in background
    pruneOldDailyBackups(MAX_CLOUD_DAILY_BACKUPS).catch(() => {});
    if (storageRes.success) {
      pruneOldStorageNightlyFiles(MAX_CLOUD_DAILY_BACKUPS).catch(() => {});
    }

    return {
      created: existingCount === null,
      updated: existingCount !== null,
      backupId,
      storageUploaded: storageRes.success,
      needsBucketSetup: storageRes.needsBucketSetup,
      storageError: storageRes.error,
    };
  }

  return {
    created: false,
    updated: false,
    backupId,
    storageUploaded: false,
    needsBucketSetup: storageRes.needsBucketSetup,
    storageError: storageRes.error,
    skippedReason: cloudDbRes.error || storageRes.error,
  };
}

/**
 * Creates an immediate manual backup (.csv + .json files directly in Supabase Storage + Cloud DB + Local)
 */
export async function createManualBackup(
  products: Product[],
  customLabel?: string
): Promise<{
  success: boolean;
  storageUploaded: boolean;
  needsBucketSetup?: boolean;
  meta?: DailyBackupMeta;
  error?: string;
}> {
  if (!Array.isArray(products) || products.length === 0) {
    return {
      success: false,
      storageUploaded: false,
      error: 'Impossible de sauvegarder un catalogue vide.',
    };
  }

  const now = new Date();
  const dateKey = getTodayDateKey();
  const timeTag = `${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`;
  const backupId = `backup_manual_${dateKey}_${timeTag}`;
  const storageBaseName = `backup_livry_${dateKey}_${timeTag}`;
  const nowIso = now.toISOString();
  const title =
    customLabel?.trim() ||
    `Sauvegarde Manuelle - ${dateKey} (${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')})`;

  const [storageRes, cloudRes] = await Promise.all([
    uploadBackupFilesToStorage(STORAGE_MANUAL_FOLDER, storageBaseName, products),
    upsertBackupToCloudDb(backupId, title, 'Manuel', nowIso, products),
  ]);

  const meta: DailyBackupMeta = {
    id: backupId,
    dateKey,
    title,
    createdAt: nowIso,
    productCount: products.length,
    type: 'Manuel',
    source:
      storageRes.success && cloudRes.success
        ? 'storage+cloud'
        : storageRes.success
        ? 'storage'
        : cloudRes.success
        ? 'cloud'
        : 'local',
    csvStoragePath: storageRes.csvStoragePath,
    jsonStoragePath: storageRes.jsonStoragePath,
    csvPublicUrl: storageRes.csvPublicUrl,
    jsonPublicUrl: storageRes.jsonPublicUrl,
    fileSizeBytes: storageRes.fileSizeBytes,
  };

  saveLocalBackupSnapshot({ ...meta, source: 'local' }, products);

  return {
    success: storageRes.success || cloudRes.success,
    storageUploaded: storageRes.success,
    needsBucketSetup: storageRes.needsBucketSetup,
    meta,
    error: !storageRes.success && !cloudRes.success ? cloudRes.error || storageRes.error : storageRes.error,
  };
}

/**
 * Fetches unified list of backups across Supabase Storage files (.csv/.json), Cloud DB, and LocalStorage
 */
export async function fetchDailyBackupsList(): Promise<{
  success: boolean;
  backups: DailyBackupMeta[];
  storageStatus: StorageBucketStatus;
  error?: string;
}> {
  const byId = new Map<string, DailyBackupMeta>();

  // 1. Seed with local backups
  for (const localMeta of getLocalBackupsMeta()) {
    byId.set(localMeta.id, localMeta);
  }

  // 2. Fetch Cloud DB metadata & Supabase Storage files in parallel
  const [cloudListResult, storageListResult] = await Promise.all([
    (async () => {
      try {
        const client = getClient();
        let { data, error } = await client
          .from('tips')
          .select('id, title, author_role, author_name, likes, created_at')
          .eq('category', DAILY_BACKUP_CATEGORY)
          .order('id', { ascending: false })
          .limit(60);

        if (error) {
          const fallback = getFallbackClient();
          const resAlt = await fallback
            .from('tips')
            .select('id, title, author_role, author_name, likes, created_at')
            .eq('category', DAILY_BACKUP_CATEGORY)
            .order('id', { ascending: false })
            .limit(60);
          if (!resAlt.error) {
            data = resAlt.data;
            error = null;
          }
        }
        return !error && Array.isArray(data) ? data : [];
      } catch {
        return [];
      }
    })(),
    listStorageBackupFiles(),
  ]);

  // Merge Cloud DB records
  for (const row of cloudListResult) {
    const id = String(row.id);
    const dateMatch = id.match(/(\d{4}-\d{2}-\d{2})/);
    const dateKey = dateMatch ? dateMatch[1] : getTodayDateKey();
    const type: 'Auto' | 'Manuel' = row.author_role === 'Manuel' ? 'Manuel' : 'Auto';
    const createdAt =
      (row.author_name && !isNaN(Date.parse(row.author_name)) ? row.author_name : null) ||
      row.created_at ||
      new Date().toISOString();

    byId.set(id, {
      id,
      dateKey,
      title: String(row.title || `Sauvegarde ${dateKey}`),
      createdAt,
      productCount: Number(row.likes || 0),
      type,
      source: 'cloud',
    });
  }

  // Merge Supabase Storage files (combining with matching Cloud DB records when present)
  for (const stMeta of storageListResult.filesFound) {
    // Also match manual backup IDs by date+time suffix if present
    let matchKey = stMeta.id;
    if (!byId.has(matchKey) && stMeta.type === 'Manuel') {
      const m = stMeta.id.match(/(\d{4}-\d{2}-\d{2}_\d{6})/);
      if (m && byId.has(`backup_manual_${m[1]}`)) {
        matchKey = `backup_manual_${m[1]}`;
      }
    }

    const existing = byId.get(matchKey);
    if (existing) {
      byId.set(matchKey, {
        ...existing,
        source: existing.source === 'cloud' ? 'storage+cloud' : 'storage',
        csvStoragePath: stMeta.csvStoragePath || existing.csvStoragePath,
        jsonStoragePath: stMeta.jsonStoragePath || existing.jsonStoragePath,
        csvPublicUrl: stMeta.csvPublicUrl || existing.csvPublicUrl,
        jsonPublicUrl: stMeta.jsonPublicUrl || existing.jsonPublicUrl,
        fileSizeBytes: stMeta.fileSizeBytes || existing.fileSizeBytes,
      });
    } else {
      byId.set(stMeta.id, stMeta);
    }
  }

  const list = Array.from(byId.values()).sort((a, b) => {
    const tA = new Date(a.createdAt).getTime() || 0;
    const tB = new Date(b.createdAt).getTime() || 0;
    return tB - tA;
  });

  const cachedStatus = getCachedStorageBucketStatus();
  const storageStatus: StorageBucketStatus = storageListResult.totalFiles > 0
    ? {
        ready: true,
        bucketName: SUPABASE_STORAGE_BUCKET,
        fileCount: storageListResult.totalFiles,
        needsSetup: false,
        lastUploadedAt: cachedStatus?.lastUploadedAt,
      }
    : cachedStatus || {
        ready: false,
        bucketName: SUPABASE_STORAGE_BUCKET,
        fileCount: 0,
        needsSetup: true,
      };

  return { success: true, backups: list, storageStatus };
}

/**
 * Loads the full Product[] array for a specific backup (Supabase Storage JSON/CSV → Cloud DB → Local)
 */
export async function fetchBackupProductsById(
  backupId: string,
  meta?: DailyBackupMeta
): Promise<{ success: boolean; products: Product[]; error?: string }> {
  if (backupId === EMERGENCY_BACKUP_KEY) {
    try {
      const raw = localStorage.getItem(EMERGENCY_BACKUP_KEY);
      if (raw) {
        const arr = JSON.parse(raw);
        if (Array.isArray(arr) && arr.length > 0) {
          return { success: true, products: arr };
        }
      }
      return { success: false, products: [], error: "Sauvegarde d'urgence introuvable." };
    } catch (err: any) {
      return { success: false, products: [], error: err?.message || 'Erreur lecture locale' };
    }
  }

  // 1. Try Supabase Storage JSON file first (exact lossless snapshot)
  if (meta?.jsonStoragePath) {
    try {
      const { data, error } = await supabasePublic.storage
        .from(SUPABASE_STORAGE_BUCKET)
        .download(meta.jsonStoragePath);
      if (!error && data) {
        const text = await data.text();
        const parsed = JSON.parse(text);
        const list = Array.isArray(parsed) ? parsed : parsed?.products;
        if (Array.isArray(list) && list.length > 0) {
          return { success: true, products: list };
        }
      }
    } catch (err) {
      console.warn('[DailyBackup] Storage JSON download fallback:', err);
    }
  }

  // 2. Try Supabase Storage CSV file if JSON wasn't present
  if (meta?.csvStoragePath) {
    try {
      const { data, error } = await supabasePublic.storage
        .from(SUPABASE_STORAGE_BUCKET)
        .download(meta.csvStoragePath);
      if (!error && data) {
        const csvText = (await data.text()).replace(/^\uFEFF/, '');
        const parsed = parseProductsFromCsv(csvText);
        if (!parsed.error && parsed.products.length > 0) {
          return { success: true, products: parsed.products };
        }
      }
    } catch (err) {
      console.warn('[DailyBackup] Storage CSV download fallback:', err);
    }
  }

  // 3. Try Cloud DB backup row
  try {
    const client = getClient();
    let { data, error } = await client
      .from('tips')
      .select('content')
      .eq('id', backupId)
      .maybeSingle();

    if (error || !data) {
      const fallback = getFallbackClient();
      const resAlt = await fallback
        .from('tips')
        .select('content')
        .eq('id', backupId)
        .maybeSingle();
      if (!resAlt.error && resAlt.data) {
        data = resAlt.data;
        error = null;
      }
    }

    if (!error && data && data.content) {
      const parsed = JSON.parse(data.content);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return { success: true, products: parsed };
      }
    }
  } catch (err) {
    console.warn('[DailyBackup] Cloud DB payload fetch failed, trying local fallback:', err);
  }

  // 4. Local fallback
  try {
    const localRaw = localStorage.getItem(`${LOCAL_BACKUP_PREFIX}${backupId}`);
    if (localRaw) {
      const parsed = JSON.parse(localRaw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return { success: true, products: parsed };
      }
    }
  } catch {}

  return {
    success: false,
    products: [],
    error: 'Impossible de charger les données de cette sauvegarde.',
  };
}

/**
 * Restores a backup directly into Supabase products table
 */
export async function restoreBackupProductsToSupabase(
  products: Product[],
  onProgress?: (processed: number, total: number) => void
): Promise<{ success: boolean; count: number; error?: string }> {
  if (!Array.isArray(products) || products.length === 0) {
    return { success: false, count: 0, error: 'Sauvegarde vide.' };
  }

  const delRes = await deleteAllProductsFromSupabase();
  if (!delRes.success) {
    console.warn('[DailyBackup] Warning while clearing old rows before restore:', delRes.error);
  }

  return await seedProductsToSupabase(products, onProgress);
}

/**
 * Deletes a backup from Supabase Storage, Cloud DB, and LocalStorage
 */
export async function deleteBackupById(
  backupId: string,
  meta?: DailyBackupMeta
): Promise<{ success: boolean; error?: string }> {
  try {
    if (typeof localStorage !== 'undefined') {
      if (backupId === EMERGENCY_BACKUP_KEY) {
        localStorage.removeItem(EMERGENCY_BACKUP_KEY);
        return { success: true };
      }
      localStorage.removeItem(`${LOCAL_BACKUP_PREFIX}${backupId}`);
      const rawMeta = localStorage.getItem(LOCAL_BACKUPS_META_KEY);
      if (rawMeta) {
        const metas = JSON.parse(rawMeta);
        if (Array.isArray(metas)) {
          localStorage.setItem(
            LOCAL_BACKUPS_META_KEY,
            JSON.stringify(metas.filter((m: DailyBackupMeta) => m.id !== backupId))
          );
        }
      }
    }

    // Remove Storage files if present
    const pathsToRemove: string[] = [];
    if (meta?.csvStoragePath) pathsToRemove.push(meta.csvStoragePath);
    if (meta?.jsonStoragePath) pathsToRemove.push(meta.jsonStoragePath);
    if (pathsToRemove.length > 0) {
      await supabasePublic.storage
        .from(SUPABASE_STORAGE_BUCKET)
        .remove(pathsToRemove)
        .catch(() => {});
    }

    // Remove Cloud DB mirror if present
    const client = getClient();
    const { error } = await client.from('tips').delete().eq('id', backupId);
    if (error) {
      const fallback = getFallbackClient();
      await fallback.from('tips').delete().eq('id', backupId);
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Erreur suppression' };
  }
}

/**
 * Keeps only the most recent N automatic daily backups in Cloud DB
 */
async function pruneOldDailyBackups(keepCount: number): Promise<void> {
  try {
    const client = getClient();
    const { data, error } = await client
      .from('tips')
      .select('id')
      .eq('category', DAILY_BACKUP_CATEGORY)
      .eq('author_role', 'Auto')
      .order('id', { ascending: false });

    if (error || !Array.isArray(data) || data.length <= keepCount) return;

    const toDelete = data.slice(keepCount).map((row: any) => String(row.id));
    if (toDelete.length > 0) {
      await client.from('tips').delete().in('id', toDelete);
    }
  } catch {}
}

/**
 * Keeps only the most recent N nightly days of files in Supabase Storage ("backups/nightly/")
 */
async function pruneOldStorageNightlyFiles(keepDays: number): Promise<void> {
  try {
    const { data, error } = await supabasePublic.storage
      .from(SUPABASE_STORAGE_BUCKET)
      .list(STORAGE_NIGHTLY_FOLDER, {
        limit: 200,
        sortBy: { column: 'name', order: 'desc' },
      });

    if (error || !Array.isArray(data)) return;

    // Group by YYYY-MM-DD so both .csv and .json of the same night are kept/pruned together
    const dateGroups = new Map<string, string[]>();
    for (const item of data) {
      if (!item?.name) continue;
      const m = item.name.match(/(\d{4}-\d{2}-\d{2})/);
      if (!m) continue;
      const d = m[1];
      const arr = dateGroups.get(d) || [];
      arr.push(`${STORAGE_NIGHTLY_FOLDER}/${item.name}`);
      dateGroups.set(d, arr);
    }

    const sortedDates = Array.from(dateGroups.keys()).sort((a, b) => b.localeCompare(a));
    if (sortedDates.length <= keepDays) return;

    const pathsToDelete: string[] = [];
    for (const oldDate of sortedDates.slice(keepDays)) {
      const files = dateGroups.get(oldDate);
      if (files) pathsToDelete.push(...files);
    }

    if (pathsToDelete.length > 0) {
      await supabasePublic.storage
        .from(SUPABASE_STORAGE_BUCKET)
        .remove(pathsToDelete);
    }
  } catch {}
}

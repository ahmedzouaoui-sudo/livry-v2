import {
  supabase,
  supabaseApi,
  supabasePublic,
  activeSchema,
  setActiveSchema,
  SUPABASE_URL,
} from './supabaseClient';
import { Product, TipPost, TipArticleBlock, Department } from '../types';
import { extractPureUnit } from '../utils/productWeight';
import { sanitizeImageUrl } from '../utils/securityUtils';

export interface SupabaseHealthCheckResult {
  connected: boolean;
  tableExists: boolean;
  productCount: number;
  message: string;
  schema: 'api' | 'public';
}

const CORE_TABLES_SQL_BODY = `
-- 1. Exposer 'public' et 'api' dans PostgREST
CREATE SCHEMA IF NOT EXISTS api;
ALTER ROLE authenticator SET pgrst.db_schemas = 'public, api, graphql_public';
NOTIFY pgrst, 'reload config';

-- -------------------------------------------------------------------------
-- 2. TABLE PRODUITS (PUBLIC + API) — 12 COLONNES + STATUT + UNITÉ
-- -------------------------------------------------------------------------
CREATE SEQUENCE IF NOT EXISTS public.products_id_seq;
CREATE TABLE IF NOT EXISTS public.products (
  id BIGINT PRIMARY KEY DEFAULT nextval('public.products_id_seq'),
  code TEXT DEFAULT '-',
  produit TEXT NOT NULL,
  marjane TEXT DEFAULT '0',
  "marjane 2" TEXT DEFAULT '0',
  "marjane Interne" TEXT DEFAULT '0',
  "marjane mini" TEXT DEFAULT '0',
  "marjane sec" TEXT DEFAULT '0',
  "marjane sec 2" TEXT DEFAULT '0',
  image_html TEXT DEFAULT '',
  "département" TEXT NOT NULL DEFAULT 'Fruits et légumes',
  "catégorie" TEXT DEFAULT 'Fruits',
  quantite TEXT DEFAULT 'pièce',
  is_enabled BOOLEAN DEFAULT true,
  is_verified_100 BOOLEAN DEFAULT false,
  verification_status TEXT DEFAULT 'none',
  worker_number TEXT DEFAULT 'SHARED',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.products ALTER COLUMN id SET DEFAULT nextval('public.products_id_seq');
ALTER SEQUENCE public.products_id_seq OWNED BY public.products.id;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS quantite TEXT DEFAULT 'pièce';
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS worker_number TEXT DEFAULT 'SHARED';
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS is_verified_100 BOOLEAN DEFAULT false;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS verification_status TEXT DEFAULT 'none';
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "products_all_access" ON public.products;
CREATE POLICY "products_all_access" ON public.products FOR ALL USING (true) WITH CHECK (true);

CREATE SEQUENCE IF NOT EXISTS api.products_id_seq;
CREATE TABLE IF NOT EXISTS api.products (
  id BIGINT PRIMARY KEY DEFAULT nextval('api.products_id_seq'),
  code TEXT DEFAULT '-',
  produit TEXT NOT NULL,
  marjane TEXT DEFAULT '0',
  "marjane 2" TEXT DEFAULT '0',
  "marjane Interne" TEXT DEFAULT '0',
  "marjane mini" TEXT DEFAULT '0',
  "marjane sec" TEXT DEFAULT '0',
  "marjane sec 2" TEXT DEFAULT '0',
  image_html TEXT DEFAULT '',
  "département" TEXT NOT NULL DEFAULT 'Fruits et légumes',
  "catégorie" TEXT DEFAULT 'Fruits',
  quantite TEXT DEFAULT 'pièce',
  is_enabled BOOLEAN DEFAULT true,
  is_verified_100 BOOLEAN DEFAULT false,
  verification_status TEXT DEFAULT 'none',
  worker_number TEXT DEFAULT 'SHARED',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE api.products ALTER COLUMN id SET DEFAULT nextval('api.products_id_seq');
ALTER SEQUENCE api.products_id_seq OWNED BY api.products.id;
ALTER TABLE api.products ADD COLUMN IF NOT EXISTS quantite TEXT DEFAULT 'pièce';
ALTER TABLE api.products ADD COLUMN IF NOT EXISTS worker_number TEXT DEFAULT 'SHARED';
ALTER TABLE api.products ADD COLUMN IF NOT EXISTS is_verified_100 BOOLEAN DEFAULT false;
ALTER TABLE api.products ADD COLUMN IF NOT EXISTS verification_status TEXT DEFAULT 'none';
ALTER TABLE api.products ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

ALTER TABLE api.products ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "api_products_all_access" ON api.products;
CREATE POLICY "api_products_all_access" ON api.products FOR ALL USING (true) WITH CHECK (true);

-- -------------------------------------------------------------------------
-- 3. TIPS, GUIDE, CONFIG SÉCURITÉ & BACKUPS CLOUD DB (PUBLIC + API)
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.tips (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT NOT NULL,
  author_role TEXT DEFAULT 'Pickeur',
  author_name TEXT DEFAULT '',
  created_at TEXT DEFAULT '',
  likes INT DEFAULT 0,
  image_url TEXT DEFAULT '',
  target_audience TEXT DEFAULT 'Tous'
);
ALTER TABLE public.tips ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tips_all_access" ON public.tips;
CREATE POLICY "tips_all_access" ON public.tips FOR ALL USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS api.tips (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT NOT NULL,
  author_role TEXT DEFAULT 'Pickeur',
  author_name TEXT DEFAULT '',
  created_at TEXT DEFAULT '',
  likes INT DEFAULT 0,
  image_url TEXT DEFAULT '',
  target_audience TEXT DEFAULT 'Tous'
);
ALTER TABLE api.tips ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "api_tips_all_access" ON api.tips;
CREATE POLICY "api_tips_all_access" ON api.tips FOR ALL USING (true) WITH CHECK (true);

-- -------------------------------------------------------------------------
-- 3B. TABLE DÉDIÉE AUX ASTUCES & ARTICLES (PUBLIC + API)
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.astuces (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  blocks_json JSONB DEFAULT '[]'::jsonb,
  category TEXT NOT NULL DEFAULT 'Général',
  author_role TEXT DEFAULT 'Pickeur',
  author_name TEXT DEFAULT '',
  created_at TEXT DEFAULT '',
  likes INT DEFAULT 0,
  image_url TEXT DEFAULT '',
  target_audience TEXT DEFAULT 'Tous',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.astuces ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "astuces_all_access" ON public.astuces;
CREATE POLICY "astuces_all_access" ON public.astuces FOR ALL USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS api.astuces (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  blocks_json JSONB DEFAULT '[]'::jsonb,
  category TEXT NOT NULL DEFAULT 'Général',
  author_role TEXT DEFAULT 'Pickeur',
  author_name TEXT DEFAULT '',
  created_at TEXT DEFAULT '',
  likes INT DEFAULT 0,
  image_url TEXT DEFAULT '',
  target_audience TEXT DEFAULT 'Tous',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE api.astuces ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "api_astuces_all_access" ON api.astuces;
CREATE POLICY "api_astuces_all_access" ON api.astuces FOR ALL USING (true) WITH CHECK (true);

-- -------------------------------------------------------------------------
-- 4. VOTES DE CODES-BARRES (PUBLIC + API)
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.barcode_votes (
  barcode TEXT NOT NULL,
  worker_number TEXT NOT NULL,
  vote_type TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (barcode, worker_number)
);
ALTER TABLE public.barcode_votes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "barcode_votes_all_access" ON public.barcode_votes;
CREATE POLICY "barcode_votes_all_access" ON public.barcode_votes FOR ALL USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS api.barcode_votes (
  barcode TEXT NOT NULL,
  worker_number TEXT NOT NULL,
  vote_type TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (barcode, worker_number)
);
ALTER TABLE api.barcode_votes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "api_barcode_votes_all_access" ON api.barcode_votes;
CREATE POLICY "api_barcode_votes_all_access" ON api.barcode_votes FOR ALL USING (true) WITH CHECK (true);

-- -------------------------------------------------------------------------
-- 5. TÉLÉPHONES / APPAREILS CONNECTÉS (PUBLIC + API)
-- -------------------------------------------------------------------------
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
ALTER TABLE public.user_devices ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "user_devices_all_access" ON public.user_devices;
CREATE POLICY "user_devices_all_access" ON public.user_devices FOR ALL USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS api.user_devices (
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
ALTER TABLE api.user_devices ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "api_user_devices_all_access" ON api.user_devices;
CREATE POLICY "api_user_devices_all_access" ON api.user_devices FOR ALL USING (true) WITH CHECK (true);

-- -------------------------------------------------------------------------
-- 6. JOURNAL COMPLET D'ACTIVITÉ (AUDIT LOGS - PUBLIC + API)
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.app_activity_logs (
  id TEXT PRIMARY KEY,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  local_date_time TEXT,
  category TEXT NOT NULL,
  action TEXT NOT NULL,
  actor_role TEXT DEFAULT 'Pickeur',
  device_id TEXT,
  ip_address TEXT,
  target TEXT,
  details TEXT
);
ALTER TABLE public.app_activity_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "app_activity_logs_all_access" ON public.app_activity_logs;
CREATE POLICY "app_activity_logs_all_access" ON public.app_activity_logs FOR ALL USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS api.app_activity_logs (
  id TEXT PRIMARY KEY,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  local_date_time TEXT,
  category TEXT NOT NULL,
  action TEXT NOT NULL,
  actor_role TEXT DEFAULT 'Pickeur',
  device_id TEXT,
  ip_address TEXT,
  target TEXT,
  details TEXT
);
ALTER TABLE api.app_activity_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "api_app_activity_logs_all_access" ON api.app_activity_logs;
CREATE POLICY "api_app_activity_logs_all_access" ON api.app_activity_logs FOR ALL USING (true) WITH CHECK (true);

-- -------------------------------------------------------------------------
-- 7. DROITS D'ACCÈS (GRANTS) PUBLIC & API
-- -------------------------------------------------------------------------
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;

GRANT USAGE ON SCHEMA api TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA api TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA api TO anon, authenticated, service_role;

-- -------------------------------------------------------------------------
-- 8. SUPABASE STORAGE BUCKET 'backups' (.CSV & .JSON AUTOMATIQUES)
-- -------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public)
VALUES ('backups', 'backups', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "backups_public_select" ON storage.objects;
DROP POLICY IF EXISTS "backups_public_insert" ON storage.objects;
DROP POLICY IF EXISTS "backups_public_update" ON storage.objects;
DROP POLICY IF EXISTS "backups_public_delete" ON storage.objects;

CREATE POLICY "backups_public_select" ON storage.objects FOR SELECT USING (bucket_id = 'backups');
CREATE POLICY "backups_public_insert" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'backups');
CREATE POLICY "backups_public_update" ON storage.objects FOR UPDATE USING (bucket_id = 'backups') WITH CHECK (bucket_id = 'backups');
CREATE POLICY "backups_public_delete" ON storage.objects FOR DELETE USING (bucket_id = 'backups');

-- -------------------------------------------------------------------------
-- 9. SYNCHRONISATION REALTIME & RECHARGEMENT SCHÉMA POSTGREST
-- -------------------------------------------------------------------------
DO $$
BEGIN
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.products; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE api.products; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.tips; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE api.tips; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.astuces; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE api.astuces; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.barcode_votes; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE api.barcode_votes; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.user_devices; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE api.user_devices; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.app_activity_logs; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE api.app_activity_logs; EXCEPTION WHEN OTHERS THEN NULL; END;
END $$;

NOTIFY pgrst, 'reload schema';
`;

export const SUPABASE_SETUP_SQL = `-- =========================================================================
-- MISE À JOUR DOUCE SUPABASE (NE SUPPRIME AUCUNE DONNÉE EXISTANTE)
-- À copier dans : Supabase Dashboard -> SQL Editor -> Run
-- =========================================================================
${CORE_TABLES_SQL_BODY}`;

export const SUPABASE_RESET_RECREATE_SQL = `-- =========================================================================
-- RÉINITIALISATION PROPRE DES TABLES SUPABASE (DROP + RECREATE COMPLET)
-- ⚠️ Supprime les anciennes tables cassées dans 'public' et 'api' puis recrée
--    toutes les tables propres (products, tips, votes, devices, logs, storage)
-- ⚠️ Astuce : Faites d'abord "Exporter CSV" ou vérifiez vos Backups avant Run !
-- =========================================================================

DROP TABLE IF EXISTS public.products CASCADE;
DROP TABLE IF EXISTS public.tips CASCADE;
DROP TABLE IF EXISTS public.astuces CASCADE;
DROP TABLE IF EXISTS public.barcode_votes CASCADE;
DROP TABLE IF EXISTS public.user_devices CASCADE;
DROP TABLE IF EXISTS public.app_activity_logs CASCADE;
DROP TABLE IF EXISTS public.villes CASCADE;
DROP TABLE IF EXISTS public.entrepots CASCADE;
DROP TABLE IF EXISTS public.workers CASCADE;
DROP TABLE IF EXISTS public.weekly_schedules CASCADE;
DROP TABLE IF EXISTS public.planification_rows CASCADE;
DROP SEQUENCE IF EXISTS public.products_id_seq CASCADE;

DROP TABLE IF EXISTS api.products CASCADE;
DROP TABLE IF EXISTS api.tips CASCADE;
DROP TABLE IF EXISTS api.astuces CASCADE;
DROP TABLE IF EXISTS api.barcode_votes CASCADE;
DROP TABLE IF EXISTS api.user_devices CASCADE;
DROP TABLE IF EXISTS api.app_activity_logs CASCADE;
DROP TABLE IF EXISTS api.workers CASCADE;
DROP SEQUENCE IF EXISTS api.products_id_seq CASCADE;

${CORE_TABLES_SQL_BODY}`;

export const SUPABASE_ASTUCES_TABLE_SQL = `-- =========================================================================
-- TABLE DÉDIÉE AUX ASTUCES & ARTICLES (public.astuces + api.astuces)
-- Exécutez ce script dans : Supabase Dashboard -> SQL Editor -> Run
-- =========================================================================

CREATE TABLE IF NOT EXISTS public.astuces (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  blocks_json JSONB DEFAULT '[]'::jsonb,
  category TEXT NOT NULL DEFAULT 'Général',
  author_role TEXT DEFAULT 'Pickeur',
  author_name TEXT DEFAULT '',
  created_at TEXT DEFAULT '',
  likes INT DEFAULT 0,
  image_url TEXT DEFAULT '',
  target_audience TEXT DEFAULT 'Tous',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.astuces ADD COLUMN IF NOT EXISTS blocks_json JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.astuces ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.astuces ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "astuces_all_access" ON public.astuces;
CREATE POLICY "astuces_all_access" ON public.astuces FOR ALL USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS api.astuces (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  blocks_json JSONB DEFAULT '[]'::jsonb,
  category TEXT NOT NULL DEFAULT 'Général',
  author_role TEXT DEFAULT 'Pickeur',
  author_name TEXT DEFAULT '',
  created_at TEXT DEFAULT '',
  likes INT DEFAULT 0,
  image_url TEXT DEFAULT '',
  target_audience TEXT DEFAULT 'Tous',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE api.astuces ADD COLUMN IF NOT EXISTS blocks_json JSONB DEFAULT '[]'::jsonb;
ALTER TABLE api.astuces ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE api.astuces ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "api_astuces_all_access" ON api.astuces;
CREATE POLICY "api_astuces_all_access" ON api.astuces FOR ALL USING (true) WITH CHECK (true);

GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.astuces TO anon, authenticated, service_role;
GRANT USAGE ON SCHEMA api TO anon, authenticated, service_role;
GRANT ALL ON TABLE api.astuces TO anon, authenticated, service_role;

DO $$
BEGIN
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.astuces; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE api.astuces; EXCEPTION WHEN OTHERS THEN NULL; END;
END $$;

NOTIFY pgrst, 'reload schema';`;

// Helper: map internal Department name to Database standard value
export function departmentToDbValue(dept: Department): string {
  switch (dept) {
    case 'Fruits et légumes':
      return 'MARCHE';
    case 'Fromage et charcuterie':
      return 'STAND';
    case 'Boucherie et volaille':
      return 'BOUCHERIE';
    case 'Boulangerie et pâtisserie':
      return 'BOULANGERIE';
    default:
      return 'BOUCHERIE';
  }
}

// Helper: normalize department to one of the 4 strict types with full Marjane (STAND, MARCHE, BOUCHERIE, BOULANGERIE) support
export function normalizeDepartment(deptRaw?: any, catRaw?: any): Department {
  const s = String(deptRaw || '').toLowerCase().trim();
  const c = String(catRaw || '').toLowerCase().trim();

  // 1. Fruits & Légumes (Marché Frais)
  if (
    s === 'marche' ||
    s === 'marché' ||
    s.includes('fruit') ||
    s.includes('legume') ||
    s.includes('légume') ||
    s.includes('primeur') ||
    s.includes('f&l') ||
    c.includes('fruit') ||
    c.includes('legume') ||
    c.includes('salade')
  ) {
    return 'Fruits et légumes';
  }

  // 2. Fromage & Charcuterie (Stand Coupe)
  if (
    s === 'stand' ||
    s.includes('fromag') ||
    s.includes('charcut') ||
    s.includes('cremerie') ||
    s.includes('crèmerie') ||
    s.includes('lait') ||
    c.includes('fromag') ||
    c.includes('charcut')
  ) {
    return 'Fromage et charcuterie';
  }

  // 3. Boulangerie & Pâtisserie
  if (
    s === 'boulangerie' ||
    s.includes('boulang') ||
    s.includes('patiss') ||
    s.includes('pâtiss') ||
    s.includes('pain') ||
    s.includes('viennois') ||
    c.includes('pain') ||
    c.includes('viennois') ||
    c.includes('patiss')
  ) {
    return 'Boulangerie et pâtisserie';
  }

  // 4. Boucherie & Volaille
  if (
    s === 'boucherie' ||
    s.includes('bouch') ||
    s.includes('volail') ||
    s.includes('viande') ||
    s.includes('poulet') ||
    s.includes('bœuf') ||
    s.includes('boeuf') ||
    c.includes('viande') ||
    c.includes('volail')
  ) {
    return 'Boucherie et volaille';
  }

  return 'Boucherie et volaille';
}

// Helper: clean and extract a valid URL link from any input (HTML, quotes, plain URL)
export function cleanImageUrl(urlRaw: any): string | undefined {
  return sanitizeImageUrl(urlRaw);
}

// Helper: map Supabase row to Product (accepts all variations of column names from sites and apps)
export function mapRowToProduct(row: any): Product {
  const marjane = String(row.marjane ?? row.barcode_marjane ?? row.barcode ?? '');
  const marjane2 = String(
    row['marjane 2'] ??
    row.marjane_2 ??
    row.marjane2 ??
    row.barcode_p2 ??
    row.barcode_2 ??
    ''
  );
  const marjaneInterne = String(
    row['marjane Interne'] ??
    row.marjane_interne ??
    row.marjaneInterne ??
    row.barcode_mj_valide ??
    row.barcode_interne ??
    ''
  );
  const marjaneMini = String(
    row['marjane mini'] ??
    row.marjane_mini ??
    row.marjanemini ??
    row.barcode_mini_secours ??
    ''
  );
  const marjaneSec = String(
    row['marjane sec'] ??
    row.marjane_sec ??
    row.marjanesec ??
    row.barcode_secours ??
    ''
  );
  const marjaneSec2 = String(
    row['marjane sec 2'] ??
    row.marjane_sec_2 ??
    row.marjanesec2 ??
    row.barcode_p3 ??
    ''
  );
  const idNum = row.id != null && !isNaN(Number(row.id)) ? Number(row.id) : Date.now();
  const codeVal = String(row.code ?? row.ref ?? row.reference ?? '-').trim() || '-';
  const nameVal = String(
    row.produit ??
    row.name ??
    row.nom ??
    row.designation ??
    row.libelle ??
    'Produit sans nom'
  ).trim();

  const deptRaw =
    row['département'] ??
    row.département ??
    row.departement ??
    row.department ??
    row.rayon ??
    row.secteur;

  const catVal = String(
    row['catégorie'] ??
    row.catégorie ??
    row.categorie ??
    row.category ??
    'Général'
  ).trim() || 'Général';

  const finalImageUrl = cleanImageUrl(row.image_html ?? row.image_url ?? row.image ?? row.imageUrl);
  const pureUnit = extractPureUnit(row.quantite ?? row.quantité ?? row.unit ?? row.unite ?? nameVal);

  const workerTag = String(row.worker_number ?? '').trim();
  const has100 = Boolean(
    row.is_verified_100 === true ||
    row.isVerified100 === true ||
    workerTag.includes('VERIFIED_100')
  );
  const has50 = !has100 && Boolean(
    row.is_verified_50 === true ||
    row.isVerified50 === true ||
    workerTag.includes('VERIFIED_50')
  );
  const hasBroken = !has100 && !has50 && Boolean(
    row.is_verified_broken === true ||
    row.isVerifiedBroken === true ||
    workerTag.includes('VERIFIED_BROKEN')
  );
  const verificationStatus: 'none' | 'broken' | '50' | '100' =
    row.verification_status === '100' ||
    row.verification_status === '50' ||
    row.verification_status === 'broken'
      ? row.verification_status
      : has100
        ? '100'
        : has50
          ? '50'
          : hasBroken
            ? 'broken'
            : 'none';
  const isVerified100 = verificationStatus === '100';
  const codeDisabled = Boolean(
    row.code_disabled === true ||
      row.codeDisabled === true ||
      workerTag.includes('CODE_DISABLED')
  );

  return {
    id: idNum,
    code: codeVal,
    name: nameVal,
    department: normalizeDepartment(deptRaw, catVal),
    category: catVal,
    quantite: pureUnit,
    barcodeMarjane: marjane && marjane !== '-' && marjane !== '0' ? marjane : undefined,
    barcodeP2: marjane2 && marjane2 !== '-' && marjane2 !== '0' ? marjane2 : undefined,
    barcodeInterne: marjaneInterne && marjaneInterne !== '-' && marjaneInterne !== '0' ? marjaneInterne : undefined,
    barcodeMiniSecours: marjaneMini && marjaneMini !== '-' && marjaneMini !== '0' ? marjaneMini : undefined,
    barcodeSecours: marjaneSec && marjaneSec !== '-' && marjaneSec !== '0' ? marjaneSec : undefined,
    barcodeP3: marjaneSec2 && marjaneSec2 !== '-' && marjaneSec2 !== '0' ? marjaneSec2 : undefined,
    imageUrl: finalImageUrl,
    isEnabled: row.is_enabled ?? row.isEnabled ?? true,
    isVerified100,
    verificationStatus,
    barcodeMjValide: marjane && marjane !== '-' && marjane !== '0' ? marjane : undefined,
    codeDisabled,
  };
}

// Helper: map Product to Supabase row format
export function mapProductToRow(p: Product) {
  const dbDept = departmentToDbValue(p.department);
  const pureUnit = p.quantite || extractPureUnit(p.name);
  const primaryMarjane = p.barcodeMarjane || p.barcodeMjValide || '0';
  const vStatus: 'none' | 'broken' | '50' | '100' =
    p.verificationStatus === '100' ||
    p.verificationStatus === '50' ||
    p.verificationStatus === 'broken' ||
    p.verificationStatus === 'none'
      ? p.verificationStatus
      : p.isVerified100
        ? '100'
        : 'none';

  const baseWorkerTag =
    vStatus === '100'
      ? 'SHARED|VERIFIED_100'
      : vStatus === '50'
        ? 'SHARED|VERIFIED_50'
        : vStatus === 'broken'
          ? 'SHARED|VERIFIED_BROKEN'
          : 'SHARED';

  return {
    id: p.id,
    code: p.code || '',
    produit: p.name || '',
    marjane: primaryMarjane,
    'marjane 2': p.barcodeP2 || '0',
    'marjane Interne': p.barcodeInterne || '0',
    'marjane mini': p.barcodeMiniSecours || '0',
    'marjane sec': p.barcodeSecours || '0',
    'marjane sec 2': p.barcodeP3 || '0',
    image_html: sanitizeImageUrl(p.imageUrl) || '',
    'département': dbDept,
    'catégorie': p.category || '',
    quantite: pureUnit,
    is_enabled: p.isEnabled ?? true,
    is_verified_100: vStatus === '100',
    verification_status: vStatus,
    worker_number: p.codeDisabled ? `${baseWorkerTag}|CODE_DISABLED` : baseWorkerTag,
    updated_at: new Date().toISOString(),
  };
}

function isMissingColumnError(err: any): boolean {
  const msg = String(err?.message || '').toLowerCase();
  const code = String(err?.code || '');
  return (
    code === 'PGRST204' ||
    code === '42703' ||
    msg.includes('could not find the') ||
    msg.includes('column') && msg.includes('does not exist')
  );
}

function stripExtendedProductColumns(row: Record<string, any>) {
  const {
    is_verified_100: _v1,
    verification_status: _v2,
    ...withoutVerifyCols
  } = row;
  return withoutVerifyCols;
}

function stripAllOptionalProductColumns(row: Record<string, any>) {
  const {
    is_verified_100: _v1,
    verification_status: _v2,
    quantite: _q,
    worker_number: _w,
    ...coreRow
  } = row;
  return coreRow;
}

// Check Supabase connection and table status across both 'public' and 'api' schemas
export async function checkSupabaseHealth(): Promise<SupabaseHealthCheckResult> {
  try {
    // Check both schemas in parallel to find where the products are
    const [pubResult, apiResult] = await Promise.allSettled([
      supabasePublic.from('products').select('id', { count: 'exact' }).limit(1),
      supabaseApi.from('products').select('id', { count: 'exact' }).limit(1),
    ]);

    const resPub = pubResult.status === 'fulfilled' ? pubResult.value : null;
    const resApi = apiResult.status === 'fulfilled' ? apiResult.value : null;

    const countPub = resPub && !resPub.error ? (resPub.count ?? 0) : null;
    const countApi = resApi && !resApi.error ? (resApi.count ?? 0) : null;

    // 1. If public has products (e.g. 543 products), use public!
    if (countPub !== null && countPub > 0) {
      setActiveSchema('public');
      return {
        connected: true,
        tableExists: true,
        productCount: countPub,
        message: `Connecté à Supabase (Schéma: public - ${countPub} produits).`,
        schema: 'public',
      };
    }

    // 2. If api has products, use api!
    if (countApi !== null && countApi > 0) {
      setActiveSchema('api');
      return {
        connected: true,
        tableExists: true,
        productCount: countApi,
        message: `Connecté à Supabase (Schéma: api - ${countApi} produits).`,
        schema: 'api',
      };
    }

    // 3. If public table exists without error (even if 0 products)
    if (countPub !== null) {
      setActiveSchema('public');
      return {
        connected: true,
        tableExists: true,
        productCount: 0,
        message: `Connecté à Supabase (Schéma: public - 0 produit).`,
        schema: 'public',
      };
    }

    // 4. If api table exists without error
    if (countApi !== null) {
      setActiveSchema('api');
      return {
        connected: true,
        tableExists: true,
        productCount: 0,
        message: `Connecté à Supabase (Schéma: api - 0 produit).`,
        schema: 'api',
      };
    }

    // Check if table missing error or schema error
    const errorPub = resPub?.error;
    const errorApi = resApi?.error;

    const isMissing =
      errorPub?.code === 'PGRST205' ||
      errorPub?.code === '42P01' ||
      errorApi?.code === 'PGRST205' ||
      errorApi?.code === '42P01' ||
      errorPub?.message?.includes('Could not find the table') ||
      errorApi?.message?.includes('Could not find the table');

    const isSchemaError = errorPub?.code === 'PGRST106' || errorApi?.code === 'PGRST106';

    if (isMissing || isSchemaError) {
      return {
        connected: true,
        tableExists: false,
        productCount: 0,
        message: "Base Supabase connectée ! La table 'products' doit être initialisée via le script SQL.",
        schema: 'public',
      };
    }

    return {
      connected: false,
      tableExists: false,
      productCount: 0,
      message: errorPub?.message || errorApi?.message || 'Erreur de connexion Supabase',
      schema: 'public',
    };
  } catch (err: any) {
    return {
      connected: false,
      tableExists: false,
      productCount: 0,
      message: err.message || 'Impossible de joindre Supabase',
      schema: 'public',
    };
  }
}

// Fetch all products from Supabase (catalog shared across all users: Pickeur, Livreur, Admin)
export async function fetchProductsFromSupabase(): Promise<{
  success: boolean;
  products: Product[];
  count: number;
  error?: string;
  tableMissing?: boolean;
}> {
  try {
    // Prioritize public client, fallback to api client if public fails or is empty while api has items
    const primaryClient = activeSchema === 'public' ? supabasePublic : supabaseApi;
    const secondaryClient = activeSchema === 'public' ? supabaseApi : supabasePublic;
    const secondarySchema = activeSchema === 'public' ? 'api' : 'public';

    const { data: primaryData, count: primaryCount, error: primaryError } = await primaryClient
      .from('products')
      .select('*', { count: 'exact' })
      .order('id', { ascending: true })
      .limit(5000);

    if (!primaryError && primaryData && primaryData.length > 0) {
      const mapped = primaryData.map(mapRowToProduct);
      return { success: true, products: mapped, count: primaryCount ?? mapped.length };
    }

    // If primary returned empty or had an error, try the secondary schema
    const { data: secData, count: secCount, error: secError } = await secondaryClient
      .from('products')
      .select('*', { count: 'exact' })
      .order('id', { ascending: true })
      .limit(5000);

    if (!secError && secData && secData.length > 0) {
      setActiveSchema(secondarySchema);
      const mapped = secData.map(mapRowToProduct);
      return { success: true, products: mapped, count: secCount ?? mapped.length };
    }

    // If primary succeeded with 0 items and secondary also succeeded with 0 items
    if (!primaryError && primaryData) {
      return { success: true, products: [], count: 0 };
    }

    if (!secError && secData) {
      setActiveSchema(secondarySchema);
      return { success: true, products: [], count: 0 };
    }

    const firstErr = primaryError || secError;
    const isMissing =
      firstErr?.message?.includes('Could not find the table') ||
      firstErr?.code === 'PGRST205' ||
      firstErr?.code === 'PGRST106';

    return {
      success: false,
      products: [],
      count: 0,
      error: firstErr?.message || 'Erreur lors du chargement des produits',
      tableMissing: isMissing,
    };
  } catch (err: any) {
    return {
      success: false,
      products: [],
      count: 0,
      error: err.message || 'Erreur réseau Supabase',
    };
  }
}

// Upsert a single product in Supabase (with automatic column & schema fallback)
export async function upsertProductInSupabase(
  product: Product
): Promise<{ success: boolean; error?: string }> {
  try {
    const row = mapProductToRow(product);
    const primaryClient = activeSchema === 'api' ? supabaseApi : supabasePublic;
    const fallbackClient = activeSchema === 'api' ? supabasePublic : supabaseApi;

    const tryUpsertOnClient = async (client: typeof supabasePublic) => {
      const { error } = await client.from('products').upsert(row, { onConflict: 'id' });
      if (!error) return { ok: true as const };

      if (isMissingColumnError(error)) {
        const resNoVerify = await client
          .from('products')
          .upsert(stripExtendedProductColumns(row), { onConflict: 'id' });
        if (!resNoVerify.error) return { ok: true as const };

        if (isMissingColumnError(resNoVerify.error)) {
          const resCore = await client
            .from('products')
            .upsert(stripAllOptionalProductColumns(row), { onConflict: 'id' });
          if (!resCore.error) return { ok: true as const };
          return { ok: false as const, error: resCore.error };
        }
        return { ok: false as const, error: resNoVerify.error };
      }

      return { ok: false as const, error };
    };

    const primaryRes = await tryUpsertOnClient(primaryClient);
    if (primaryRes.ok) return { success: true };

    const altRes = await tryUpsertOnClient(fallbackClient);
    if (altRes.ok) {
      setActiveSchema(activeSchema === 'api' ? 'public' : 'api');
      return { success: true };
    }

    console.error('[Supabase] Erreur upsert produit:', primaryRes.error);
    return { success: false, error: primaryRes.error?.message || 'Erreur upsert Supabase' };
  } catch (err: any) {
    console.error('[Supabase] Exception upsert produit:', err);
    return { success: false, error: err.message || 'Erreur lors de la sauvegarde Supabase' };
  }
}

// Delete a product in Supabase
export async function deleteProductInSupabase(
  id: number
): Promise<{ success: boolean; error?: string }> {
  try {
    const client = activeSchema === 'api' ? supabaseApi : supabasePublic;
    const { error } = await client.from('products').delete().eq('id', id);
    if (!error) return { success: true };

    const fallbackClient = activeSchema === 'api' ? supabasePublic : supabaseApi;
    const { error: errAlt } = await fallbackClient.from('products').delete().eq('id', id);
    if (!errAlt) return { success: true };

    return { success: false, error: error.message };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// Fast batch delete multiple products in Supabase
export async function deleteProductsBatchInSupabase(
  ids: number[]
): Promise<{ success: boolean; deletedCount: number; error?: string }> {
  if (!ids || ids.length === 0) {
    return { success: true, deletedCount: 0 };
  }
  try {
    const uniqueIds = Array.from(new Set(ids));
    const batchSize = 100;
    let deletedCount = 0;

    for (let i = 0; i < uniqueIds.length; i += batchSize) {
      const chunk = uniqueIds.slice(i, i + batchSize);
      const client = activeSchema === 'api' ? supabaseApi : supabasePublic;
      const { error } = await client.from('products').delete().in('id', chunk);

      if (error) {
        const fallbackClient = activeSchema === 'api' ? supabasePublic : supabaseApi;
        const { error: errAlt } = await fallbackClient.from('products').delete().in('id', chunk);
        if (errAlt) {
          return { success: false, deletedCount, error: error.message };
        }
      }
      deletedCount += chunk.length;
    }

    return { success: true, deletedCount };
  } catch (err: any) {
    return { success: false, deletedCount: 0, error: err.message };
  }
}

// Delete all products from Supabase
export async function deleteAllProductsFromSupabase(): Promise<{ success: boolean; error?: string }> {
  try {
    const [resPub, resApi] = await Promise.allSettled([
      supabasePublic.from('products').delete().gte('id', 0),
      supabaseApi.from('products').delete().gte('id', 0),
    ]);

    const errPub = resPub.status === 'fulfilled' ? resPub.value.error : null;
    const errApi = resApi.status === 'fulfilled' ? apiResult(resApi.value) : null;

    function apiResult(val: any) {
      return val?.error || null;
    }

    if (!errPub) return { success: true };
    if (!errApi) return { success: true };

    return { success: false, error: errPub?.message || errApi?.message };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// Batch upload / seed all products into Supabase (in batches of 50 with column/schema fallback)
export async function seedProductsToSupabase(
  products: Product[],
  onProgress?: (processed: number, total: number) => void
): Promise<{ success: boolean; count: number; error?: string }> {
  try {
    const batchSize = 50;
    const total = products.length;
    let processed = 0;
    let client = activeSchema === 'api' ? supabaseApi : supabasePublic;
    let columnLevel: 'full' | 'noVerify' | 'core' = 'full';

    const mapForLevel = (p: Product) => {
      const full = mapProductToRow(p);
      if (columnLevel === 'noVerify') return stripExtendedProductColumns(full);
      if (columnLevel === 'core') return stripAllOptionalProductColumns(full);
      return full;
    };

    for (let i = 0; i < total; i += batchSize) {
      const slice = products.slice(i, i + batchSize);
      let chunk = slice.map(mapForLevel);
      let { error } = await client.from('products').upsert(chunk, { onConflict: 'id' });

      if (error && isMissingColumnError(error) && columnLevel === 'full') {
        columnLevel = 'noVerify';
        chunk = slice.map(mapForLevel);
        ({ error } = await client.from('products').upsert(chunk, { onConflict: 'id' }));
      }
      if (error && isMissingColumnError(error) && columnLevel === 'noVerify') {
        columnLevel = 'core';
        chunk = slice.map(mapForLevel);
        ({ error } = await client.from('products').upsert(chunk, { onConflict: 'id' }));
      }

      // If schema failed on first chunk, test secondary schema
      if (error && i === 0) {
        const fallbackClient = activeSchema === 'api' ? supabasePublic : supabaseApi;
        const altRes = await fallbackClient.from('products').upsert(chunk, { onConflict: 'id' });
        if (!altRes.error) {
          client = fallbackClient;
          setActiveSchema(activeSchema === 'api' ? 'public' : 'api');
          error = null;
        }
      }

      if (error) {
        console.error('[Supabase] Erreur lot seed:', error);
        return {
          success: false,
          count: processed,
          error: `Erreur au lot ${i + 1}-${i + chunk.length}: ${error.message}`,
        };
      }
      processed += chunk.length;
      if (onProgress) {
        onProgress(processed, total);
      }
    }

    return { success: true, count: processed };
  } catch (err: any) {
    return { success: false, count: 0, error: err.message || 'Erreur d\'envoi vers Supabase' };
  }
}

const INTERNAL_TIPS_CATEGORIES = new Set([
  'device_tracker_record',
  'daily_catalog_backup',
  'app_security_config',
  'app_guide_config',
  'app_activity_log_batch',
]);

const RICH_TIP_PREFIX = '__LIVRY_ARTICLE_JSON__:';

function serializeTipContent(content: string, blocks?: TipArticleBlock[]): string {
  if (!blocks || blocks.length === 0) return content || '';
  const sanitizedBlocks = blocks.map((b) => ({
    id: b.id,
    type: b.type,
    heading: b.heading || '',
    text: b.text || '',
    imageUrl: b.imageUrl ? sanitizeImageUrl(b.imageUrl) || '' : '',
    caption: b.caption || '',
  }));
  return `${RICH_TIP_PREFIX}${JSON.stringify({ summary: content || '', blocks: sanitizedBlocks })}`;
}

function deserializeTipContent(rawContent: unknown): {
  content: string;
  blocks?: TipArticleBlock[];
} {
  const s = String(rawContent || '');
  if (!s.startsWith(RICH_TIP_PREFIX)) {
    return { content: s };
  }
  try {
    const parsed = JSON.parse(s.slice(RICH_TIP_PREFIX.length));
    const blocks: TipArticleBlock[] = Array.isArray(parsed?.blocks)
      ? parsed.blocks
          .map((b: any, idx: number): TipArticleBlock => ({
            id: String(b.id || `blk-${idx}`),
            type: b.type === 'image' || b.type === 'image_text' ? b.type : 'text',
            heading: typeof b.heading === 'string' && b.heading.trim() ? b.heading : undefined,
            text: typeof b.text === 'string' && b.text.trim() ? b.text : undefined,
            imageUrl: b.imageUrl ? sanitizeImageUrl(b.imageUrl) : undefined,
            caption: typeof b.caption === 'string' && b.caption.trim() ? b.caption : undefined,
          }))
      : [];
    return {
      content: String(parsed?.summary ?? ''),
      blocks: blocks.length > 0 ? blocks : undefined,
    };
  } catch {
    return { content: s };
  }
}

function sanitizeBlocksForStorage(blocks?: TipArticleBlock[]) {
  if (!blocks || blocks.length === 0) return [];
  return blocks.map((b, idx) => ({
    id: String(b.id || `blk-${idx}`),
    type: b.type === 'image' || b.type === 'image_text' ? b.type : ('text' as const),
    heading: typeof b.heading === 'string' && b.heading.trim() ? b.heading.trim() : undefined,
    text: typeof b.text === 'string' && b.text.trim() ? b.text.trim() : undefined,
    imageUrl: b.imageUrl ? sanitizeImageUrl(b.imageUrl) : undefined,
    caption: typeof b.caption === 'string' && b.caption.trim() ? b.caption.trim() : undefined,
  }));
}

function mapRowToTip(t: any): TipPost {
  const parsed = deserializeTipContent(t.content);
  let blocks = parsed.blocks;

  if ((!blocks || blocks.length === 0) && t.blocks_json) {
    try {
      const rawBlocks =
        typeof t.blocks_json === 'string' ? JSON.parse(t.blocks_json) : t.blocks_json;
      if (Array.isArray(rawBlocks) && rawBlocks.length > 0) {
        const cleaned = sanitizeBlocksForStorage(rawBlocks);
        if (cleaned.length > 0) blocks = cleaned;
      }
    } catch {}
  }

  return {
    id: String(t.id),
    title: String(t.title || ''),
    content: parsed.content,
    blocks,
    category: typeof t.category === 'string' ? t.category : '',
    authorRole: t.author_role || t.authorRole || 'Pickeur',
    authorName: t.author_name || t.authorName || undefined,
    createdAt: t.created_at || t.createdAt || 'Récemment',
    likes: Number(t.likes || 0),
    imageUrl: sanitizeImageUrl(t.image_url || t.imageUrl),
    targetAudience: t.target_audience || t.targetAudience || 'Tous',
  };
}

function mapTipToRow(tip: TipPost) {
  return {
    id: tip.id,
    title: tip.title,
    content: serializeTipContent(tip.content, tip.blocks),
    category: tip.category,
    author_role: tip.authorRole,
    author_name: tip.authorName || '',
    created_at: tip.createdAt,
    likes: tip.likes,
    image_url: sanitizeImageUrl(tip.imageUrl) || '',
    target_audience: tip.targetAudience || 'Tous',
  };
}

function mapAstuceToRow(tip: TipPost) {
  return {
    id: tip.id,
    title: tip.title,
    content: tip.content || '',
    blocks_json: sanitizeBlocksForStorage(tip.blocks),
    category: tip.category,
    author_role: tip.authorRole,
    author_name: tip.authorName || '',
    created_at: tip.createdAt,
    likes: Number(tip.likes || 0),
    image_url: sanitizeImageUrl(tip.imageUrl) || '',
    target_audience: tip.targetAudience || 'Tous',
    updated_at: new Date().toISOString(),
  };
}

function isMissingTableError(err: any): boolean {
  const msg = String(err?.message || '').toLowerCase();
  const code = String(err?.code || '');
  return (
    code === 'PGRST205' ||
    code === '42P01' ||
    code === 'PGRST106' ||
    msg.includes('could not find the table') ||
    (msg.includes('relation') && msg.includes('does not exist'))
  );
}

export async function checkAstucesTableStatus(): Promise<{
  exists: boolean;
  schema: 'public' | 'api';
  count: number;
}> {
  try {
    const [pubRes, apiRes] = await Promise.allSettled([
      supabasePublic.from('astuces').select('id', { count: 'exact' }).limit(1),
      supabaseApi.from('astuces').select('id', { count: 'exact' }).limit(1),
    ]);
    const pub = pubRes.status === 'fulfilled' ? pubRes.value : null;
    const api = apiRes.status === 'fulfilled' ? apiRes.value : null;

    if (pub && !pub.error) {
      return { exists: true, schema: 'public', count: pub.count ?? 0 };
    }
    if (api && !api.error) {
      return { exists: true, schema: 'api', count: api.count ?? 0 };
    }
  } catch {}
  return { exists: false, schema: 'public', count: 0 };
}

// Fetch Astuces / Tips from Supabase (prioritizes dedicated 'astuces' table, falls back to 'tips')
export async function fetchTipsFromSupabase(): Promise<{
  success: boolean;
  tips: TipPost[];
  sourceTable?: 'astuces' | 'tips';
  error?: string;
}> {
  try {
    const client = activeSchema === 'api' ? supabaseApi : supabasePublic;
    const fallbackClient = activeSchema === 'api' ? supabasePublic : supabaseApi;

    // 1. Try dedicated 'astuces' table first
    let astucesTableExists = false;
    let astucesClient = client;

    const astResPrimary = await client
      .from('astuces')
      .select('*')
      .order('likes', { ascending: false });

    if (!astResPrimary.error) {
      astucesTableExists = true;
      if (astResPrimary.data && astResPrimary.data.length > 0) {
        return {
          success: true,
          tips: astResPrimary.data.map(mapRowToTip),
          sourceTable: 'astuces',
        };
      }
    } else if (isMissingTableError(astResPrimary.error)) {
      const astResAlt = await fallbackClient
        .from('astuces')
        .select('*')
        .order('likes', { ascending: false });
      if (!astResAlt.error) {
        astucesTableExists = true;
        astucesClient = fallbackClient;
        if (astResAlt.data && astResAlt.data.length > 0) {
          return {
            success: true,
            tips: astResAlt.data.map(mapRowToTip),
            sourceTable: 'astuces',
          };
        }
      }
    }

    // 2. Fallback / migration source: user rows inside 'tips'
    let { data, error } = await client
      .from('tips')
      .select('*')
      .order('likes', { ascending: false });

    const userRowsPrimary = (data || []).filter(
      (t: any) => !INTERNAL_TIPS_CATEGORIES.has(String(t.category || ''))
    );

    if (error || userRowsPrimary.length === 0) {
      const resAlt = await fallbackClient
        .from('tips')
        .select('*')
        .order('likes', { ascending: false });
      const userRowsAlt = (resAlt.data || []).filter(
        (t: any) => !INTERNAL_TIPS_CATEGORIES.has(String(t.category || ''))
      );
      if (!resAlt.error && (error || userRowsAlt.length > userRowsPrimary.length)) {
        data = resAlt.data;
        error = null;
      }
    }

    if (error && !astucesTableExists) {
      return { success: false, tips: [], error: error.message };
    }

    const mapped: TipPost[] = (data || [])
      .filter((t: any) => !INTERNAL_TIPS_CATEGORIES.has(String(t.category || '')))
      .map(mapRowToTip);

    // Auto-migrate legacy user tips into dedicated 'astuces' table if it exists and is empty
    if (astucesTableExists && mapped.length > 0) {
      const rows = mapped.map(mapAstuceToRow);
      void astucesClient.from('astuces').upsert(rows, { onConflict: 'id' }).then(() => {}, () => {});
    }

    return {
      success: true,
      tips: mapped,
      sourceTable: astucesTableExists && mapped.length === 0 ? 'astuces' : 'tips',
    };
  } catch (err: any) {
    return { success: false, tips: [], error: err.message };
  }
}

// Upsert tip/astuce to Supabase (saves into dedicated 'astuces' table first, falls back to 'tips' if needed)
export async function upsertTipInSupabase(tip: TipPost): Promise<{
  success: boolean;
  targetTable?: 'astuces' | 'tips';
  error?: string;
}> {
  try {
    const client = activeSchema === 'api' ? supabaseApi : supabasePublic;
    const fallback = activeSchema === 'api' ? supabasePublic : supabaseApi;
    const astuceRow = mapAstuceToRow(tip);

    // Try dedicated 'astuces' table first
    const astPrimary = await client.from('astuces').upsert(astuceRow, { onConflict: 'id' });
    if (!astPrimary.error) {
      void fallback.from('astuces').upsert(astuceRow, { onConflict: 'id' }).then(() => {}, () => {});
      return { success: true, targetTable: 'astuces' };
    }

    const astAlt = await fallback.from('astuces').upsert(astuceRow, { onConflict: 'id' });
    if (!astAlt.error) {
      return { success: true, targetTable: 'astuces' };
    }

    // Fallback to 'tips' table if 'astuces' table hasn't been created by SQL yet
    const row = mapTipToRow(tip);
    const { error } = await client.from('tips').upsert(row, { onConflict: 'id' });
    if (!error) {
      void fallback.from('tips').upsert(row, { onConflict: 'id' }).then(() => {}, () => {});
      return { success: true, targetTable: 'tips' };
    }

    const { error: errAlt } = await fallback.from('tips').upsert(row, { onConflict: 'id' });
    if (!errAlt) return { success: true, targetTable: 'tips' };

    return {
      success: false,
      error: astPrimary.error?.message || error.message || errAlt.message,
    };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// Delete tip/astuce from Supabase (cleans both 'astuces' and 'tips')
export async function deleteTipInSupabase(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const client = activeSchema === 'api' ? supabaseApi : supabasePublic;
    const fallback = activeSchema === 'api' ? supabasePublic : supabaseApi;

    const [astPub, astApi, tipPub, tipApi] = await Promise.allSettled([
      client.from('astuces').delete().eq('id', id),
      fallback.from('astuces').delete().eq('id', id),
      client.from('tips').delete().eq('id', id),
      fallback.from('tips').delete().eq('id', id),
    ]);

    const hasSuccess = [astPub, astApi, tipPub, tipApi].some(
      (r) => r.status === 'fulfilled' && !r.value.error
    );
    if (hasSuccess) return { success: true };

    const firstErr = [astPub, tipPub]
      .map((r) => (r.status === 'fulfilled' ? r.value.error?.message : undefined))
      .find(Boolean);

    return { success: false, error: firstErr || 'Erreur suppression Supabase' };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// Seed all astuces/tips to Supabase (dedicated 'astuces' table first, 'tips' fallback)
export async function seedTipsToSupabase(
  tips: TipPost[]
): Promise<{
  success: boolean;
  count: number;
  targetTable?: 'astuces' | 'tips';
  needsTableSql?: boolean;
  error?: string;
}> {
  try {
    if (tips.length === 0) return { success: true, count: 0 };

    const client = activeSchema === 'api' ? supabaseApi : supabasePublic;
    const fallback = activeSchema === 'api' ? supabasePublic : supabaseApi;
    const astuceRows = tips.map(mapAstuceToRow);

    const astPrimary = await client.from('astuces').upsert(astuceRows, { onConflict: 'id' });
    if (!astPrimary.error) {
      void fallback.from('astuces').upsert(astuceRows, { onConflict: 'id' }).then(() => {}, () => {});
      return {
        success: true,
        count: astuceRows.length,
        targetTable: 'astuces',
        needsTableSql: false,
      };
    }

    const astAlt = await fallback.from('astuces').upsert(astuceRows, { onConflict: 'id' });
    if (!astAlt.error) {
      return {
        success: true,
        count: astuceRows.length,
        targetTable: 'astuces',
        needsTableSql: false,
      };
    }

    const needsTableSql = isMissingTableError(astPrimary.error) || isMissingTableError(astAlt.error);

    const rows = tips.map(mapTipToRow);
    const { error } = await client.from('tips').upsert(rows, { onConflict: 'id' });
    if (!error) {
      void fallback.from('tips').upsert(rows, { onConflict: 'id' }).then(() => {}, () => {});
      return {
        success: true,
        count: rows.length,
        targetTable: 'tips',
        needsTableSql,
      };
    }

    const { error: errAlt } = await fallback.from('tips').upsert(rows, { onConflict: 'id' });
    if (!errAlt) {
      return {
        success: true,
        count: rows.length,
        targetTable: 'tips',
        needsTableSql,
      };
    }

    return {
      success: false,
      count: 0,
      needsTableSql,
      error: astPrimary.error?.message || error.message || errAlt.message,
    };
  } catch (err: any) {
    return { success: false, count: 0, error: err.message || "Erreur d'envoi des astuces" };
  }
}

// ---------------------------------------------------------------------------
// GESTION DES VOTES ET SUGGESTIONS DE CODES-BARRES
// ---------------------------------------------------------------------------

// Fetch all community barcode votes from Supabase and aggregate by barcode
export async function fetchBarcodeVotesFromSupabase(): Promise<{
  success: boolean;
  votes: Record<string, import('../types').BarcodeVoteRecord>;
  error?: string;
}> {
  try {
    const client = activeSchema === 'api' ? supabaseApi : supabasePublic;
    let { data, error } = await client.from('barcode_votes').select('*');

    if (error) {
      const fallback = activeSchema === 'api' ? supabasePublic : supabaseApi;
      const alt = await fallback.from('barcode_votes').select('*');
      if (!alt.error) {
        data = alt.data;
        error = null;
      }
    }

    if (error) {
      // If table doesn't exist yet, return gracefully
      return { success: false, votes: {}, error: error.message };
    }

    const aggregated: Record<string, import('../types').BarcodeVoteRecord> = {};

    if (data && Array.isArray(data)) {
      for (const row of data) {
        const barcode = String(row.barcode || '').trim();
        const workerNumber = String(row.worker_number || '').trim();
        const voteType = row.vote_type as 'like' | 'dislike';

        if (!barcode || !workerNumber || !voteType) continue;

        if (!aggregated[barcode]) {
          aggregated[barcode] = {
            barcode,
            likes: 0,
            dislikes: 0,
            voters: {},
          };
        }

        aggregated[barcode].voters[workerNumber] = voteType;
        if (voteType === 'like') {
          aggregated[barcode].likes += 1;
        } else if (voteType === 'dislike') {
          aggregated[barcode].dislikes += 1;
        }
      }

      // Compute conditions:
      // - 15 likes => statusOverride = 'Valide'
      // - 15 dislikes => isDeleted = true (auto-deleted from app)
      for (const b in aggregated) {
        if (aggregated[b].likes >= 15) {
          aggregated[b].statusOverride = 'Valide';
        }
        if (aggregated[b].dislikes >= 15) {
          aggregated[b].isDeleted = true;
        }
      }
    }

    return { success: true, votes: aggregated };
  } catch (err: any) {
    return { success: false, votes: {}, error: err.message };
  }
}

// Save or remove a single worker's vote on a barcode in Supabase
export async function saveBarcodeVoteToSupabase(
  barcode: string,
  workerNumber: string,
  voteType: 'like' | 'dislike' | null
): Promise<{ success: boolean; error?: string }> {
  try {
    const client = activeSchema === 'api' ? supabaseApi : supabasePublic;
    const fallback = activeSchema === 'api' ? supabasePublic : supabaseApi;

    if (voteType === null) {
      const { error } = await client
        .from('barcode_votes')
        .delete()
        .match({ barcode, worker_number: workerNumber });
      if (!error) return { success: true };

      const { error: errAlt } = await fallback
        .from('barcode_votes')
        .delete()
        .match({ barcode, worker_number: workerNumber });
      if (!errAlt) return { success: true };

      return { success: false, error: error.message };
    }

    const row = {
      barcode,
      worker_number: workerNumber,
      vote_type: voteType,
      updated_at: new Date().toISOString(),
    };

    const { error } = await client
      .from('barcode_votes')
      .upsert(row, { onConflict: 'barcode,worker_number' });
    if (!error) return { success: true };

    const { error: errAlt } = await fallback
      .from('barcode_votes')
      .upsert(row, { onConflict: 'barcode,worker_number' });
    if (!errAlt) return { success: true };

    return { success: false, error: error.message };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}


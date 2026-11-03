import {
  supabase,
  supabaseApi,
  supabasePublic,
  activeSchema,
  setActiveSchema,
  SUPABASE_URL,
} from './supabaseClient';
import { Product, TipPost, Department } from '../types';
import { extractPureUnit } from '../utils/productWeight';

export interface SupabaseHealthCheckResult {
  connected: boolean;
  tableExists: boolean;
  productCount: number;
  message: string;
  schema: 'api' | 'public';
}

export const SUPABASE_SETUP_SQL = `-- =========================================================================
-- SCRIPT DE RÉPARATION SUPABASE (COMPATIBILITÉ SCHÉMAS API ET PUBLIC)
-- À copier et exécuter dans : Supabase Dashboard -> SQL Editor -> New query
-- =========================================================================

-- 1. Exposer à la fois 'public' et 'api' pour l'API REST PostgREST
ALTER ROLE authenticator SET pgrst.db_schemas = 'public, api, graphql_public';
NOTIFY pgrst, 'reload config';
NOTIFY pgrst, 'reload schema';

-- -------------------------------------------------------------------------
-- 2. TABLE DES PRODUITS DANS LE SCHÉMA PUBLIC
-- -------------------------------------------------------------------------
CREATE SEQUENCE IF NOT EXISTS public.products_id_seq;

CREATE TABLE IF NOT EXISTS public.products (
  id BIGINT PRIMARY KEY DEFAULT nextval('public.products_id_seq'),
  code TEXT,
  produit TEXT NOT NULL,
  marjane TEXT,
  "marjane 2" TEXT,
  "marjane Interne" TEXT,
  "marjane mini" TEXT,
  "marjane sec" TEXT,
  "marjane sec 2" TEXT,
  image_html TEXT,
  "département" TEXT NOT NULL,
  "catégorie" TEXT,
  quantite TEXT DEFAULT 'pièce',
  is_enabled BOOLEAN DEFAULT true,
  worker_number TEXT DEFAULT 'SHARED',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.products ALTER COLUMN id SET DEFAULT nextval('public.products_id_seq');
ALTER SEQUENCE public.products_id_seq OWNED BY public.products.id;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS worker_number TEXT DEFAULT 'SHARED';
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS quantite TEXT DEFAULT 'pièce';

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "products_all_access" ON public.products;
CREATE POLICY "products_all_access" ON public.products FOR ALL USING (true) WITH CHECK (true);

-- Table des Villes (Modon)
CREATE TABLE IF NOT EXISTS public.villes (
  id SERIAL PRIMARY KEY,
  nom TEXT UNIQUE NOT NULL
);
ALTER TABLE public.villes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "villes_all_access" ON public.villes;
CREATE POLICY "villes_all_access" ON public.villes FOR ALL USING (true) WITH CHECK (true);

-- Table des Entrepôts / Magasins
CREATE TABLE IF NOT EXISTS public.entrepots (
  id SERIAL PRIMARY KEY,
  nom TEXT UNIQUE NOT NULL,
  ville_nom TEXT NOT NULL
);
ALTER TABLE public.entrepots ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "entrepots_all_access" ON public.entrepots;
CREATE POLICY "entrepots_all_access" ON public.entrepots FOR ALL USING (true) WITH CHECK (true);

-- Insertion initiale des villes et entrepôts
INSERT INTO public.villes (nom) VALUES
  ('Casablanca'), ('Rabat'), ('Salé'), ('Marrakech'), ('Tanger'),
  ('Fès'), ('Agadir'), ('Kénitra'), ('Meknès'), ('Oujda'),
  ('Tétouan'), ('Mohammedia'), ('El Jadida')
ON CONFLICT (nom) DO NOTHING;

INSERT INTO public.entrepots (nom, ville_nom) VALUES
  ('Marjane Market Emile Zola', 'Casablanca'),
  ('Marjane Californie', 'Casablanca'),
  ('Marjane Morocco Mall', 'Casablanca'),
  ('Marjane Ain Sebaa', 'Casablanca'),
  ('Marjane Derb Sultan', 'Casablanca'),
  ('Marjane Sidi Maarouf', 'Casablanca'),
  ('Marjane Market Gauthier', 'Casablanca'),
  ('Marjane Hay Riad', 'Rabat'),
  ('Marjane Bouregreg', 'Rabat'),
  ('Marjane Market Agdal', 'Rabat'),
  ('Marjane Menara', 'Marrakech'),
  ('Marjane Market Gueliz', 'Marrakech'),
  ('Marjane Tanger Madina', 'Tanger'),
  ('Marjane Market Malabata', 'Tanger'),
  ('Marjane Agadir Founty', 'Agadir'),
  ('Marjane Market Dakhla', 'Agadir')
ON CONFLICT (nom) DO NOTHING;

-- Table des comptes de travail (Workers - Nouvelle logique : id, name, numero, entropot, ville, mote_de_passe, role)
CREATE TABLE IF NOT EXISTS public.workers (
  id TEXT PRIMARY KEY,
  work_number TEXT UNIQUE NOT NULL,
  phone_number TEXT,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'Pickeur',
  password TEXT NOT NULL,
  terminal_id TEXT,
  ip_address TEXT,
  is_quick_access BOOLEAN DEFAULT false,
  quick_uses_count INT DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.workers ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE public.workers ADD COLUMN IF NOT EXISTS numero TEXT;
ALTER TABLE public.workers ADD COLUMN IF NOT EXISTS entropot TEXT;
ALTER TABLE public.workers ADD COLUMN IF NOT EXISTS ville TEXT;
ALTER TABLE public.workers ADD COLUMN IF NOT EXISTS mote_de_passe TEXT;
ALTER TABLE public.workers ADD COLUMN IF NOT EXISTS phone_number TEXT;
ALTER TABLE public.workers ADD COLUMN IF NOT EXISTS terminal_id TEXT;
ALTER TABLE public.workers ADD COLUMN IF NOT EXISTS ip_address TEXT;
ALTER TABLE public.workers ADD COLUMN IF NOT EXISTS is_quick_access BOOLEAN DEFAULT false;
ALTER TABLE public.workers ADD COLUMN IF NOT EXISTS quick_uses_count INT DEFAULT 1;
ALTER TABLE public.workers ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE public.workers ADD COLUMN IF NOT EXISTS store_name TEXT;
ALTER TABLE public.workers ADD COLUMN IF NOT EXISTS trial_started_at TIMESTAMPTZ;
ALTER TABLE public.workers ADD COLUMN IF NOT EXISTS is_trial_blocked BOOLEAN DEFAULT false;
ALTER TABLE public.workers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "workers_all_access" ON public.workers;
CREATE POLICY "workers_all_access" ON public.workers FOR ALL USING (true) WITH CHECK (true);

-- Table des plannings hebdomadaires des équipes (Pickeurs & Livreurs)
CREATE TABLE IF NOT EXISTS public.weekly_schedules (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'Pickeur',
  days JSONB NOT NULL,
  shift_hours TEXT DEFAULT '09:00 - 21:00',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.weekly_schedules ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "weekly_schedules_all_access" ON public.weekly_schedules;
CREATE POLICY "weekly_schedules_all_access" ON public.weekly_schedules FOR ALL USING (true) WITH CHECK (true);

-- Table des planifications Livry (par date et ID pickeur)
CREATE TABLE IF NOT EXISTS public.planification_rows (
  row_id TEXT PRIMARY KEY,
  date DATE NOT NULL,
  worker_id TEXT NOT NULL,
  worker_name TEXT,
  s1a TEXT DEFAULT '09:00',
  s1b TEXT DEFAULT '22:00',
  s2a TEXT DEFAULT '22:01',
  s2b TEXT DEFAULT '22:03',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.planification_rows ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "planification_rows_all_access" ON public.planification_rows;
CREATE POLICY "planification_rows_all_access" ON public.planification_rows FOR ALL USING (true) WITH CHECK (true);

GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;

-- -------------------------------------------------------------------------
-- 3. TABLE DES PRODUITS DANS LE SCHÉMA API (Si le projet utilise le schéma api)
-- -------------------------------------------------------------------------
CREATE SCHEMA IF NOT EXISTS api;
CREATE SEQUENCE IF NOT EXISTS api.products_id_seq;

CREATE TABLE IF NOT EXISTS api.products (
  id BIGINT PRIMARY KEY DEFAULT nextval('api.products_id_seq'),
  code TEXT,
  produit TEXT NOT NULL,
  marjane TEXT,
  "marjane 2" TEXT,
  "marjane Interne" TEXT,
  "marjane mini" TEXT,
  "marjane sec" TEXT,
  "marjane sec 2" TEXT,
  image_html TEXT,
  "département" TEXT NOT NULL,
  "catégorie" TEXT,
  is_enabled BOOLEAN DEFAULT true,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE api.products ALTER COLUMN id SET DEFAULT nextval('api.products_id_seq');
ALTER SEQUENCE api.products_id_seq OWNED BY api.products.id;

ALTER TABLE api.products ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "api_products_all_access" ON api.products;
CREATE POLICY "api_products_all_access" ON api.products FOR ALL USING (true) WITH CHECK (true);

GRANT USAGE ON SCHEMA api TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA api TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA api TO anon, authenticated, service_role;

-- Table des workers dans le schéma api
CREATE TABLE IF NOT EXISTS api.workers (
  id TEXT PRIMARY KEY,
  work_number TEXT UNIQUE NOT NULL,
  phone_number TEXT,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'Pickeur',
  password TEXT NOT NULL,
  name TEXT,
  numero TEXT,
  entropot TEXT,
  ville TEXT,
  mote_de_passe TEXT,
  city TEXT,
  store_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE api.workers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "api_workers_all_access" ON api.workers;
CREATE POLICY "api_workers_all_access" ON api.workers FOR ALL USING (true) WITH CHECK (true);
GRANT ALL ON TABLE api.workers TO anon, authenticated, service_role;

-- -------------------------------------------------------------------------
-- 4. TABLE DES TUTORIELS & ASTUCES (TIPS) DANS LES DEUX SCHÉMAS
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.tips (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT NOT NULL,
  author_role TEXT DEFAULT 'Pickeur',
  author_name TEXT,
  created_at TEXT,
  likes INT DEFAULT 0,
  image_url TEXT,
  target_audience TEXT DEFAULT 'Tous'
);

ALTER TABLE public.tips ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tips_all_access" ON public.tips;
CREATE POLICY "tips_all_access" ON public.tips FOR ALL USING (true) WITH CHECK (true);
GRANT ALL ON TABLE public.tips TO anon, authenticated, service_role;

CREATE TABLE IF NOT EXISTS api.tips (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT NOT NULL,
  author_role TEXT DEFAULT 'Pickeur',
  author_name TEXT,
  created_at TEXT,
  likes INT DEFAULT 0,
  image_url TEXT,
  target_audience TEXT DEFAULT 'Tous'
);

ALTER TABLE api.tips ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "api_tips_all_access" ON api.tips;
CREATE POLICY "api_tips_all_access" ON api.tips FOR ALL USING (true) WITH CHECK (true);
GRANT ALL ON TABLE api.tips TO anon, authenticated, service_role;

-- -------------------------------------------------------------------------
-- 5. TABLE DES VOTES DE CODES-BARRES (LIKES & DISLIKES PAR COMPTE)
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.barcode_votes (
  barcode TEXT NOT NULL,
  worker_number TEXT NOT NULL,
  vote_type TEXT NOT NULL, -- 'like' ou 'dislike'
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (barcode, worker_number)
);

ALTER TABLE public.barcode_votes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "barcode_votes_all_access" ON public.barcode_votes;
CREATE POLICY "barcode_votes_all_access" ON public.barcode_votes FOR ALL USING (true) WITH CHECK (true);
GRANT ALL ON TABLE public.barcode_votes TO anon, authenticated, service_role;

-- -------------------------------------------------------------------------
-- 6. TABLE DES TÉLÉPHONES / APPAREILS CONNECTÉS ET TEMPS D'UTILISATION
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
GRANT ALL ON TABLE public.user_devices TO anon, authenticated, service_role;

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
GRANT ALL ON TABLE api.user_devices TO anon, authenticated, service_role;

-- -------------------------------------------------------------------------
-- 7. REALTIME (Synchronisation instantanée)
-- -------------------------------------------------------------------------
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.products;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE api.products;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.tips;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE api.tips;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.barcode_votes;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.user_devices;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE api.user_devices;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
END $$;
`;

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
  // If wrapped in HTML <img src="...">
  const match = s.match(/src=["']([^"']+)["']/i);
  if (match && match[1]) {
    s = match[1].trim();
  }
  // Strip surrounding quotes
  s = s.replace(/^["'`]+|["'`]+$/g, '').trim();
  if (s.startsWith('//')) {
    s = 'https:' + s;
  }
  if (s.startsWith('http://') || s.startsWith('https://') || s.startsWith('/assets/')) {
    return s;
  }
  return undefined;
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
    barcodeMjValide: marjane && marjane !== '-' && marjane !== '0' ? marjane : undefined,
  };
}

// Helper: map Product to Supabase row format
export function mapProductToRow(p: Product) {
  const dbDept = departmentToDbValue(p.department);
  const pureUnit = p.quantite || extractPureUnit(p.name);
  return {
    id: p.id,
    code: p.code || '',
    produit: p.name || '',
    marjane: p.barcodeMarjane || '0',
    'marjane 2': p.barcodeP2 || '0',
    'marjane Interne': p.barcodeInterne || p.barcodeMjValide || '0',
    'marjane mini': p.barcodeMiniSecours || '0',
    'marjane sec': p.barcodeSecours || '0',
    'marjane sec 2': p.barcodeP3 || '0',
    image_html: p.imageUrl || '',
    'département': dbDept,
    'catégorie': p.category || '',
    quantite: pureUnit,
    is_enabled: p.isEnabled ?? true,
    updated_at: new Date().toISOString(),
  };
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

// Upsert a single product in Supabase
export async function upsertProductInSupabase(
  product: Product
): Promise<{ success: boolean; error?: string }> {
  try {
    const row = mapProductToRow(product);
    const client = activeSchema === 'api' ? supabaseApi : supabasePublic;
    const { error } = await client.from('products').upsert(row, { onConflict: 'id' });

    if (!error) return { success: true };

    // Try fallback client
    const fallbackClient = activeSchema === 'api' ? supabasePublic : supabaseApi;
    const { error: errAlt } = await fallbackClient.from('products').upsert(row, { onConflict: 'id' });
    if (!errAlt) {
      setActiveSchema(activeSchema === 'api' ? 'public' : 'api');
      return { success: true };
    }

    console.error('[Supabase] Erreur upsert produit:', error);
    return { success: false, error: error.message };
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

// Batch upload / seed all products into Supabase (in batches of 50)
export async function seedProductsToSupabase(
  products: Product[],
  onProgress?: (processed: number, total: number) => void
): Promise<{ success: boolean; count: number; error?: string }> {
  try {
    const batchSize = 50;
    const total = products.length;
    let processed = 0;
    const client = activeSchema === 'api' ? supabaseApi : supabasePublic;

    for (let i = 0; i < total; i += batchSize) {
      const chunk = products.slice(i, i + batchSize).map((p) => mapProductToRow(p));
      const { error } = await client.from('products').upsert(chunk, { onConflict: 'id' });
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

// Fetch Tips from Supabase
export async function fetchTipsFromSupabase(): Promise<{ success: boolean; tips: TipPost[]; error?: string }> {
  try {
    const client = activeSchema === 'api' ? supabaseApi : supabasePublic;
    let { data, error } = await client.from('tips').select('*').order('likes', { ascending: false });

    if (error) {
      const fallbackClient = activeSchema === 'api' ? supabasePublic : supabaseApi;
      const resAlt = await fallbackClient.from('tips').select('*').order('likes', { ascending: false });
      if (!resAlt.error) {
        data = resAlt.data;
        error = null;
      }
    }

    if (error) return { success: false, tips: [], error: error.message };

    const mapped: TipPost[] = (data || []).map((t: any) => ({
      id: String(t.id),
      title: String(t.title || ''),
      content: String(t.content || ''),
      category: t.category || 'Général',
      authorRole: t.author_role || t.authorRole || 'Pickeur',
      authorName: t.author_name || t.authorName || undefined,
      createdAt: t.created_at || t.createdAt || 'Récemment',
      likes: Number(t.likes || 0),
      imageUrl: t.image_url || t.imageUrl || undefined,
      targetAudience: t.target_audience || t.targetAudience || 'Tous',
    }));

    return { success: true, tips: mapped };
  } catch (err: any) {
    return { success: false, tips: [], error: err.message };
  }
}

// Upsert tip to Supabase
export async function upsertTipInSupabase(tip: TipPost): Promise<{ success: boolean; error?: string }> {
  try {
    const row = {
      id: tip.id,
      title: tip.title,
      content: tip.content,
      category: tip.category,
      author_role: tip.authorRole,
      author_name: tip.authorName || '',
      created_at: tip.createdAt,
      likes: tip.likes,
      image_url: tip.imageUrl || '',
      target_audience: tip.targetAudience || 'Tous',
    };
    const client = activeSchema === 'api' ? supabaseApi : supabasePublic;
    const { error } = await client.from('tips').upsert(row, { onConflict: 'id' });
    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// Seed all tips to Supabase
export async function seedTipsToSupabase(
  tips: TipPost[]
): Promise<{ success: boolean; count: number; error?: string }> {
  try {
    const rows = tips.map((tip) => ({
      id: tip.id,
      title: tip.title,
      content: tip.content,
      category: tip.category,
      author_role: tip.authorRole,
      author_name: tip.authorName || '',
      created_at: tip.createdAt,
      likes: tip.likes,
      image_url: tip.imageUrl || '',
      target_audience: tip.targetAudience || 'Tous',
    }));

    const client = activeSchema === 'api' ? supabaseApi : supabasePublic;
    const { error } = await client.from('tips').upsert(rows, { onConflict: 'id' });
    if (error) return { success: false, count: 0, error: error.message };
    return { success: true, count: rows.length };
  } catch (err: any) {
    return { success: false, count: 0, error: err.message || 'Erreur d\'envoi des astuces' };
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
    const { data, error } = await client.from('barcode_votes').select('*');

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

    if (voteType === null) {
      // Toggle off / cancel vote
      const { error } = await client
        .from('barcode_votes')
        .delete()
        .match({ barcode, worker_number: workerNumber });

      if (error) return { success: false, error: error.message };
      return { success: true };
    }

    // Insert or update vote
    const { error } = await client.from('barcode_votes').upsert(
      {
        barcode,
        worker_number: workerNumber,
        vote_type: voteType,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'barcode,worker_number' }
    );

    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}


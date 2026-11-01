import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://pssizsvkbgabnarlyawj.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_Edhz1UUdYBSAmU65NCv08w_Z5u-D2mp';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const csvPath = path.resolve('public/assets/aistudio/pickeurs_24456d77.csv');
const rawText = fs.readFileSync(csvPath, 'utf-8');

const lines = rawText.trim().split('\n');
const header = lines[0].split(';').map(h => h.trim());
console.log('CSV Header:', header);

interface WorkerItem {
  id: string;
  workNumber: string;
  fullName: string;
  phoneNumber?: string;
  storeName: string;
  city: string;
  password?: string;
  role: 'Pickeur' | 'Livreur' | 'Référent' | 'Admin';
  createdAt: string;
}

const uniqueMap = new Map<string, WorkerItem>();

for (let i = 1; i < lines.length; i++) {
  const line = lines[i].trim();
  if (!line) continue;
  const parts = line.split(';');
  const rawId = (parts[0] || '').trim();
  const rawName = (parts[1] || '').trim().toUpperCase();
  let rawNumero = (parts[2] || '').trim().replace(/[^0-9]/g, '');
  if (rawNumero.length === 9 && !rawNumero.startsWith('0')) {
    rawNumero = '0' + rawNumero;
  }
  const rawEntropot = (parts[3] || '').trim();
  const rawVille = (parts[4] || '').trim();
  const rawMdp = (parts[5] || 'livry123').trim() || 'livry123';
  const rawRole = (parts[6] || 'pickeur').trim().toLowerCase();

  const roleFormatted = rawRole.includes('livreur')
    ? 'Livreur'
    : rawRole.includes('referent') || rawRole.includes('référent')
    ? 'Référent'
    : 'Pickeur';

  if (!rawId) continue;

  if (!uniqueMap.has(rawId)) {
    uniqueMap.set(rawId, {
      id: rawId,
      workNumber: rawId,
      fullName: rawName,
      phoneNumber: rawNumero || undefined,
      storeName: rawEntropot,
      city: rawVille,
      password: rawMdp,
      role: roleFormatted,
      createdAt: new Date().toISOString(),
    });
  }
}

// Add system test accounts (Référents & Admin)
const systemAccounts: WorkerItem[] = [
  {
    id: '3040',
    workNumber: '3040',
    fullName: 'YASSINE ALAMI',
    phoneNumber: '0661003040',
    storeName: 'Marjane Californie',
    city: 'Casablanca',
    password: '123',
    role: 'Référent',
    createdAt: '2026-10-10T10:00:00.000Z',
  },
  {
    id: '3041',
    workNumber: '3041',
    fullName: 'RÉFÉRENT 2 MARS',
    phoneNumber: '0661003041',
    storeName: 'Marjane Market 2 Mars',
    city: 'Casablanca',
    password: '123',
    role: 'Référent',
    createdAt: '2026-10-10T10:00:00.000Z',
  },
  {
    id: '3042',
    workNumber: '3042',
    fullName: 'RÉFÉRENT EMILE ZOLA',
    phoneNumber: '0661003042',
    storeName: 'Marjane Market Emile Zola',
    city: 'Casablanca',
    password: '123',
    role: 'Référent',
    createdAt: '2026-10-10T10:00:00.000Z',
  },
  {
    id: '1997',
    workNumber: '1997',
    fullName: 'RESPONSABLE MAGASIN',
    phoneNumber: '0661001997',
    storeName: 'Marjane Californie',
    city: 'Casablanca',
    password: '1997',
    role: 'Admin',
    createdAt: '2026-10-01T07:00:00.000Z',
  },
];

for (const sa of systemAccounts) {
  uniqueMap.set(sa.workNumber, sa);
}

const allWorkers = Array.from(uniqueMap.values());
console.log(`Total unique workers ready to deploy: ${allWorkers.length}`);

// Write to src/data/importedPickeurs.ts
const tsContent = `import { WorkerAccount } from '../types';

/**
 * Liste officielle et unique des comptes travailleurs (Workers & Pickeurs)
 * Structure : id ; name ; numero ; entropot ; ville ; mdp ; role
 */
export const IMPORTED_PICKEURS: WorkerAccount[] = ${JSON.stringify(allWorkers, null, 2)};
`;

fs.writeFileSync('src/data/importedPickeurs.ts', tsContent, 'utf-8');
console.log('Written to src/data/importedPickeurs.ts successfully.');

async function runDeploy() {
  console.log('1. Vérification des schémas public et api...');
  const clientPublic = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { db: { schema: 'public' } });
  const clientApi = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { db: { schema: 'api' } });

  const [resPub, resApi] = await Promise.all([
    clientPublic.from('workers').select('id').limit(1),
    clientApi.from('workers').select('id').limit(1),
  ]);

  let activeClient: any = clientPublic;
  let chosenSchema = 'public';

  if (!resPub.error) {
    console.log('Schéma trouvé: public');
    activeClient = clientPublic;
    chosenSchema = 'public';
  } else if (!resApi.error) {
    console.log('Schéma trouvé: api');
    activeClient = clientApi;
    chosenSchema = 'api';
  } else {
    console.log('Public error:', resPub.error.message);
    console.log('Api error:', resApi.error.message);
  }

  console.log(`Suppression des anciens comptes sur le schéma ${chosenSchema}...`);
  try {
    const { error: delErr } = await activeClient.from('workers').delete().neq('id', '___NONE___');
    if (delErr) console.warn('Delete warning:', delErr.message);
    else console.log('Anciens workers supprimés.');
  } catch (e: any) {
    console.warn('Delete exception:', e.message);
  }

  console.log(`2. Insertion des ${allWorkers.length} comptes par lots de 50...`);
  const batchSize = 50;
  let inserted = 0;
  for (let i = 0; i < allWorkers.length; i += batchSize) {
    const chunk = allWorkers.slice(i, i + batchSize).map((w) => ({
      id: w.id,
      work_number: w.workNumber,
      full_name: w.fullName,
      role: w.role,
      password: w.password || 'livry123',
      created_at: w.createdAt,
    }));

    const { error: insErr } = await activeClient.from('workers').upsert(chunk, { onConflict: 'work_number' });
    if (insErr) {
      console.error(`Batch ${i} error:`, insErr.message);
    } else {
      inserted += chunk.length;
      console.log(`Batch ${i}-${i + chunk.length} inséré.`);
    }
  }

  console.log(`✅ Déploiement terminé : ${inserted} comptes insérés dans Supabase (${chosenSchema}) !`);
}

runDeploy();

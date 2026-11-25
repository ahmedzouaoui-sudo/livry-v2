import React, { createContext, useContext, useEffect, useState, useCallback, useRef, useMemo } from 'react';
import {
  Department,
  Product,
  Role,
  TipPost,
  DataUpdateStatus,
  BarcodeVoteRecord,
  UserDevice,
  DeviceStats,
  GuideConfig,
} from '../types';
import { INITIAL_PRODUCTS } from '../data/initialProducts';
import { parseProductsFromCsv, exportProductsToCsv } from '../utils/csvImporter';
import {
  hasValidProductCode,
  hasProductBarcodes,
  isProductCodeXXXX,
  NoCodeVisibilitySettings,
} from '../utils/productUtils';
import {
  checkSupabaseHealth,
  fetchProductsFromSupabase,
  upsertProductInSupabase,
  deleteProductInSupabase,
  deleteProductsBatchInSupabase,
  seedProductsToSupabase,
  deleteAllProductsFromSupabase,
  fetchTipsFromSupabase,
  upsertTipInSupabase,
  deleteTipInSupabase,
  seedTipsToSupabase,
  fetchBarcodeVotesFromSupabase,
  saveBarcodeVoteToSupabase,
  SupabaseHealthCheckResult,
} from '../services/supabaseService';
import {
  registerDeviceEntry,
  sendDeviceHeartbeat,
  markDeviceOffline,
  fetchUserDevices,
} from '../services/deviceTrackerService';
import { supabasePublic, supabaseApi } from '../services/supabaseClient';
import { triggerHaptic } from '../utils/haptics';
import {
  ensureDailyBackup,
  recoverLatestSavedProducts,
  saveEmergencyCatalogSnapshot,
} from '../services/dailyBackupService';
import { sanitizeImageUrl } from '../utils/securityUtils';
import { logAppEvent } from '../services/activityLogService';
import {
  validatePersistedAdminSession,
  clearAdminSession,
  syncAdminAuthConfigFromCloud,
} from '../services/adminAuthService';
import {
  DEFAULT_GUIDE_CONFIG,
  getLocalGuideConfig,
  fetchGuideConfigFromCloud,
  saveGuideConfigToCloud,
} from '../services/guideContentService';

export type ActiveTab = 'home' | 'library' | 'admin' | 'tips' | 'suggest';

export interface SyncResult {
  success: boolean;
  count: number;
  addedCount: number;
  error?: string;
}

interface AppContextType {
  role: Role;
  setRole: (role: Role) => void;
  products: Product[];
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  selectedDepartment: Department | null;
  setSelectedDepartment: (dept: Department | null) => void;
  selectedProduct: Product | null;
  setSelectedProduct: (product: Product | null) => void;
  suggestInitialProduct: Product | null;
  setSuggestInitialProduct: (p: Product | null) => void;
  suggestActiveView: 'hub' | 'form' | 'missing';
  setSuggestActiveView: (view: 'hub' | 'form' | 'missing') => void;
  openSuggestForProduct: (p: Product) => void;
  openMissingProducts: () => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  toastMessage: string | null;
  showToast: (msg: string) => void;

  // Dark Mode Theme
  isDarkMode: boolean;
  toggleDarkMode: () => void;

  // User IP Tracking
  userIp: string | null;

  // Registered Phones & App Usage Time (Table: user_devices)
  userDevices: UserDevice[];
  deviceStats: DeviceStats | null;
  refreshUserDevices: () => Promise<void>;
  isLoadingDevices: boolean;

  // Community Barcode Voting (15 likes -> Valide, 15 dislikes -> auto deleted)
  barcodeVotes: Record<string, BarcodeVoteRecord>;
  voteBarcode: (barcode: string, type: 'like' | 'dislike') => {
    success: boolean;
    newLikes: number;
    newDislikes: number;
    isPromoted: boolean;
    isDeleted: boolean;
    message?: string;
  };
  resetBarcodeVotes: () => void;

  // Data status & update control (Green "À jour" vs Blue "Mise à jour")
  dataUpdateStatus: DataUpdateStatus;
  hasPendingUpdate: boolean;
  pendingProducts: Product[] | null;
  pendingUpdateMessage: string | null;
  checkForUpdates: (isManual?: boolean) => Promise<void>;
  applyUpdate: () => Promise<void>;
  dismissPendingUpdate: () => void;

  toggleProductStatus: (id: number) => Promise<void>;
  updateProduct: (updated: Product) => Promise<void>;
  addProduct: (newProduct: Omit<Product, 'id'>) => Promise<void>;
  duplicateProductsBulk: (ids: number[]) => Promise<Product[]>;
  deleteProduct: (id: number) => Promise<void>;
  deleteProductsBulk: (ids: number[]) => Promise<number>;
  restoreDeletedProducts: (items: Product[]) => Promise<number>;
  resetCatalogue: () => void;
  clearAllProducts: () => Promise<void>;
  restoreLatestBackupNow: () => Promise<void>;
  seedInitialCatalogueToSupabase: () => Promise<void>;
  syncWithSupabase: (isManual?: boolean) => Promise<SyncResult>;
  seedSupabase: () => Promise<void>;
  seedTips: () => Promise<void>;
  supabaseHealth: SupabaseHealthCheckResult | null;
  checkSupabaseStatus: () => Promise<SupabaseHealthCheckResult | null>;
  syncStatus: 'idle' | 'syncing' | 'synced' | 'error';
  isSyncing: boolean;
  syncProgress: { processed: number; total: number } | null;
  lastSyncTimestamp: string | null;
  importProductsCsv: (csvContent: string, mode?: 'merge' | 'replace') => { success: boolean; count: number; error?: string };
  exportCatalogueCsv: () => string;
  tips: TipPost[];
  addTip: (tip: Omit<TipPost, 'id' | 'createdAt' | 'likes'>) => Promise<{ success: boolean; error?: string }>;
  updateTip: (updated: TipPost) => Promise<{ success: boolean; error?: string }>;
  deleteTip: (id: string) => Promise<{ success: boolean; error?: string }>;
  likeTip: (id: string) => void;
  syncTipsNow: () => Promise<{
    success: boolean;
    count: number;
    targetTable?: 'astuces' | 'tips';
    needsTableSql?: boolean;
    error?: string;
  }>;
  restoreDefaultTips: () => Promise<{
    success: boolean;
    count: number;
    targetTable?: 'astuces' | 'tips';
    error?: string;
  }>;

  // Editable Full-Page Guide Configuration
  guideConfig: GuideConfig;
  updateGuideConfig: (nextConfig: GuideConfig) => Promise<{ success: boolean; config: GuideConfig; error?: string }>;
  resetGuideConfig: () => Promise<{ success: boolean; config: GuideConfig; error?: string }>;

  // Option "Sans Code" (articles sans code / code-barres restent visibles)
  noCodeSettings: NoCodeVisibilitySettings;
  toggleProductCodeDisabled: (id: number) => Promise<void>;
  bulkSetCodeDisabled: (mode: 'disable-missing' | 'enable-all-codes') => Promise<number>;
  setAllowAllWithoutCode: (enabled: boolean) => Promise<void>;
}

const STORAGE_KEY_PRODUCTS = 'finder_livry_products_v3';
const STORAGE_KEY_ROLE = 'finder_livry_role_v1';
const STORAGE_KEY_LAST_SYNC = 'finder_livry_last_sync_v3';
const STORAGE_KEY_TIPS = 'finder_livry_tips_v2';
const STORAGE_KEY_BARCODE_VOTES = 'finder_livry_barcode_votes_v2';
const STORAGE_KEY_DEVICE_VOTER_ID = 'finder_livry_device_voter_id';
const STORAGE_KEY_THEME = 'finder_livry_theme_v1';
const STORAGE_KEY_USER_IP = 'finder_livry_user_ip';

const getDeviceVoterId = (): string => {
  try {
    const savedIp = localStorage.getItem(STORAGE_KEY_USER_IP);
    if (savedIp) {
      return 'ip-' + savedIp.replace(/[^\w.-]/g, '_');
    }
    let id = localStorage.getItem(STORAGE_KEY_DEVICE_VOTER_ID);
    if (!id) {
      id = 'dev-' + Math.random().toString(36).substring(2, 10);
      localStorage.setItem(STORAGE_KEY_DEVICE_VOTER_ID, id);
    }
    return id;
  } catch {
    return 'dev-guest';
  }
};

export const INITIAL_BARCODE_VOTES: Record<string, BarcodeVoteRecord> = {
  '2000000060378': {
    barcode: '2000000060378',
    likes: 14,
    dislikes: 1,
    voters: {
      '1001': 'like',
      '1002': 'like',
      '1003': 'like',
    },
  },
};

export const INITIAL_TIPS: TipPost[] = [
  {
    id: 'tip-1',
    title: 'Scanner une étiquette humide ou froissée',
    content:
      'Aux rayons Boucherie et Surgelés, la buée ou le film plastique froissé empêche la douchette de biper. Astuce : Ouvrez la fiche produit sur Finder Livry et cliquez sur le bouton Plein écran pour scanner le code directement sur votre smartphone.',
    category: 'Scanner & Caisse',
    authorRole: 'Pickeur',
    authorName: 'Ahmed (Lead Pickeur)',
    targetAudience: 'Tous',
    createdAt: 'Il y a 2 jours',
    likes: 14,
  },
  {
    id: 'tip-2',
    title: 'Pesée balance en panne ou illisible',
    content:
      "Si la balance du rayon Fruits & Légumes ne sort pas de code, vérifiez l'unité du produit (ex: 500g ou 100g). Utilisez le stepper (-) et (+) pour multiplier le poids exact (ex: 100g x 5 = 500g). Le code-barres s'ajuste automatiquement avec la clé de pesée Marjane.",
    category: 'Pesée & Balance',
    authorRole: 'Pickeur',
    authorName: 'Yassine',
    targetAudience: 'Pickeur',
    createdAt: 'Il y a 3 jours',
    likes: 9,
  },
  {
    id: 'tip-3',
    title: 'Code XXXX ou produit non répertorié',
    content:
      "Les codes marqués XXXX sont masqués du catalogue public. Si vous rencontrez un article sans code au stand Fromage ou Boucherie, prenez une photo et transmettez le nom à l'Admin pour qu'il le saisisse dans le panneau d'import CSV.",
    category: 'Général',
    authorRole: 'Admin',
    authorName: 'Admin Livry',
    targetAudience: 'Tous',
    createdAt: 'Cette semaine',
    likes: 18,
  },
  {
    id: 'tip-4',
    title: 'Astuce rapidité pour les Livreurs en caisse',
    content:
      'Mettez la luminosité de votre téléphone à 100% avant d’arriver au tapis de caisse. Les douchettes laser Marjane bipent en moins de 0.2 seconde sur écran blanc lumineux.',
    category: 'Scanner & Caisse',
    authorRole: 'Livreur',
    authorName: 'Karim',
    targetAudience: 'Livreur',
    createdAt: 'Hier',
    likes: 12,
  },
];

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [barcodeVotes, setBarcodeVotes] = useState<Record<string, BarcodeVoteRecord>>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_BARCODE_VOTES);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.warn('Error reading barcode votes cache:', e);
    }
    return INITIAL_BARCODE_VOTES;
  });

  const barcodeVotesRef = useRef<Record<string, BarcodeVoteRecord>>(barcodeVotes);
  useEffect(() => {
    barcodeVotesRef.current = barcodeVotes;
  }, [barcodeVotes]);

  const isDarkMode = false;

  const [userIp, setUserIp] = useState<string | null>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY_USER_IP);
    } catch {
      return null;
    }
  });

  // Always enforce standard light mode and clear any legacy dark-mode cache
  useEffect(() => {
    try {
      document.documentElement.classList.remove('dark');
      localStorage.removeItem(STORAGE_KEY_THEME);
    } catch {}
  }, []);

  const toggleDarkMode = useCallback(() => {}, []);

  // Registered Phones & Usage State
  const [userDevices, setUserDevices] = useState<UserDevice[]>([]);
  const [deviceStats, setDeviceStats] = useState<DeviceStats | null>(null);
  const [isLoadingDevices, setIsLoadingDevices] = useState(false);

  const refreshUserDevices = useCallback(async () => {
    setIsLoadingDevices(true);
    try {
      const res = await fetchUserDevices();
      if (res.success) {
        setUserDevices(res.devices);
        setDeviceStats(res.stats);
      }
    } catch (err) {
      console.warn('Error fetching user devices:', err);
    } finally {
      setIsLoadingDevices(false);
    }
  }, []);

  // Fetch and save user IP + Auto-register device immediately
  useEffect(() => {
    let isCancelled = false;

    // 1. Immediate initial registration with existing or cached IP
    registerDeviceEntry()
      .then(() => {
        if (!isCancelled) refreshUserDevices();
      })
      .catch(() => {});

    const fetchIp = async () => {
      try {
        const res = await fetch('https://api.ipify.org?format=json');
        if (res.ok) {
          const data = await res.json();
          if (data && data.ip && !isCancelled) {
            setUserIp(data.ip);
            try {
              localStorage.setItem(STORAGE_KEY_USER_IP, data.ip);
            } catch {}
            // Re-sync with confirmed IP address
            registerDeviceEntry(data.ip)
              .then(() => {
                if (!isCancelled) refreshUserDevices();
              })
              .catch(() => {});
          }
        }
      } catch {
        // Fallback
        try {
          const res2 = await fetch('https://api64.ipify.org?format=json');
          if (res2.ok) {
            const data2 = await res2.json();
            if (data2 && data2.ip && !isCancelled) {
              setUserIp(data2.ip);
              try {
                localStorage.setItem(STORAGE_KEY_USER_IP, data2.ip);
              } catch {}
              registerDeviceEntry(data2.ip)
                .then(() => {
                  if (!isCancelled) refreshUserDevices();
                })
                .catch(() => {});
            }
          }
        } catch {}
      }
    };

    fetchIp().catch(() => {});

    // 2. Active usage time tracking: Heartbeat every 30 seconds while user is using the app
    const HEARTBEAT_INTERVAL_MS = 30000;
    const intervalId = window.setInterval(() => {
      if (typeof document !== 'undefined' && !document.hidden) {
        sendDeviceHeartbeat(30).catch(() => {});
      }
    }, HEARTBEAT_INTERVAL_MS);

    // 3. Visibility and unload listeners
    const handleVisibilityChange = () => {
      if (document.hidden) {
        sendDeviceHeartbeat(5).catch(() => {});
      } else {
        registerDeviceEntry().catch(() => {});
      }
    };

    const handleBeforeUnload = () => {
      markDeviceOffline();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      isCancelled = true;
      clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [refreshUserDevices]);

  // Role starts safely as Pickeur and upgrades ONLY after cryptographic session validation
  const [role, setRoleState] = useState<Role>('Pickeur');
  const roleRef = useRef<Role>('Pickeur');
  useEffect(() => {
    roleRef.current = role;
  }, [role]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await syncAdminAuthConfigFromCloud();
      const valid = await validatePersistedAdminSession();
      if (!cancelled) {
        setRoleState(valid ? 'Admin' : 'Pickeur');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const [guideConfig, setGuideConfig] = useState<GuideConfig>(() => getLocalGuideConfig());
  const guideConfigRef = useRef<GuideConfig>(guideConfig);
  useEffect(() => {
    guideConfigRef.current = guideConfig;
  }, [guideConfig]);

  const noCodeSettings = useMemo<NoCodeVisibilitySettings>(() => {
    const ids = guideConfig.noCodeSettings?.disabledCodeProductIds || [];
    return {
      allowAllWithoutCode: Boolean(guideConfig.noCodeSettings?.allowAllWithoutCode),
      disabledCodeProductIds: new Set<number>(ids),
    };
  }, [guideConfig.noCodeSettings]);

  const [products, setProducts] = useState<Product[]>(() => {
    try {
      const cached = localStorage.getItem(STORAGE_KEY_PRODUCTS);
      if (cached !== null) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const initNameMap = new Map(INITIAL_PRODUCTS.map((p) => [p.name.trim().toLowerCase(), p.imageUrl]));
          const initCodeMap = new Map(
            INITIAL_PRODUCTS.filter((p) => p.code && p.code !== '-' && p.code !== 'XXXX').map((p) => [
              p.code.toLowerCase(),
              p.imageUrl,
            ])
          );
          return parsed.map((p: Product) => {
            if (!p.imageUrl) {
              const matchedImg =
                (p.code ? initCodeMap.get(p.code.toLowerCase()) : undefined) ||
                initNameMap.get(p.name.trim().toLowerCase());
              if (matchedImg) return { ...p, imageUrl: matchedImg };
            }
            return p;
          });
        }
      }
    } catch (e) {
      console.warn('Error reading local cache:', e);
    }
    return INITIAL_PRODUCTS;
  });

  const [tips, setTips] = useState<TipPost[]>(() => {
    try {
      localStorage.removeItem('finder_livry_tips_v1');
      const cached = localStorage.getItem(STORAGE_KEY_TIPS);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Error reading local tips cache:', e);
    }
    return INITIAL_TIPS;
  });

  const tipsRef = useRef<TipPost[]>(tips);
  const tipsClearedIntentionallyRef = useRef(false);
  useEffect(() => {
    tipsRef.current = tips;
  }, [tips]);

  const [activeTab, setActiveTab] = useState<ActiveTab>('home');
  const [selectedDepartment, setSelectedDepartment] = useState<Department | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [suggestInitialProduct, setSuggestInitialProduct] = useState<Product | null>(null);
  const [suggestActiveView, setSuggestActiveView] = useState<'hub' | 'form' | 'missing'>('hub');

  const openSuggestForProduct = useCallback((p: Product) => {
    setSuggestInitialProduct(p);
    setSuggestActiveView('form');
    setActiveTab('suggest');
  }, []);

  const openMissingProducts = useCallback(() => {
    setSuggestActiveView('missing');
    setActiveTab('suggest');
  }, []);

  const [searchQuery, setSearchQuery] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'synced' | 'error'>('idle');
  const [syncProgress, setSyncProgress] = useState<{ processed: number; total: number } | null>(null);
  const [supabaseHealth, setSupabaseHealth] = useState<SupabaseHealthCheckResult | null>(null);
  const [lastSyncTimestamp, setLastSyncTimestamp] = useState<string | null>(() => {
    return localStorage.getItem(STORAGE_KEY_LAST_SYNC) || 'Catalogue prêt';
  });

  const [dataUpdateStatus, setDataUpdateStatus] = useState<DataUpdateStatus>('up-to-date');
  const [pendingProducts, setPendingProducts] = useState<Product[] | null>(null);
  const [pendingUpdateMessage, setPendingUpdateMessage] = useState<string | null>(null);

  const hasPendingUpdate = dataUpdateStatus === 'update-available';

  const productsRef = useRef<Product[]>(products);
  useEffect(() => {
    productsRef.current = products;
  }, [products]);

  const isSyncing = syncStatus === 'syncing' || dataUpdateStatus === 'updating';
  const syncingRef = useRef(false);
  const autoRecoveringRef = useRef(false);
  const lastAutoRecoveryAtRef = useRef(0);
  const intentionalClearUntilRef = useRef(0);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 3500);
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_PRODUCTS, JSON.stringify(products));
      if (products.length >= 10) {
        saveEmergencyCatalogSnapshot(products);
      }
    } catch (e) {
      console.warn('Local storage write limit or error:', e);
    }
  }, [products]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_TIPS, JSON.stringify(tips));
    } catch (e) {
      console.warn('Tips storage error:', e);
    }
  }, [tips]);

  const runZeroArticleAutoRecovery = useCallback(
    async (pushToSupabase = true, force = false): Promise<boolean> => {
      if (autoRecoveringRef.current) return false;
      const now = Date.now();
      if (!force && now < intentionalClearUntilRef.current) return false;
      if (!force && now - lastAutoRecoveryAtRef.current < 15000) return false;

      autoRecoveringRef.current = true;
      lastAutoRecoveryAtRef.current = now;
      try {
        const recovered = await recoverLatestSavedProducts();
        if (!recovered.products || recovered.products.length === 0) {
          return false;
        }

        setProducts(recovered.products);
        try {
          localStorage.setItem(STORAGE_KEY_PRODUCTS, JSON.stringify(recovered.products));
        } catch {}

        if (pushToSupabase && (typeof navigator === 'undefined' || navigator.onLine)) {
          await seedProductsToSupabase(recovered.products).catch(() => {});
        }

        const nowTime = new Date().toLocaleTimeString('fr-FR', {
          hour: '2-digit',
          minute: '2-digit',
        });
        const note = `Restauré auto (${recovered.products.length} articles à ${nowTime})`;
        setLastSyncTimestamp(note);
        try {
          localStorage.setItem(STORAGE_KEY_LAST_SYNC, note);
        } catch {}
        setSyncStatus('synced');

        logAppEvent({
          category: 'BACKUP',
          action: 'CATALOGUE_AUTO_RECOVERED',
          actorRole: roleRef.current,
          target: recovered.sourceLabel,
          details: `Catalogue vide (0 article) restauré automatiquement : ${recovered.products.length} articles récupérés depuis "${recovered.sourceLabel}".`,
        }).catch(() => {});

        triggerHaptic('success');
        showToast(
          `🔄 0 article détecté : ${recovered.products.length} articles restaurés (${recovered.sourceLabel})`
        );
        return true;
      } catch (err) {
        console.warn('[AutoRecovery] Error:', err);
        return false;
      } finally {
        autoRecoveringRef.current = false;
      }
    },
    [showToast]
  );

  // Guard startup: if cached products ever start at 0, recover automatically
  useEffect(() => {
    if (productsRef.current.length === 0) {
      runZeroArticleAutoRecovery(false, true).catch(() => {});
    }
  }, [runZeroArticleAutoRecovery]);

  const checkSupabaseStatus = useCallback(async () => {
    try {
      const health = await checkSupabaseHealth();
      setSupabaseHealth(health);
      return health;
    } catch (err) {
      console.warn('Supabase health check error:', err);
      return null;
    }
  }, []);

  const getProductFingerprint = (p: Product): string =>
    [
      p.id,
      p.code,
      p.name,
      p.department,
      p.category,
      p.quantite || '',
      p.isEnabled ? '1' : '0',
      p.codeDisabled ? '1' : '0',
      p.verificationStatus || (p.isVerified100 ? '100' : 'none'),
      p.imageUrl || '',
      p.barcodeMarjane || '',
      p.barcodeP2 || '',
      p.barcodeInterne || '',
      p.barcodeMiniSecours || '',
      p.barcodeSecours || '',
      p.barcodeP3 || '',
    ].join('|');

  const checkForUpdates = useCallback(
    async (isSilent = true): Promise<void> => {
      if (syncingRef.current) return;
      if (typeof navigator !== 'undefined' && !navigator.onLine) return;
      syncingRef.current = true;
      try {
        const health = await checkSupabaseHealth();
        setSupabaseHealth(health);
        if (!health.connected || !health.tableExists) {
          if (productsRef.current.length === 0) {
            await runZeroArticleAutoRecovery(false);
          }
          return;
        }

        const [res, tipsRes, votesRes] = await Promise.all([
          fetchProductsFromSupabase(),
          fetchTipsFromSupabase(),
          fetchBarcodeVotesFromSupabase(),
        ]);

        if (res.success && res.products.length === 0) {
          // 0 articles in Supabase -> auto-recover latest saved catalog
          await runZeroArticleAutoRecovery(true);
        } else if (res.success && res.products.length > 0) {
          const remoteList = res.products;
          const currentList = productsRef.current;

          const currentFingerprints = new Set(currentList.map(getProductFingerprint));
          const hasDifferentItems =
            remoteList.length !== currentList.length ||
            remoteList.some((p) => !currentFingerprints.has(getProductFingerprint(p)));

          if (hasDifferentItems) {
            // Safety backup: if remote suddenly has many fewer products (e.g. accidental DB wipe),
            // preserve the larger local catalog in a dedicated backup key before updating
            if (currentList.length >= remoteList.length + 20) {
              saveEmergencyCatalogSnapshot(currentList);
            }
            setProducts(remoteList);
            // Keep currently opened product modal fresh if its data changed remotely
            setSelectedProduct((prevSelected) => {
              if (!prevSelected) return prevSelected;
              const updatedMatch = remoteList.find((item) => item.id === prevSelected.id);
              if (!updatedMatch) return prevSelected;
              return getProductFingerprint(updatedMatch) !== getProductFingerprint(prevSelected)
                ? updatedMatch
                : prevSelected;
            });

            const nowTime = new Date().toLocaleTimeString('fr-FR', {
              hour: '2-digit',
              minute: '2-digit',
            });
            const note = `À jour automatiquement (${remoteList.length} articles à ${nowTime})`;
            setLastSyncTimestamp(note);
            localStorage.setItem(STORAGE_KEY_LAST_SYNC, note);
            setSyncStatus('synced');

            if (!isSilent) {
              triggerHaptic('success');
              showToast(`✅ Catalogue mis à jour (${remoteList.length} articles)`);
            }
          } else {
            if (!isSilent) {
              triggerHaptic('success');
              showToast(`✅ Votre catalogue est déjà à jour (${currentList.length} articles)`);
            }
          }

          setDataUpdateStatus('up-to-date');
          setPendingProducts(null);
          setPendingUpdateMessage(null);

          // Automatic daily backup once per day (throttled & guarded against empty wipes)
          if (remoteList.length >= 10) {
            ensureDailyBackup(remoteList).catch(() => {});
          }
        }

        if (tipsRes.success) {
          if (tipsRes.tips.length > 0) {
            setTips(tipsRes.tips);
          } else if (!tipsClearedIntentionallyRef.current) {
            const toRestore = tipsRef.current.length > 0 ? tipsRef.current : INITIAL_TIPS;
            setTips(toRestore);
            seedTipsToSupabase(toRestore).catch(() => {});
          }
        }

        fetchGuideConfigFromCloud()
          .then((cfg) => setGuideConfig(cfg))
          .catch(() => {});

        if (votesRes.success && Object.keys(votesRes.votes).length > 0) {
          setBarcodeVotes((prev) => ({
            ...prev,
            ...votesRes.votes,
          }));
        }
      } catch (err) {
        console.warn('[AutoUpdate] Error:', err);
      } finally {
        syncingRef.current = false;
      }
    },
    [runZeroArticleAutoRecovery, showToast]
  );

  const applyUpdate = useCallback(async (): Promise<void> => {
    setDataUpdateStatus('updating');
    setSyncStatus('syncing');

    try {
      const [res, tipsRes, freshGuide] = await Promise.all([
        fetchProductsFromSupabase(),
        fetchTipsFromSupabase(),
        fetchGuideConfigFromCloud().catch(() => null),
      ]);
      if (tipsRes.success) {
        if (tipsRes.tips.length > 0) {
          setTips(tipsRes.tips);
        } else if (!tipsClearedIntentionallyRef.current) {
          const toRestore = tipsRef.current.length > 0 ? tipsRef.current : INITIAL_TIPS;
          setTips(toRestore);
          seedTipsToSupabase(toRestore).catch(() => {});
        }
      }
      if (freshGuide) {
        setGuideConfig(freshGuide);
      }
      if (res.success && res.products.length === 0) {
        setDataUpdateStatus('up-to-date');
        await runZeroArticleAutoRecovery(true);
      } else if (res.success) {
        const remoteList = res.products;
        setProducts(remoteList);
        setDataUpdateStatus('up-to-date');
        setPendingProducts(null);
        setPendingUpdateMessage(null);

        const nowTime = new Date().toLocaleTimeString('fr-FR', {
          hour: '2-digit',
          minute: '2-digit',
        });
        const note = `À jour (${remoteList.length} articles synchronisés à ${nowTime})`;
        setLastSyncTimestamp(note);
        localStorage.setItem(STORAGE_KEY_LAST_SYNC, note);
        setSyncStatus('synced');
        checkSupabaseHealth().then(setSupabaseHealth).catch(() => {});

        logAppEvent({
          category: 'SYSTEM',
          action: 'MANUAL_SYNC',
          actorRole: roleRef.current,
          target: 'Catalogue Supabase',
          details: `Synchronisation manuelle réussie (${remoteList.length} articles).`,
        }).catch(() => {});

        triggerHaptic('success');
        showToast(`✅ Catalogue à jour : ${remoteList.length} articles disponibles !`);
      } else {
        setDataUpdateStatus('up-to-date');
        setSyncStatus('error');
        showToast(`⚠️ Supabase : ${res.error || 'Erreur réseau'}`);
      }
    } catch (err: any) {
      setDataUpdateStatus('up-to-date');
      setSyncStatus('error');
      showToast(`❌ Erreur : ${err.message}`);
    }
  }, [runZeroArticleAutoRecovery, showToast]);

  const dismissPendingUpdate = useCallback(() => {
    setPendingUpdateMessage(null);
  }, []);

  const syncWithSupabase = useCallback(
    async (isManual = false): Promise<SyncResult> => {
      if (isManual) {
        await applyUpdate();
        return { success: true, count: productsRef.current.length, addedCount: 0 };
      }
      await checkForUpdates(true);
      return { success: true, count: productsRef.current.length, addedCount: 0 };
    },
    [applyUpdate, checkForUpdates]
  );

  // Initial automatic sync + Supabase Realtime auto-updates
  useEffect(() => {
    let isMounted = true;
    let votesChannel: any = null;
    let productsChannel: any = null;
    let tipsChannel: any = null;
    let astucesChannel: any = null;
    let realtimeDebounce: ReturnType<typeof setTimeout> | null = null;

    const triggerDebouncedAutoSync = () => {
      if (realtimeDebounce) clearTimeout(realtimeDebounce);
      realtimeDebounce = setTimeout(() => {
        if (isMounted) {
          checkForUpdates(true).catch(() => {});
        }
      }, 800);
    };

    const initCheck = async () => {
      const health = await checkSupabaseHealth();
      if (!isMounted) return;
      setSupabaseHealth(health);

      if (health.connected && health.tableExists) {
        await checkForUpdates(true);

        const rtClient = health.schema === 'api' ? supabaseApi : supabasePublic;
        const rtSchema = health.schema === 'api' ? 'api' : 'public';

        try {
          productsChannel = rtClient
            .channel(`${rtSchema}:products_live`)
            .on(
              'postgres_changes',
              { event: '*', schema: rtSchema, table: 'products' },
              () => {
                triggerDebouncedAutoSync();
              }
            )
            .subscribe();
        } catch (e) {
          console.warn('Realtime subscription notice for products:', e);
        }

        try {
          tipsChannel = rtClient
            .channel(`${rtSchema}:tips_live`)
            .on(
              'postgres_changes',
              { event: '*', schema: rtSchema, table: 'tips' },
              async () => {
                const [freshTips, freshGuide] = await Promise.all([
                  fetchTipsFromSupabase(),
                  fetchGuideConfigFromCloud().catch(() => null),
                ]);
                if (freshTips.success && freshTips.tips.length > 0 && isMounted) {
                  setTips(freshTips.tips);
                }
                if (freshGuide && isMounted) {
                  setGuideConfig(freshGuide);
                }
              }
            )
            .subscribe();
        } catch (e) {
          console.warn('Realtime subscription notice for tips:', e);
        }

        try {
          astucesChannel = rtClient
            .channel(`${rtSchema}:astuces_live`)
            .on(
              'postgres_changes',
              { event: '*', schema: rtSchema, table: 'astuces' },
              async () => {
                const freshTips = await fetchTipsFromSupabase();
                if (freshTips.success && isMounted) {
                  if (freshTips.tips.length > 0 || tipsClearedIntentionallyRef.current) {
                    setTips(freshTips.tips);
                  }
                }
              }
            )
            .subscribe();
        } catch (e) {
          console.warn('Realtime notice for astuces:', e);
        }

        try {
          votesChannel = rtClient
            .channel(`${rtSchema}:barcode_votes_live`)
            .on(
              'postgres_changes',
              { event: '*', schema: rtSchema, table: 'barcode_votes' },
              async () => {
                const fresh = await fetchBarcodeVotesFromSupabase();
                if (fresh.success && isMounted) {
                  setBarcodeVotes((prev) => ({
                    ...prev,
                    ...fresh.votes,
                  }));
                }
              }
            )
            .subscribe();
        } catch (e) {
          console.warn('Realtime subscription notice for barcode_votes:', e);
        }
      }
    };

    initCheck();
    return () => {
      isMounted = false;
      if (realtimeDebounce) clearTimeout(realtimeDebounce);
      if (productsChannel) {
        try {
          supabasePublic.removeChannel(productsChannel);
          supabaseApi.removeChannel(productsChannel);
        } catch {}
      }
      if (tipsChannel) {
        try {
          supabasePublic.removeChannel(tipsChannel);
          supabaseApi.removeChannel(tipsChannel);
        } catch {}
      }
      if (astucesChannel) {
        try {
          supabasePublic.removeChannel(astucesChannel);
          supabaseApi.removeChannel(astucesChannel);
        } catch {}
      }
      if (votesChannel) {
        try {
          supabasePublic.removeChannel(votesChannel);
          supabaseApi.removeChannel(votesChannel);
        } catch {}
      }
    };
  }, [checkForUpdates]);

  // Continuous automatic background updates (interval + tab focus + network reconnect)
  useEffect(() => {
    const intervalId = setInterval(() => {
      if (document.visibilityState === 'visible') {
        checkForUpdates(true).catch(console.warn);
      }
    }, 30000);

    const handleAutoRefresh = () => {
      if (document.visibilityState === 'visible') {
        checkForUpdates(true).catch(console.warn);
      }
    };

    window.addEventListener('focus', handleAutoRefresh);
    window.addEventListener('online', handleAutoRefresh);
    document.addEventListener('visibilitychange', handleAutoRefresh);

    return () => {
      clearInterval(intervalId);
      window.removeEventListener('focus', handleAutoRefresh);
      window.removeEventListener('online', handleAutoRefresh);
      document.removeEventListener('visibilitychange', handleAutoRefresh);
    };
  }, [checkForUpdates]);

  // Automatic Nightly File Backup scheduler (startup + every 15 min for 22:00 nightly window & midnight rollover)
  useEffect(() => {
    const runNightlyBackupCheck = () => {
      if (typeof navigator !== 'undefined' && !navigator.onLine) return;
      if (productsRef.current.length >= 10) {
        ensureDailyBackup(productsRef.current).catch(() => {});
      }
    };

    const startupTimer = window.setTimeout(runNightlyBackupCheck, 4500);
    const nightlyInterval = window.setInterval(() => {
      if (typeof document === 'undefined' || document.visibilityState === 'visible') {
        runNightlyBackupCheck();
      }
    }, 15 * 60 * 1000);

    window.addEventListener('online', runNightlyBackupCheck);

    return () => {
      clearTimeout(startupTimer);
      clearInterval(nightlyInterval);
      window.removeEventListener('online', runNightlyBackupCheck);
    };
  }, []);

  const requireAdmin = useCallback(
    (actionName: string): boolean => {
      if (roleRef.current === 'Admin') return true;
      logAppEvent({
        category: 'AUTH',
        action: 'UNAUTHORIZED_ADMIN_ATTEMPT',
        actorRole: roleRef.current,
        target: actionName,
        details: `Tentative non autorisée bloquée (${actionName}) sans session Admin active.`,
      }).catch(() => {});
      showToast('🔒 Action réservée à l’Administrateur Data.');
      return false;
    },
    [showToast]
  );

  const toggleProductStatus = useCallback(
    async (id: number) => {
      if (!requireAdmin('toggleProductStatus')) return;
      const target = productsRef.current.find((p) => p.id === id);
      if (!target) return;
      const updated = { ...target, isEnabled: !target.isEnabled };
      setProducts((prev) => prev.map((p) => (p.id === id ? updated : p)));
      const res = await upsertProductInSupabase(updated);
      if (!res.success && res.error) {
        showToast(`⚠️ Sauvegarde locale OK mais erreur Supabase : ${res.error}`);
      }

      logAppEvent({
        category: 'PRODUCT',
        action: 'PRODUCT_VISIBILITY_CHANGED',
        actorRole: roleRef.current,
        target: `#${target.id} ${target.name}`,
        details: updated.isEnabled
          ? `Produit rendu Visible (${target.code})`
          : `Produit Masqué (${target.code})`,
      }).catch(() => {});
    },
    [requireAdmin, showToast]
  );

  const updateProduct = useCallback(
    async (updatedRaw: Product) => {
      const prev = productsRef.current.find((p) => p.id === updatedRaw.id);
      const sanitizedImg = updatedRaw.imageUrl ? sanitizeImageUrl(updatedRaw.imageUrl) : undefined;
      const updated: Product = {
        ...updatedRaw,
        imageUrl: sanitizedImg || undefined,
      };

      setProducts((prevList) => prevList.map((p) => (p.id === updated.id ? updated : p)));
      const res = await upsertProductInSupabase(updated);
      if (!res.success && res.error) {
        showToast(`⚠️ Modifié localement · Erreur sync Supabase : ${res.error}`);
      }

      // Synchroniser le statut codeDisabled dans guideConfig (pour garantie cloud multi-appareils)
      const currentCfg = guideConfigRef.current;
      const currentIds = new Set<number>(currentCfg.noCodeSettings?.disabledCodeProductIds || []);
      const wasInCloudList = currentIds.has(updated.id);
      const nextDisabledFlag = Boolean(updated.codeDisabled);
      if (Boolean(prev?.codeDisabled) !== nextDisabledFlag || wasInCloudList !== nextDisabledFlag) {
        if (nextDisabledFlag) {
          currentIds.add(updated.id);
        } else {
          currentIds.delete(updated.id);
        }
        const nextCfg: GuideConfig = {
          ...currentCfg,
          noCodeSettings: {
            allowAllWithoutCode: Boolean(currentCfg.noCodeSettings?.allowAllWithoutCode),
            disabledCodeProductIds: Array.from(currentIds),
          },
        };
        saveGuideConfigToCloud(nextCfg)
          .then((saved) => setGuideConfig(saved.config))
          .catch(() => {});
      }

      const formatVStatus = (v?: string) => {
        if (v === '100') return '100% Khdam (Bleu)';
        if (v === '50') return '50% Khdam (Orange)';
        if (v === 'broken') return 'Makhdamch daba (Rouge)';
        return 'Aucune';
      };

      if (prev) {
        const changes: string[] = [];
        const prevV = prev.verificationStatus || (prev.isVerified100 ? '100' : 'none');
        const nextV = updated.verificationStatus || (updated.isVerified100 ? '100' : 'none');

        if (prev.code !== updated.code) changes.push(`Code: "${prev.code}" → "${updated.code}"`);
        if (prev.name !== updated.name) changes.push(`Nom: "${prev.name}" → "${updated.name}"`);
        if (prev.department !== updated.department) changes.push(`Rayon: "${prev.department}" → "${updated.department}"`);
        if (prev.category !== updated.category) changes.push(`Catégorie: "${prev.category}" → "${updated.category}"`);
        if (prev.quantite !== updated.quantite) changes.push(`Unité: "${prev.quantite || '-'}" → "${updated.quantite || '-'}"`);
        if (prev.isEnabled !== updated.isEnabled) changes.push(`Visibilité: ${prev.isEnabled ? 'Visible' : 'Masqué'} → ${updated.isEnabled ? 'Visible' : 'Masqué'}`);
        if ((prev.imageUrl || '') !== (updated.imageUrl || '')) changes.push(`Image modifiée`);
        if ((prev.barcodeMarjane || '') !== (updated.barcodeMarjane || '')) changes.push(`Marjane: "${prev.barcodeMarjane || '-'}" → "${updated.barcodeMarjane || '-'}"`);
        if ((prev.barcodeP2 || '') !== (updated.barcodeP2 || '')) changes.push(`Marjane 2: "${prev.barcodeP2 || '-'}" → "${updated.barcodeP2 || '-'}"`);
        if ((prev.barcodeInterne || '') !== (updated.barcodeInterne || '')) changes.push(`Interne: "${prev.barcodeInterne || '-'}" → "${updated.barcodeInterne || '-'}"`);
        if ((prev.barcodeMiniSecours || '') !== (updated.barcodeMiniSecours || '')) changes.push(`Mini: "${prev.barcodeMiniSecours || '-'}" → "${updated.barcodeMiniSecours || '-'}"`);
        if ((prev.barcodeSecours || '') !== (updated.barcodeSecours || '')) changes.push(`Sec: "${prev.barcodeSecours || '-'}" → "${updated.barcodeSecours || '-'}"`);
        if ((prev.barcodeP3 || '') !== (updated.barcodeP3 || '')) changes.push(`Sec 2: "${prev.barcodeP3 || '-'}" → "${updated.barcodeP3 || '-'}"`);
        if (prevV !== nextV) changes.push(`Statut Icône: ${formatVStatus(prevV)} → ${formatVStatus(nextV)}`);

        const onlyVerificationChanged = changes.length === 1 && prevV !== nextV;
        logAppEvent({
          category: onlyVerificationChanged ? 'VERIFICATION' : 'PRODUCT',
          action: onlyVerificationChanged
            ? `BADGE_STATUS_${nextV.toUpperCase()}`
            : 'PRODUCT_UPDATED',
          actorRole: roleRef.current,
          target: `#${updated.id} ${updated.name} (Code: ${updated.code})`,
          details: changes.length > 0 ? changes.join(' | ') : 'Produit ré-enregistré sans changement.',
        }).catch(() => {});
      } else {
        logAppEvent({
          category: 'PRODUCT',
          action: 'PRODUCT_UPDATED',
          actorRole: roleRef.current,
          target: `#${updated.id} ${updated.name}`,
          details: `Mise à jour produit (${updated.code}).`,
        }).catch(() => {});
      }
    },
    [showToast]
  );

  const addProduct = useCallback(
    async (newProduct: Omit<Product, 'id'>) => {
      const maxId = productsRef.current.reduce((max, p) => Math.max(max, p.id), 0);
      const sanitizedImg = newProduct.imageUrl ? sanitizeImageUrl(newProduct.imageUrl) : undefined;
      const productWithId: Product = {
        ...newProduct,
        imageUrl: sanitizedImg || undefined,
        id: maxId + 1,
      };
      setProducts((prev) => [productWithId, ...prev]);
      const res = await upsertProductInSupabase(productWithId);
      if (!res.success && res.error) {
        showToast(`⚠️ Ajouté localement · Erreur sync Supabase : ${res.error}`);
      }

      if (productWithId.codeDisabled) {
        const currentCfg = guideConfigRef.current;
        const nextIds = Array.from(
          new Set([...(currentCfg.noCodeSettings?.disabledCodeProductIds || []), productWithId.id])
        );
        saveGuideConfigToCloud({
          ...currentCfg,
          noCodeSettings: {
            allowAllWithoutCode: Boolean(currentCfg.noCodeSettings?.allowAllWithoutCode),
            disabledCodeProductIds: nextIds,
          },
        })
          .then((saved) => setGuideConfig(saved.config))
          .catch(() => {});
      }

      logAppEvent({
        category: 'PRODUCT',
        action: 'PRODUCT_CREATED',
        actorRole: roleRef.current,
        target: `#${productWithId.id} ${productWithId.name}`,
        details: `Nouveau produit ajouté (Code: ${productWithId.code}, Rayon: ${productWithId.department}, Unité: ${productWithId.quantite || 'pièce'}).`,
      }).catch(() => {});
    },
    [showToast]
  );

  const duplicateProductsBulk = useCallback(
    async (ids: number[]): Promise<Product[]> => {
      if (!requireAdmin('duplicateProductsBulk')) return [];
      if (!ids || ids.length === 0) return [];
      const idSet = new Set(ids);
      const sources = productsRef.current.filter((p) => idSet.has(p.id));
      if (sources.length === 0) return [];

      let nextId = productsRef.current.reduce((max, p) => Math.max(max, p.id), 0) + 1;
      const clones: Product[] = sources.map((src) => {
        const cleanName = (src.name || 'Article').trim();
        const copyName = cleanName.endsWith('(Copie)') ? cleanName : `${cleanName} (Copie)`;
        const clone: Product = {
          ...src,
          id: nextId++,
          name: copyName,
        };
        return clone;
      });

      setProducts((prev) => [...clones, ...prev]);

      const disabledCloneIds = clones.filter((c) => c.codeDisabled).map((c) => c.id);
      if (disabledCloneIds.length > 0) {
        const currentCfg = guideConfigRef.current;
        const nextIds = Array.from(
          new Set([...(currentCfg.noCodeSettings?.disabledCodeProductIds || []), ...disabledCloneIds])
        );
        saveGuideConfigToCloud({
          ...currentCfg,
          noCodeSettings: {
            allowAllWithoutCode: Boolean(currentCfg.noCodeSettings?.allowAllWithoutCode),
            disabledCodeProductIds: nextIds,
          },
        })
          .then((saved) => setGuideConfig(saved.config))
          .catch(() => {});
      }

      const res = await seedProductsToSupabase(clones);
      if (!res.success && res.error) {
        showToast(`⚠️ ${clones.length} dupliqué(s) localement · Erreur Supabase : ${res.error}`);
      }

      logAppEvent({
        category: 'PRODUCT',
        action: 'PRODUCT_BULK_DUPLICATED',
        actorRole: roleRef.current,
        target: `${clones.length} articles`,
        details: `Duplication groupée de ${clones.length} produit(s) : ${clones
          .slice(0, 5)
          .map((c) => c.name)
          .join(', ')}${clones.length > 5 ? '...' : ''}.`,
      }).catch(() => {});

      return clones;
    },
    [requireAdmin, showToast]
  );

  const deleteProduct = useCallback(
    async (id: number) => {
      if (!requireAdmin('deleteProduct')) return;
      const target = productsRef.current.find((p) => p.id === id);
      const remainingCount = productsRef.current.filter((p) => p.id !== id).length;
      if (remainingCount === 0) {
        intentionalClearUntilRef.current = Date.now() + 60000;
      }
      setProducts((prev) => prev.filter((p) => p.id !== id));
      setSelectedProduct((prev) => (prev && prev.id === id ? null : prev));
      const res = await deleteProductInSupabase(id);
      if (!res.success && res.error) {
        showToast(`⚠️ Supprimé localement · Erreur Supabase : ${res.error}`);
      }

      logAppEvent({
        category: 'PRODUCT',
        action: 'PRODUCT_DELETED',
        actorRole: roleRef.current,
        target: target ? `#${id} ${target.name} (${target.code})` : `#${id}`,
        details: target
          ? `Article "${target.name}" (Code: ${target.code}) supprimé du catalogue.`
          : `Article #${id} supprimé du catalogue.`,
      }).catch(() => {});
    },
    [requireAdmin, showToast]
  );

  const deleteProductsBulk = useCallback(
    async (ids: number[]): Promise<number> => {
      if (!requireAdmin('deleteProductsBulk')) return 0;
      if (!ids || ids.length === 0) return 0;
      const idSet = new Set(ids);
      const targets = productsRef.current.filter((p) => idSet.has(p.id));
      if (targets.length === 0) return 0;

      if (targets.length >= 10 && productsRef.current.length >= 10) {
        saveEmergencyCatalogSnapshot(productsRef.current);
      }

      const remainingCount = productsRef.current.length - targets.length;
      if (remainingCount <= 0) {
        intentionalClearUntilRef.current = Date.now() + 120000;
      }

      setProducts((prev) => prev.filter((p) => !idSet.has(p.id)));
      setSelectedProduct((prev) => (prev && idSet.has(prev.id) ? null : prev));

      const res = await deleteProductsBatchInSupabase(Array.from(idSet));
      if (!res.success && res.error) {
        showToast(`⚠️ ${targets.length} supprimé(s) localement · Erreur Supabase : ${res.error}`);
      }

      logAppEvent({
        category: 'PRODUCT',
        action: 'PRODUCT_BULK_DELETED',
        actorRole: roleRef.current,
        target: `${targets.length} articles`,
        details: `Suppression groupée de ${targets.length} produit(s) : ${targets
          .slice(0, 5)
          .map((t) => t.name)
          .join(', ')}${targets.length > 5 ? '...' : ''}.`,
      }).catch(() => {});

      return targets.length;
    },
    [requireAdmin, showToast]
  );

  const restoreDeletedProducts = useCallback(
    async (items: Product[]): Promise<number> => {
      if (!requireAdmin('restoreDeletedProducts')) return 0;
      if (!items || items.length === 0) return 0;

      setProducts((prev) => {
        const existingIds = new Set(prev.map((p) => p.id));
        const toAdd = items.filter((item) => !existingIds.has(item.id));
        return [...toAdd, ...prev];
      });

      const res = await seedProductsToSupabase(items);
      if (!res.success && res.error) {
        showToast(`⚠️ Restauré localement · Erreur Supabase : ${res.error}`);
      } else {
        showToast(`↩️ ${items.length} produit${items.length > 1 ? 's' : ''} restauré${items.length > 1 ? 's' : ''} !`);
      }
      return items.length;
    },
    [requireAdmin, showToast]
  );

  const resetCatalogue = useCallback(() => {
    if (!requireAdmin('resetCatalogue')) return;
    setProducts(INITIAL_PRODUCTS);
    localStorage.setItem(STORAGE_KEY_PRODUCTS, JSON.stringify(INITIAL_PRODUCTS));
    logAppEvent({
      category: 'SYSTEM',
      action: 'CATALOGUE_RESET',
      actorRole: roleRef.current,
      target: 'Catalogue Local',
      details: `Réinitialisation aux ${INITIAL_PRODUCTS.length} articles par défaut.`,
    }).catch(() => {});
    showToast('Catalogue réinitialisé aux produits par défaut.');
  }, [requireAdmin, showToast]);

  const clearAllProducts = useCallback(async () => {
    if (!requireAdmin('clearAllProducts')) return;
    const previousCount = productsRef.current.length;
    if (previousCount >= 10) {
      saveEmergencyCatalogSnapshot(productsRef.current);
    }
    intentionalClearUntilRef.current = Date.now() + 120000;
    setProducts([]);
    localStorage.setItem(STORAGE_KEY_PRODUCTS, JSON.stringify([]));
    await deleteAllProductsFromSupabase();
    logAppEvent({
      category: 'SYSTEM',
      action: 'CATALOGUE_CLEARED',
      actorRole: roleRef.current,
      target: 'Catalogue Complet',
      details: `Suppression de tous les produits (${previousCount} articles supprimés).`,
    }).catch(() => {});
    showToast('Tous les produits ont été supprimés.');
  }, [requireAdmin, showToast]);

  const restoreLatestBackupNow = useCallback(async () => {
    await runZeroArticleAutoRecovery(true, true);
  }, [runZeroArticleAutoRecovery]);

  const seedInitialCatalogueToSupabase = useCallback(async () => {
    if (!requireAdmin('seedInitialCatalogueToSupabase')) return;
    setSyncStatus('syncing');
    try {
      const res = await seedProductsToSupabase(INITIAL_PRODUCTS);
      if (res.success) {
        setProducts(INITIAL_PRODUCTS);
        setSyncStatus('synced');
        logAppEvent({
          category: 'IMPORT_EXPORT',
          action: 'SUPABASE_SEED_INITIAL',
          actorRole: roleRef.current,
          target: 'Supabase Products',
          details: `Base Supabase initialisée avec ${res.count} articles.`,
        }).catch(() => {});
        showToast(`Base Supabase initialisée avec ${res.count} articles.`);
      } else {
        setSyncStatus('error');
        showToast(`Erreur : ${res.error}`);
      }
    } catch (err: any) {
      setSyncStatus('error');
      showToast(`Erreur : ${err.message}`);
    }
  }, [requireAdmin, showToast]);

  const seedSupabase = useCallback(async () => {
    if (!requireAdmin('seedSupabase')) return;
    if (productsRef.current.length === 0) {
      showToast('⚠️ Catalogue local vide : utilisez la restauration avant d’envoyer.');
      return;
    }
    setSyncStatus('syncing');
    try {
      saveEmergencyCatalogSnapshot(productsRef.current);
      const res = await seedProductsToSupabase(productsRef.current);
      if (res.success) {
        if (tipsRef.current.length > 0) {
          await seedTipsToSupabase(tipsRef.current).catch(() => {});
        }
        await saveGuideConfigToCloud(guideConfig).catch(() => {});
        setSyncStatus('synced');
        checkSupabaseHealth().then(setSupabaseHealth).catch(() => {});
        logAppEvent({
          category: 'IMPORT_EXPORT',
          action: 'SUPABASE_PUSH_ALL',
          actorRole: roleRef.current,
          target: 'Supabase Products',
          details: `${res.count} articles envoyés vers Supabase.`,
        }).catch(() => {});
        triggerHaptic('success');
        showToast(`✅ ${res.count} articles + astuces + guide envoyés vers Supabase !`);
      } else {
        setSyncStatus('error');
        showToast(`Erreur : ${res.error}`);
      }
    } catch (err: any) {
      setSyncStatus('error');
      showToast(`Erreur : ${err.message}`);
    }
  }, [guideConfig, requireAdmin, showToast]);

  const seedTips = useCallback(async () => {
    if (!requireAdmin('seedTips')) return;
    try {
      const merged = tipsRef.current.length > 0 ? tipsRef.current : INITIAL_TIPS;
      const res = await seedTipsToSupabase(merged);
      setTips(merged);
      if (res.success) {
        showToast(
          `✅ ${res.count} astuces sauvegardées sur Supabase (table "${res.targetTable || 'astuces'}") !`
        );
      } else {
        showToast(`⚠️ Erreur astuces : ${res.error}`);
      }
    } catch (err: any) {
      showToast(`Erreur astuces : ${err.message}`);
    }
  }, [requireAdmin, showToast]);

  const syncTipsNow = useCallback(async () => {
    if (!requireAdmin('syncTipsNow')) {
      return { success: false, count: 0, error: 'Action réservée à l’Administrateur Data.' };
    }
    const listToSave = tipsRef.current.length > 0 ? tipsRef.current : INITIAL_TIPS;
    if (tipsRef.current.length === 0) {
      setTips(listToSave);
    }
    const res = await seedTipsToSupabase(listToSave);
    if (res.success) {
      logAppEvent({
        category: 'TIPS',
        action: 'TIPS_BATCH_SYNCED',
        actorRole: roleRef.current,
        target: `Table ${res.targetTable || 'astuces'}`,
        details: `${res.count} astuces / articles enregistrés vers Supabase (${res.targetTable || 'astuces'}).`,
      }).catch(() => {});
      triggerHaptic('success');
      showToast(
        res.needsTableSql
          ? `✅ ${res.count} astuces sauvées dans "tips" (créez la table "astuces" via SQL pour une table dédiée)`
          : `✅ ${res.count} astuces sauvegardées dans la table "${res.targetTable || 'astuces'}" !`
      );
    } else {
      showToast(`❌ Erreur sauvegarde astuces : ${res.error || 'échec Supabase'}`);
    }
    return res;
  }, [requireAdmin, showToast]);

  const restoreDefaultTips = useCallback(async () => {
    if (!requireAdmin('restoreDefaultTips')) {
      return { success: false, count: 0, error: 'Action réservée à l’Administrateur Data.' };
    }
    tipsClearedIntentionallyRef.current = false;
    const existingIds = new Set(tipsRef.current.map((t) => t.id));
    const missingDefaults = INITIAL_TIPS.filter((t) => !existingIds.has(t.id));
    const merged = [...tipsRef.current, ...missingDefaults];
    setTips(merged);
    const res = await seedTipsToSupabase(merged);
    if (res.success) {
      logAppEvent({
        category: 'TIPS',
        action: 'TIPS_DEFAULTS_RESTORED',
        actorRole: roleRef.current,
        target: `Table ${res.targetTable || 'astuces'}`,
        details: `${merged.length} astuces restaurées et synchronisées sur Supabase.`,
      }).catch(() => {});
      triggerHaptic('success');
      showToast(`✅ ${merged.length} astuces restaurées & enregistrées sur Supabase !`);
    } else {
      showToast(`⚠️ Restaurées localement (${res.error || 'Supabase indisponible'})`);
    }
    return res;
  }, [requireAdmin, showToast]);

  const importProductsCsv = useCallback(
    (csvContent: string, mode: 'merge' | 'replace' = 'merge') => {
      if (!requireAdmin('importProductsCsv')) {
        return { success: false, count: 0, error: 'Action réservée à l’Administrateur Data.' };
      }
      try {
        const { products: parsed, error } = parseProductsFromCsv(csvContent);
        if (error || !parsed || parsed.length === 0) {
          return { success: false, count: 0, error: error || 'Aucun produit valide trouvé dans le CSV.' };
        }

        if (mode === 'replace') {
          setProducts(parsed);
          localStorage.setItem(STORAGE_KEY_PRODUCTS, JSON.stringify(parsed));
          seedProductsToSupabase(parsed).catch(console.warn);
        } else {
          const map = new Map<string, Product>();
          for (const p of productsRef.current) map.set(p.code ? p.code.toLowerCase() : p.name.toLowerCase(), p);
          for (const p of parsed) map.set(p.code ? p.code.toLowerCase() : p.name.toLowerCase(), p);
          const merged = Array.from(map.values()).map((p, idx) => ({ ...p, id: idx + 1 }));
          setProducts(merged);
          localStorage.setItem(STORAGE_KEY_PRODUCTS, JSON.stringify(merged));
          seedProductsToSupabase(merged).catch(console.warn);
        }

        logAppEvent({
          category: 'IMPORT_EXPORT',
          action: 'CSV_IMPORTED',
          actorRole: roleRef.current,
          target: `Catalogue (${mode})`,
          details: `Import CSV réussi : ${parsed.length} articles (mode: ${mode}).`,
        }).catch(() => {});

        return { success: true, count: parsed.length };
      } catch (e: any) {
        return { success: false, count: 0, error: e.message };
      }
    },
    [requireAdmin]
  );

  const exportCatalogueCsv = useCallback(() => {
    logAppEvent({
      category: 'IMPORT_EXPORT',
      action: 'CSV_EXPORTED',
      actorRole: roleRef.current,
      target: 'Catalogue 12 colonnes',
      details: `Export CSV généré (${productsRef.current.length} articles).`,
    }).catch(() => {});
    return exportProductsToCsv(productsRef.current);
  }, []);

  const addTip = useCallback(
    async (tipData: Omit<TipPost, 'id' | 'createdAt' | 'likes'>) => {
      if (!requireAdmin('addTip')) {
        return { success: false, error: 'Action réservée à l’Administrateur Data.' };
      }
      tipsClearedIntentionallyRef.current = false;
      const safeImg = tipData.imageUrl ? sanitizeImageUrl(tipData.imageUrl) : undefined;
      const safeBlocks = Array.isArray(tipData.blocks)
        ? tipData.blocks.map((b) => ({
            ...b,
            imageUrl: b.imageUrl ? sanitizeImageUrl(b.imageUrl) : undefined,
          }))
        : undefined;
      const newTip: TipPost = {
        ...tipData,
        imageUrl: safeImg || undefined,
        blocks: safeBlocks && safeBlocks.length > 0 ? safeBlocks : undefined,
        id: `tip-${Date.now()}`,
        createdAt: "Aujourd'hui",
        likes: 0,
      };
      setTips((prev) => [newTip, ...prev]);

      logAppEvent({
        category: 'TIPS',
        action: 'TIP_CREATED',
        actorRole: roleRef.current,
        target: newTip.title,
        details: `Nouveau tuto publié (${newTip.category} · cible: ${newTip.targetAudience || 'Tous'}).`,
      }).catch(() => {});

      const res = await upsertTipInSupabase(newTip);
      if (res.success) {
        showToast(
          `✅ Article enregistré sur Supabase (table "${res.targetTable || 'astuces'}") !`
        );
      } else {
        showToast(`⚠️ Enregistré localement (Supabase : ${res.error || 'erreur'})`);
      }
      return res;
    },
    [requireAdmin, showToast]
  );

  const updateTip = useCallback(
    async (updatedRaw: TipPost) => {
      if (!requireAdmin('updateTip')) {
        return { success: false, error: 'Action réservée à l’Administrateur Data.' };
      }
      const safeImg = updatedRaw.imageUrl ? sanitizeImageUrl(updatedRaw.imageUrl) : undefined;
      const safeBlocks = Array.isArray(updatedRaw.blocks)
        ? updatedRaw.blocks.map((b) => ({
            ...b,
            imageUrl: b.imageUrl ? sanitizeImageUrl(b.imageUrl) : undefined,
          }))
        : undefined;
      const updated: TipPost = {
        ...updatedRaw,
        imageUrl: safeImg || undefined,
        blocks: safeBlocks && safeBlocks.length > 0 ? safeBlocks : undefined,
      };
      setTips((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));

      logAppEvent({
        category: 'TIPS',
        action: 'TIP_UPDATED',
        actorRole: roleRef.current,
        target: updated.title,
        details: `Tuto modifié (${updated.category} · cible: ${updated.targetAudience || 'Tous'}).`,
      }).catch(() => {});

      const res = await upsertTipInSupabase(updated);
      if (res.success) {
        showToast(
          `✅ Modifications enregistrées sur Supabase (${res.targetTable || 'astuces'}) !`
        );
      } else {
        showToast(`⚠️ Modifié localement (Supabase : ${res.error || 'erreur'})`);
      }
      return res;
    },
    [requireAdmin, showToast]
  );

  const deleteTip = useCallback(
    async (id: string) => {
      if (!requireAdmin('deleteTip')) {
        return { success: false, error: 'Action réservée à l’Administrateur Data.' };
      }
      if (tipsRef.current.filter((t) => t.id !== id).length === 0) {
        tipsClearedIntentionallyRef.current = true;
      }
      setTips((prev) => {
        const target = prev.find((t) => t.id === id);
        logAppEvent({
          category: 'TIPS',
          action: 'TIP_DELETED',
          actorRole: roleRef.current,
          target: target?.title || id,
          details: `Tuto supprimé (${target?.title || id}).`,
        }).catch(() => {});
        return prev.filter((t) => t.id !== id);
      });
      const res = await deleteTipInSupabase(id);
      if (res.success) {
        showToast('🗑️ Article supprimé de Supabase');
      } else {
        showToast(`⚠️ Supprimé localement (Supabase : ${res.error || 'erreur'})`);
      }
      return res;
    },
    [requireAdmin, showToast]
  );

  const likeTip = useCallback((id: string) => {
    setTips((prev) =>
      prev.map((t) => {
        if (t.id === id) {
          const updated = { ...t, likes: (t.likes || 0) + 1 };
          upsertTipInSupabase(updated).catch(console.warn);
          return updated;
        }
        return t;
      })
    );
  }, []);

  const updateGuideConfig = useCallback(
    async (nextConfig: GuideConfig) => {
      if (!requireAdmin('updateGuideConfig')) {
        return {
          success: false,
          config: guideConfig,
          error: 'Action réservée à l’Administrateur Data.',
        };
      }
      const res = await saveGuideConfigToCloud(nextConfig);
      setGuideConfig(res.config);
      await logAppEvent({
        category: 'GUIDE',
        action: 'GUIDE_UPDATED',
        actorRole: roleRef.current,
        target: `Guide Pickeur (v${res.config.version})`,
        details: `Contenu du Guide modifié par Admin (${res.config.steps.map((s) => s.shortLabel).join(' / ')}).`,
      });
      return { success: res.success, config: res.config, error: res.error };
    },
    [guideConfig, requireAdmin]
  );

  const resetGuideConfig = useCallback(async () => {
    if (!requireAdmin('resetGuideConfig')) {
      return {
        success: false,
        config: guideConfig,
        error: 'Action réservée à l’Administrateur Data.',
      };
    }
    const res = await saveGuideConfigToCloud({
      ...DEFAULT_GUIDE_CONFIG,
      version: (guideConfig.version || 1) + 1,
      updatedAt: new Date().toISOString(),
    });
    setGuideConfig(res.config);
    await logAppEvent({
      category: 'GUIDE',
      action: 'GUIDE_RESET',
      actorRole: roleRef.current,
      target: 'Guide Pickeur',
      details: 'Contenu du Guide réinitialisé aux valeurs par défaut.',
    });
    return { success: res.success, config: res.config, error: res.error };
  }, [guideConfig, requireAdmin]);

  const toggleProductCodeDisabled = useCallback(
    async (id: number) => {
      if (!requireAdmin('toggleProductCodeDisabled')) return;
      const target = productsRef.current.find((p) => p.id === id);
      if (!target) return;

      const currentCfg = guideConfigRef.current;
      const currentIds = new Set<number>(currentCfg.noCodeSettings?.disabledCodeProductIds || []);
      const currentlyDisabled = Boolean(target.codeDisabled || currentIds.has(id));
      const nextDisabled = !currentlyDisabled;

      const updated: Product = { ...target, codeDisabled: nextDisabled };
      setProducts((prev) => prev.map((p) => (p.id === id ? updated : p)));
      setSelectedProduct((prevSel) => (prevSel && prevSel.id === id ? updated : prevSel));

      if (nextDisabled) {
        currentIds.add(id);
      } else {
        currentIds.delete(id);
      }

      const nextCfg: GuideConfig = {
        ...currentCfg,
        noCodeSettings: {
          allowAllWithoutCode: Boolean(currentCfg.noCodeSettings?.allowAllWithoutCode),
          disabledCodeProductIds: Array.from(currentIds),
        },
      };

      const [prodRes, cfgRes] = await Promise.all([
        upsertProductInSupabase(updated).catch(() => ({ success: false })),
        saveGuideConfigToCloud(nextCfg),
      ]);
      setGuideConfig(cfgRes.config);

      logAppEvent({
        category: 'PRODUCT',
        action: nextDisabled ? 'PRODUCT_CODE_DISABLED' : 'PRODUCT_CODE_ENABLED',
        actorRole: roleRef.current,
        target: `#${target.id} ${target.name}`,
        details: nextDisabled
          ? `Code désactivé pour "${target.name}" (visible même sans code/code-barres).`
          : `Obligation de code réactivée pour "${target.name}".`,
      }).catch(() => {});

      showToast(
        nextDisabled
          ? `🔓 Code désactivé : "${target.name}" reste visible même sans code`
          : `🔒 Obligation de code réactivée : "${target.name}"${!prodRes.success ? ' (local)' : ''}`
      );
    },
    [requireAdmin, showToast]
  );

  const bulkSetCodeDisabled = useCallback(
    async (mode: 'disable-missing' | 'enable-all-codes'): Promise<number> => {
      if (!requireAdmin('bulkSetCodeDisabled')) return 0;
      const currentCfg = guideConfigRef.current;
      const currentIds = new Set<number>(currentCfg.noCodeSettings?.disabledCodeProductIds || []);
      let changedCount = 0;

      let changedProducts: Product[] = [];

      if (mode === 'disable-missing') {
        const updatedList = productsRef.current.map((p) => {
          if (isProductCodeXXXX(p.code)) return p;
          const missingCode = !hasValidProductCode(p.code);
          if (missingCode) {
            if (!p.codeDisabled || !currentIds.has(p.id)) {
              changedCount++;
              const nextP = { ...p, codeDisabled: true };
              changedProducts.push(nextP);
              currentIds.add(p.id);
              return nextP;
            }
            currentIds.add(p.id);
          }
          return p;
        });
        setProducts(updatedList);
      } else {
        const updatedList = productsRef.current.map((p) => {
          if (p.codeDisabled || currentIds.has(p.id)) {
            changedCount++;
            currentIds.delete(p.id);
            const nextP = { ...p, codeDisabled: false };
            changedProducts.push(nextP);
            return nextP;
          }
          return p;
        });
        currentIds.clear();
        setProducts(updatedList);
      }

      const nextCfg: GuideConfig = {
        ...currentCfg,
        noCodeSettings: {
          allowAllWithoutCode:
            mode === 'enable-all-codes'
              ? false
              : Boolean(currentCfg.noCodeSettings?.allowAllWithoutCode),
          disabledCodeProductIds: Array.from(currentIds),
        },
      };

      const [saved] = await Promise.all([
        saveGuideConfigToCloud(nextCfg),
        changedProducts.length > 0
          ? seedProductsToSupabase(changedProducts).catch(() => ({ success: false }))
          : Promise.resolve({ success: true }),
      ]);
      setGuideConfig(saved.config);

      logAppEvent({
        category: 'PRODUCT',
        action:
          mode === 'disable-missing'
            ? 'BULK_DISABLE_MISSING_CODES'
            : 'BULK_REENABLE_ALL_CODES',
        actorRole: roleRef.current,
        target: `${currentIds.size} articles`,
        details:
          mode === 'disable-missing'
            ? `Code désactivé en masse pour ${currentIds.size} articles sans code / sans code-barres (${changedCount} modifiés).`
            : `Réactivation de l'obligation de code sur tous les articles (${changedCount} modifiés).`,
      }).catch(() => {});

      showToast(
        mode === 'disable-missing'
          ? `🔓 ${currentIds.size} article(s) sans code/code-barres désormais visibles dans l'app !`
          : `🔒 Obligation de code réactivée (${changedCount} articles mis à jour)`
      );
      return currentIds.size;
    },
    [requireAdmin, showToast]
  );

  const setAllowAllWithoutCode = useCallback(
    async (enabled: boolean) => {
      if (!requireAdmin('setAllowAllWithoutCode')) return;
      const currentCfg = guideConfigRef.current;
      const nextCfg: GuideConfig = {
        ...currentCfg,
        noCodeSettings: {
          allowAllWithoutCode: enabled,
          disabledCodeProductIds: currentCfg.noCodeSettings?.disabledCodeProductIds || [],
        },
      };
      const saved = await saveGuideConfigToCloud(nextCfg);
      setGuideConfig(saved.config);

      logAppEvent({
        category: 'PRODUCT',
        action: enabled ? 'GLOBAL_NO_CODE_ENABLED' : 'GLOBAL_NO_CODE_DISABLED',
        actorRole: roleRef.current,
        target: 'Catalogue Global',
        details: enabled
          ? 'Option globale activée : tous les articles sans code restent visibles.'
          : 'Option globale désactivée : retour au filtrage normal des articles sans code.',
      }).catch(() => {});

      showToast(
        enabled
          ? '🔓 Tous les articles sans code sont maintenant visibles dans l’app !'
          : '🔒 Mode standard : seuls les articles avec code ou code désactivé restent visibles.'
      );
    },
    [requireAdmin, showToast]
  );

  // Free Community Barcode Voting: Anyone can vote like or dislike!
  const voteBarcode = useCallback((barcode: string, type: 'like' | 'dislike') => {
    const voterId = getDeviceVoterId();
    const prev = barcodeVotesRef.current;
    const currentRecord = prev[barcode] || {
      barcode,
      likes: 0,
      dislikes: 0,
      voters: {},
    };

    const previousVote = currentRecord.voters?.[voterId];
    const updatedVoters = { ...(currentRecord.voters || {}) };
    let updatedLikes = currentRecord.likes || 0;
    let updatedDislikes = currentRecord.dislikes || 0;

    if (previousVote === type) {
      delete updatedVoters[voterId];
      if (type === 'like') updatedLikes = Math.max(0, updatedLikes - 1);
      if (type === 'dislike') updatedDislikes = Math.max(0, updatedDislikes - 1);
    } else {
      if (previousVote === 'like') updatedLikes = Math.max(0, updatedLikes - 1);
      if (previousVote === 'dislike') updatedDislikes = Math.max(0, updatedDislikes - 1);

      updatedVoters[voterId] = type;
      if (type === 'like') updatedLikes += 1;
      if (type === 'dislike') updatedDislikes += 1;
    }

    const isPromoted = updatedLikes >= 15;
    const isDeleted = updatedDislikes >= 15;
    const newLikes = updatedLikes;
    const newDislikes = updatedDislikes;

    const updatedRecord: BarcodeVoteRecord = {
      barcode,
      likes: updatedLikes,
      dislikes: updatedDislikes,
      voters: updatedVoters,
      statusOverride: isPromoted ? 'Valide' : undefined,
      isDeleted,
      lastVoterIp: userIp || undefined,
    };

    const nextVotes: Record<string, BarcodeVoteRecord> = {
      ...prev,
      [barcode]: updatedRecord,
    };

    barcodeVotesRef.current = nextVotes;
    setBarcodeVotes(nextVotes);

    try {
      localStorage.setItem(STORAGE_KEY_BARCODE_VOTES, JSON.stringify(nextVotes));
    } catch {}

    const currentVoteType = updatedVoters[voterId] || null;
    saveBarcodeVoteToSupabase(barcode, voterId, currentVoteType).catch(console.warn);

    logAppEvent({
      category: 'BARCODE_VOTE',
      action: type === 'like' ? 'BARCODE_VOTE_LIKE' : 'BARCODE_VOTE_DISLIKE',
      actorRole: roleRef.current,
      target: barcode,
      details: `Vote "${type}" sur le code-barres ${barcode} (Likes: ${newLikes}, Dislikes: ${newDislikes}).`,
    }).catch(() => {});

    if (isPromoted) {
      showToast(`⭐ Code-barres validé (+15 votes) !`);
    } else if (isDeleted) {
      showToast(`🗑️ Code-barres retiré (-15 votes) !`);
    } else {
      showToast(type === 'like' ? 'Vote positif enregistré' : 'Vote négatif enregistré');
    }

    return {
      success: true,
      newLikes,
      newDislikes,
      isPromoted,
      isDeleted,
    };
  }, [showToast, userIp]);

  const resetBarcodeVotes = useCallback(() => {
    if (!requireAdmin('resetBarcodeVotes')) return;
    setBarcodeVotes(INITIAL_BARCODE_VOTES);
    try {
      localStorage.setItem(STORAGE_KEY_BARCODE_VOTES, JSON.stringify(INITIAL_BARCODE_VOTES));
    } catch {}
    logAppEvent({
      category: 'BARCODE_VOTE',
      action: 'BARCODE_VOTES_RESET',
      actorRole: roleRef.current,
      target: 'Votes communautaires',
      details: 'Tous les votes codes-barres locaux ont été réinitialisés.',
    }).catch(() => {});
    showToast('Votes réinitialisés.');
  }, [requireAdmin, showToast]);

  const setRole = useCallback((newRole: Role) => {
    const prevRole = roleRef.current;
    setRoleState(newRole);
    if (newRole === 'Pickeur') {
      clearAdminSession();
      if (prevRole === 'Admin') {
        logAppEvent({
          category: 'AUTH',
          action: 'ADMIN_LOCKED',
          actorRole: 'Admin',
          target: 'Session Data',
          details: 'Session Administrateur verrouillée manuellement (retour en Pickeur).',
        }).catch(() => {});
      }
    } else {
      try {
        localStorage.setItem(STORAGE_KEY_ROLE, newRole);
      } catch {}
    }
  }, []);

  return (
    <AppContext.Provider
      value={{
        role,
        setRole,
        products,
        activeTab,
        setActiveTab,
        selectedDepartment,
        setSelectedDepartment,
        selectedProduct,
        setSelectedProduct,
        suggestInitialProduct,
        setSuggestInitialProduct,
        suggestActiveView,
        setSuggestActiveView,
        openSuggestForProduct,
        openMissingProducts,
        searchQuery,
        setSearchQuery,
        toastMessage,
        showToast,
        isDarkMode,
        toggleDarkMode,
        userIp,
        userDevices,
        deviceStats,
        refreshUserDevices,
        isLoadingDevices,
        barcodeVotes,
        voteBarcode,
        resetBarcodeVotes,
        dataUpdateStatus,
        hasPendingUpdate,
        pendingProducts,
        pendingUpdateMessage,
        checkForUpdates,
        applyUpdate,
        dismissPendingUpdate,
        toggleProductStatus,
        updateProduct,
        addProduct,
        duplicateProductsBulk,
        deleteProduct,
        deleteProductsBulk,
        restoreDeletedProducts,
        resetCatalogue,
        clearAllProducts,
        restoreLatestBackupNow,
        seedInitialCatalogueToSupabase,
        syncWithSupabase,
        seedSupabase,
        seedTips,
        supabaseHealth,
        checkSupabaseStatus,
        syncStatus,
        isSyncing,
        syncProgress,
        lastSyncTimestamp,
        importProductsCsv,
        exportCatalogueCsv,
        tips,
        addTip,
        updateTip,
        deleteTip,
        likeTip,
        syncTipsNow,
        restoreDefaultTips,
        guideConfig,
        updateGuideConfig,
        resetGuideConfig,
        noCodeSettings,
        toggleProductCodeDisabled,
        bulkSetCodeDisabled,
        setAllowAllWithoutCode,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};

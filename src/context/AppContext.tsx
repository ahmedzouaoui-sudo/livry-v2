import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import {
  Department,
  Product,
  Role,
  TipPost,
  DataUpdateStatus,
  BarcodeVoteRecord,
  UserDevice,
  DeviceStats,
} from '../types';
import { INITIAL_PRODUCTS } from '../data/initialProducts';
import { parseProductsFromCsv, exportProductsToCsv } from '../utils/csvImporter';
import {
  checkSupabaseHealth,
  fetchProductsFromSupabase,
  upsertProductInSupabase,
  deleteProductInSupabase,
  seedProductsToSupabase,
  deleteAllProductsFromSupabase,
  fetchTipsFromSupabase,
  upsertTipInSupabase,
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
import { supabasePublic } from '../services/supabaseClient';
import { triggerHaptic } from '../utils/haptics';

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
  deleteProduct: (id: number) => Promise<void>;
  resetCatalogue: () => void;
  clearAllProducts: () => Promise<void>;
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
  addTip: (tip: Omit<TipPost, 'id' | 'createdAt' | 'likes'>) => void;
  updateTip: (updated: TipPost) => void;
  deleteTip: (id: string) => void;
  likeTip: (id: string) => void;
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

const INITIAL_TIPS: TipPost[] = [];

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

  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_THEME);
      if (saved) return saved === 'dark';
      return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    } catch {
      return false;
    }
  });

  const [userIp, setUserIp] = useState<string | null>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY_USER_IP);
    } catch {
      return null;
    }
  });

  // Dark mode effect
  useEffect(() => {
    try {
      if (isDarkMode) {
        document.documentElement.classList.add('dark');
        localStorage.setItem(STORAGE_KEY_THEME, 'dark');
      } else {
        document.documentElement.classList.remove('dark');
        localStorage.setItem(STORAGE_KEY_THEME, 'light');
      }
    } catch (e) {
      console.warn('Dark mode switch error:', e);
    }
  }, [isDarkMode]);

  const toggleDarkMode = useCallback(() => {
    setIsDarkMode((prev) => !prev);
  }, []);

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

  const [role, setRoleState] = useState<Role>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_ROLE);
    return (saved as Role) || 'Pickeur';
  });

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
        if (Array.isArray(parsed)) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Error reading local tips cache:', e);
    }
    return [];
  });

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

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 3500);
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_PRODUCTS, JSON.stringify(products));
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

  const checkForUpdates = useCallback(
    async (isSilent = true): Promise<void> => {
      if (syncingRef.current) return;
      try {
        const health = await checkSupabaseHealth();
        setSupabaseHealth(health);
        if (!health.connected || !health.tableExists) {
          return;
        }

        const res = await fetchProductsFromSupabase();
        if (res.success) {
          const remoteList = res.products;
          const currentList = productsRef.current;

          const currentIds = new Set(currentList.map((p) => `${p.id}_${p.code}_${p.name}_${p.imageUrl || ''}`));
          const hasDifferentItems =
            remoteList.length !== currentList.length ||
            remoteList.some((p) => !currentIds.has(`${p.id}_${p.code}_${p.name}_${p.imageUrl || ''}`));

          if (hasDifferentItems && remoteList.length > 0) {
            setPendingProducts(remoteList);
            setDataUpdateStatus('update-available');
            const diff = remoteList.length - currentList.length;
            const diffMsg =
              diff > 0
                ? `${diff} nouveau${diff > 1 ? 'x' : ''} produit${diff > 1 ? 's' : ''} disponible${diff > 1 ? 's' : ''}`
                : `Mise à jour prête (${remoteList.length} articles)`;
            setPendingUpdateMessage(diffMsg);

            if (!isSilent) {
              triggerHaptic('medium');
              showToast(`🔔 ${diffMsg} ! Cliquez sur 'Mise à jour' en bleu pour actualiser.`);
            }
          } else {
            setDataUpdateStatus('up-to-date');
            setPendingProducts(null);
            setPendingUpdateMessage(null);
            if (!isSilent) {
              triggerHaptic('success');
              showToast(`✅ Votre catalogue est déjà à jour (${currentList.length} articles)`);
            }
          }
        }
      } catch (err) {
        console.warn('[CheckForUpdates] Error:', err);
      }
    },
    [showToast]
  );

  const applyUpdate = useCallback(async (): Promise<void> => {
    if (pendingProducts && pendingProducts.length > 0) {
      setDataUpdateStatus('updating');
      setProducts(pendingProducts);
      const appliedCount = pendingProducts.length;
      setPendingProducts(null);
      setPendingUpdateMessage(null);
      setDataUpdateStatus('up-to-date');

      const nowTime = new Date().toLocaleTimeString('fr-FR', {
        hour: '2-digit',
        minute: '2-digit',
      });
      const note = `À jour (${appliedCount} articles synchronisés à ${nowTime})`;
      setLastSyncTimestamp(note);
      localStorage.setItem(STORAGE_KEY_LAST_SYNC, note);

      triggerHaptic('success');
      showToast(`✅ Données mises à jour avec succès : ${appliedCount} articles actifs !`);
      return;
    }

    setDataUpdateStatus('updating');
    setSyncStatus('syncing');
    showToast('Vérification des mises à jour...');

    try {
      const res = await fetchProductsFromSupabase();
      if (res.success) {
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
  }, [pendingProducts, showToast]);

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

  // Initial check on mount
  useEffect(() => {
    let isMounted = true;
    let votesChannel: any = null;

    const initCheck = async () => {
      const health = await checkSupabaseHealth();
      if (!isMounted) return;
      setSupabaseHealth(health);

      if (health.connected && health.tableExists) {
        await checkForUpdates(true);

        const tipsRes = await fetchTipsFromSupabase();
        if (isMounted && tipsRes.success) {
          setTips(tipsRes.tips);
        }

        const votesRes = await fetchBarcodeVotesFromSupabase();
        if (isMounted && votesRes.success && Object.keys(votesRes.votes).length > 0) {
          setBarcodeVotes((prev) => ({
            ...prev,
            ...votesRes.votes,
          }));
        }

        try {
          votesChannel = supabasePublic
            .channel('public:barcode_votes_live')
            .on(
              'postgres_changes',
              { event: '*', schema: 'public', table: 'barcode_votes' },
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
      if (votesChannel) {
        try {
          supabasePublic.removeChannel(votesChannel);
        } catch {}
      }
    };
  }, [checkForUpdates]);

  // Periodic check
  useEffect(() => {
    const intervalId = setInterval(() => {
      if (document.visibilityState === 'visible') {
        checkForUpdates(true).catch(console.warn);
      }
    }, 45000);

    const handleTabFocus = () => {
      if (document.visibilityState === 'visible') {
        checkForUpdates(true).catch(console.warn);
      }
    };

    window.addEventListener('focus', handleTabFocus);
    document.addEventListener('visibilitychange', handleTabFocus);

    return () => {
      clearInterval(intervalId);
      window.removeEventListener('focus', handleTabFocus);
      document.removeEventListener('visibilitychange', handleTabFocus);
    };
  }, [checkForUpdates]);

  const toggleProductStatus = useCallback(async (id: number) => {
    const target = productsRef.current.find((p) => p.id === id);
    if (!target) return;
    const updated = { ...target, isEnabled: !target.isEnabled };
    setProducts((prev) => prev.map((p) => (p.id === id ? updated : p)));
    upsertProductInSupabase(updated).catch(() => {});
  }, []);

  const updateProduct = useCallback(async (updated: Product) => {
    setProducts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
    upsertProductInSupabase(updated).catch(() => {});
  }, []);

  const addProduct = useCallback(async (newProduct: Omit<Product, 'id'>) => {
    const maxId = productsRef.current.reduce((max, p) => Math.max(max, p.id), 0);
    const productWithId: Product = { ...newProduct, id: maxId + 1 };
    setProducts((prev) => [productWithId, ...prev]);
    upsertProductInSupabase(productWithId).catch(() => {});
  }, []);

  const deleteProduct = useCallback(async (id: number) => {
    setProducts((prev) => prev.filter((p) => p.id !== id));
    deleteProductInSupabase(id).catch(() => {});
  }, []);

  const resetCatalogue = useCallback(() => {
    setProducts(INITIAL_PRODUCTS);
    localStorage.setItem(STORAGE_KEY_PRODUCTS, JSON.stringify(INITIAL_PRODUCTS));
    showToast('Catalogue réinitialisé aux produits par défaut.');
  }, [showToast]);

  const clearAllProducts = useCallback(async () => {
    setProducts([]);
    localStorage.removeItem(STORAGE_KEY_PRODUCTS);
    await deleteAllProductsFromSupabase();
    showToast('Tous les produits ont été supprimés.');
  }, [showToast]);

  const seedInitialCatalogueToSupabase = useCallback(async () => {
    setSyncStatus('syncing');
    try {
      const res = await seedProductsToSupabase(INITIAL_PRODUCTS);
      if (res.success) {
        setProducts(INITIAL_PRODUCTS);
        setSyncStatus('synced');
        showToast(`Base Supabase initialisée avec ${res.count} articles.`);
      } else {
        setSyncStatus('error');
        showToast(`Erreur : ${res.error}`);
      }
    } catch (err: any) {
      setSyncStatus('error');
      showToast(`Erreur : ${err.message}`);
    }
  }, [showToast]);

  const seedSupabase = useCallback(async () => {
    setSyncStatus('syncing');
    try {
      const res = await seedProductsToSupabase(productsRef.current);
      if (res.success) {
        setSyncStatus('synced');
        showToast(`${res.count} articles envoyés vers Supabase.`);
      } else {
        setSyncStatus('error');
        showToast(`Erreur : ${res.error}`);
      }
    } catch (err: any) {
      setSyncStatus('error');
      showToast(`Erreur : ${err.message}`);
    }
  }, [showToast]);

  const seedTips = useCallback(async () => {
    try {
      await seedTipsToSupabase(INITIAL_TIPS);
      setTips(INITIAL_TIPS);
      showToast('Astuces initialisées avec succès !');
    } catch (err: any) {
      showToast(`Erreur astuces : ${err.message}`);
    }
  }, [showToast]);

  const importProductsCsv = useCallback(
    (csvContent: string, mode: 'merge' | 'replace' = 'merge') => {
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

        return { success: true, count: parsed.length };
      } catch (e: any) {
        return { success: false, count: 0, error: e.message };
      }
    },
    []
  );

  const exportCatalogueCsv = useCallback(() => {
    return exportProductsToCsv(productsRef.current);
  }, []);

  const addTip = useCallback((tipData: Omit<TipPost, 'id' | 'createdAt' | 'likes'>) => {
    const newTip: TipPost = {
      ...tipData,
      id: `tip-${Date.now()}`,
      createdAt: "Aujourd'hui",
      likes: 0,
    };
    setTips((prev) => [newTip, ...prev]);
    upsertTipInSupabase(newTip).catch(console.warn);
  }, []);

  const updateTip = useCallback((updated: TipPost) => {
    setTips((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
    upsertTipInSupabase(updated).catch(console.warn);
  }, []);

  const deleteTip = useCallback((id: string) => {
    setTips((prev) => prev.filter((t) => t.id !== id));
  }, []);

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

  // Free Community Barcode Voting: Anyone can vote like or dislike!
  const voteBarcode = useCallback((barcode: string, type: 'like' | 'dislike') => {
    const voterId = getDeviceVoterId();
    let isPromoted = false;
    let isDeleted = false;
    let newLikes = 0;
    let newDislikes = 0;

    setBarcodeVotes((prev) => {
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

      const promoted = updatedLikes >= 15;
      const deleted = updatedDislikes >= 15;

      isPromoted = promoted;
      isDeleted = deleted;
      newLikes = updatedLikes;
      newDislikes = updatedDislikes;

      const updatedRecord: BarcodeVoteRecord = {
        barcode,
        likes: updatedLikes,
        dislikes: updatedDislikes,
        voters: updatedVoters,
        statusOverride: promoted ? 'Valide' : undefined,
        isDeleted: deleted,
        lastVoterIp: userIp || undefined,
      };

      try {
        localStorage.setItem(
          STORAGE_KEY_BARCODE_VOTES,
          JSON.stringify({ ...prev, [barcode]: updatedRecord })
        );
      } catch {}

      const currentVoteType = updatedVoters[voterId] || null;
      saveBarcodeVoteToSupabase(barcode, voterId, currentVoteType).catch(console.warn);

      return {
        ...prev,
        [barcode]: updatedRecord,
      };
    });

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
  }, [showToast]);

  const resetBarcodeVotes = useCallback(() => {
    setBarcodeVotes(INITIAL_BARCODE_VOTES);
    try {
      localStorage.setItem(STORAGE_KEY_BARCODE_VOTES, JSON.stringify(INITIAL_BARCODE_VOTES));
    } catch {}
    showToast('Votes réinitialisés.');
  }, [showToast]);

  const setRole = useCallback((newRole: Role) => {
    setRoleState(newRole);
    try {
      localStorage.setItem(STORAGE_KEY_ROLE, newRole);
    } catch {}
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
        deleteProduct,
        resetCatalogue,
        clearAllProducts,
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

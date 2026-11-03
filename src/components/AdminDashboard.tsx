import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  Shield,
  Plus,
  Search,
  Upload,
  Download,
  RotateCcw,
  Cloud,
  FileSpreadsheet,
  X,
  Save,
  ToggleLeft,
  ToggleRight,
  Edit2,
  Trash2,
  Check,
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  Filter,
  Copy,
  Database,
  RefreshCw,
  Code2,
  CheckCircle2,
  AlertTriangle,
  Lightbulb,
  Globe,
  Zap,
  Smartphone,
  Layers,
  Sparkles,
  ExternalLink,
  SlidersHorizontal,
  FileCode,
  Tag,
  Scale,
  ShoppingBag,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Department, Product } from '../types';
import {
  DEPARTMENT_CONFIGS,
  getProductBarcodeVariants,
  getCleanProductCode,
  normalizeSearchText,
} from '../utils/productUtils';
import {
  getSupabaseProjectId,
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  setCustomSupabaseCredentials,
  resetSupabaseCredentialsToDefault,
} from '../services/supabaseClient';
import { SUPABASE_SETUP_SQL } from '../services/supabaseService';
import {
  parseProductsFromCsv,
  exportProductsToCsv,
  extractProductsFromHtmlOrScript,
  mergeExtractedProductsWithExisting,
  MergeResult,
} from '../utils/csvImporter';
import { extractPureUnit } from '../utils/productWeight';
import { triggerHaptic } from '../utils/haptics';
import { UserDevicesModal } from './UserDevicesModal';

interface DuplicateConflict {
  type: 'name' | 'barcode' | 'code';
  value: string;
  fieldLabel: string;
  products: Product[];
}

export const AdminDashboard: React.FC = () => {
  const {
    role,
    products,
    toggleProductStatus,
    updateProduct,
    addProduct,
    deleteProduct,
    clearAllProducts,
    seedInitialCatalogueToSupabase,
    syncWithSupabase,
    supabaseHealth,
    checkSupabaseStatus,
    syncStatus,
    lastSyncTimestamp,
    setActiveTab,
    showToast,
    userDevices,
    deviceStats,
    refreshUserDevices,
  } = useApp();

  // Redirect if not Admin
  useEffect(() => {
    if (role !== 'Admin') {
      setActiveTab('home');
    }
  }, [role, setActiveTab]);

  // -------------------------------------------------------------------------
  // 1. STATE & SEARCH CONTROLS
  // -------------------------------------------------------------------------
  const [adminSearch, setAdminSearch] = useState('');
  const [selectedUnit, setSelectedUnit] = useState<'ALL' | 'kg' | 'g' | 'pièce'>('ALL');
  const [filterSpecial, setFilterSpecial] = useState<
    'ALL' | 'NO_CODE' | 'NO_BARCODE' | 'NO_IMAGE' | 'DUP_NAMES' | 'DUP_BARCODES' | 'VISIBLE' | 'HIDDEN'
  >('ALL');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedDept, setSelectedDept] = useState<Department | 'ALL'>('ALL');

  // Pagination
  const [pageSize, setPageSize] = useState<number>(50);
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Modals
  const [isDevicesModalOpen, setIsDevicesModalOpen] = useState(false);
  const [isSqlModalOpen, setIsSqlModalOpen] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);
  const [conflictModalData, setConflictModalData] = useState<DuplicateConflict | null>(null);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isExtractorModalOpen, setIsExtractorModalOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [isClearModalOpen, setIsClearModalOpen] = useState(false);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);

  // Quick inline edit state
  const [inlineEditingId, setInlineEditingId] = useState<number | null>(null);
  const [inlineCode, setInlineCode] = useState('');
  const [inlineName, setInlineName] = useState('');
  const [inlineUnit, setInlineUnit] = useState<'kg' | 'g' | 'pièce'>('pièce');

  // Extraction tool state
  const [extractorText, setExtractorText] = useState('');
  const [extractedPreview, setExtractedPreview] = useState<Product[]>([]);
  const [mergeResult, setMergeResult] = useState<MergeResult | null>(null);
  const [extractorMode, setExtractorMode] = useState<'html' | 'csv'>('html');
  const [copiedAlterSql, setCopiedAlterSql] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Active & Hidden counts for visibility management
  const activeProductsCount = useMemo(() => products.filter((p) => p.isEnabled).length, [products]);
  const hiddenProductsCount = useMemo(() => products.filter((p) => !p.isEnabled).length, [products]);

  // -------------------------------------------------------------------------
  // 2. DUPLICATES & ANOMALIES DETECTION LOGIC
  // -------------------------------------------------------------------------
  // Map of barcode string -> array of products containing it
  const barcodeMap = useMemo(() => {
    const map = new Map<string, Product[]>();
    for (const p of products) {
      const bcs = [
        p.barcodeMarjane,
        p.barcodeP2,
        p.barcodeInterne,
        p.barcodeMiniSecours,
        p.barcodeSecours,
        p.barcodeP3,
      ];
      for (const bc of bcs) {
        if (bc && bc.trim() && bc !== '0' && bc !== '-') {
          const clean = bc.replace(/\D/g, '');
          if (clean.length >= 8) {
            const list = map.get(clean) || [];
            if (!list.some((existing) => existing.id === p.id)) {
              list.push(p);
            }
            map.set(clean, list);
          }
        }
      }
    }
    return map;
  }, [products]);

  // Map of normalized product name -> array of products with this name
  const nameMap = useMemo(() => {
    const map = new Map<string, Product[]>();
    for (const p of products) {
      const norm = normalizeSearchText(p.name);
      if (norm.length > 1) {
        const list = map.get(norm) || [];
        list.push(p);
        map.set(norm, list);
      }
    }
    return map;
  }, [products]);

  // Map of short codes -> array of products
  const codeMap = useMemo(() => {
    const map = new Map<string, Product[]>();
    for (const p of products) {
      const clean = getCleanProductCode(p.code);
      if (clean && clean !== '-' && clean !== 'XXXX') {
        const list = map.get(clean) || [];
        list.push(p);
        map.set(clean, list);
      }
    }
    return map;
  }, [products]);

  // Duplicate IDs sets
  const duplicateNameIds = useMemo(() => {
    const set = new Set<number>();
    nameMap.forEach((list) => {
      if (list.length > 1) {
        list.forEach((p) => set.add(p.id));
      }
    });
    return set;
  }, [nameMap]);

  const duplicateBarcodeIds = useMemo(() => {
    const set = new Set<number>();
    barcodeMap.forEach((list) => {
      if (list.length > 1) {
        list.forEach((p) => set.add(p.id));
      }
    });
    return set;
  }, [barcodeMap]);

  // -------------------------------------------------------------------------
  // 3. KPI CALCULATIONS
  // -------------------------------------------------------------------------
  const totalProducts = products.length;
  const withoutCodeCount = useMemo(() => {
    return products.filter((p) => !p.code || p.code.trim() === '' || p.code === '-').length;
  }, [products]);

  const withoutBarcodeCount = useMemo(() => {
    return products.filter((p) => getProductBarcodeVariants(p).length === 0).length;
  }, [products]);

  const withoutImageCount = useMemo(() => {
    return products.filter((p) => !p.imageUrl || p.imageUrl.trim() === '').length;
  }, [products]);

  const duplicateNamesCount = duplicateNameIds.size;
  const duplicateBarcodesCount = duplicateBarcodeIds.size;

  // -------------------------------------------------------------------------
  // 4. CATEGORIES SORTED A-Z
  // -------------------------------------------------------------------------
  const sortedCategories = useMemo(() => {
    const counts = new Map<string, number>();
    for (const p of products) {
      const cat = p.category?.trim() || 'Général';
      counts.set(cat, (counts.get(cat) || 0) + 1);
    }
    return Array.from(counts.entries())
      .sort((a, b) => a[0].localeCompare(b[0], 'fr', { sensitivity: 'base' }))
      .map(([name, count]) => ({ name, count }));
  }, [products]);

  // -------------------------------------------------------------------------
  // 5. FILTERING & SEARCH PIPELINE
  // -------------------------------------------------------------------------
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      // Unit filter ('kg' | 'g' | 'pièce')
      const pureUnit = p.quantite || extractPureUnit(p.name);
      if (selectedUnit !== 'ALL' && pureUnit !== selectedUnit) {
        return false;
      }

      // Department filter
      if (selectedDept !== 'ALL' && p.department !== selectedDept) {
        return false;
      }

      // Category filter
      if (selectedCategory !== 'ALL' && (p.category?.trim() || 'Général') !== selectedCategory) {
        return false;
      }

      // Special Anomaly filter
      if (filterSpecial === 'NO_CODE' && p.code && p.code.trim() !== '' && p.code !== '-') {
        return false;
      }
      if (filterSpecial === 'NO_BARCODE' && getProductBarcodeVariants(p).length > 0) {
        return false;
      }
      if (filterSpecial === 'NO_IMAGE' && p.imageUrl && p.imageUrl.trim() !== '') {
        return false;
      }
      if (filterSpecial === 'DUP_NAMES' && !duplicateNameIds.has(p.id)) {
        return false;
      }
      if (filterSpecial === 'DUP_BARCODES' && !duplicateBarcodeIds.has(p.id)) {
        return false;
      }
      if (filterSpecial === 'VISIBLE' && !p.isEnabled) {
        return false;
      }
      if (filterSpecial === 'HIDDEN' && p.isEnabled) {
        return false;
      }

      // Text search
      if (!adminSearch.trim()) return true;
      const q = adminSearch.toLowerCase().trim();
      const codeMatch = p.code?.toLowerCase().includes(q);
      const nameMatch = p.name.toLowerCase().includes(q);
      const catMatch = p.category?.toLowerCase().includes(q);
      const deptMatch = p.department.toLowerCase().includes(q);
      const barcodeMatch =
        (p.barcodeMarjane && p.barcodeMarjane.includes(q)) ||
        (p.barcodeP2 && p.barcodeP2.includes(q)) ||
        (p.barcodeInterne && p.barcodeInterne.includes(q)) ||
        (p.barcodeMiniSecours && p.barcodeMiniSecours.includes(q)) ||
        (p.barcodeSecours && p.barcodeSecours.includes(q)) ||
        (p.barcodeP3 && p.barcodeP3.includes(q));

      return codeMatch || nameMatch || catMatch || deptMatch || barcodeMatch;
    });
  }, [
    products,
    selectedUnit,
    selectedDept,
    selectedCategory,
    filterSpecial,
    adminSearch,
    duplicateNameIds,
    duplicateBarcodeIds,
  ]);

  // Reset page when any filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [adminSearch, selectedUnit, filterSpecial, selectedCategory, selectedDept, pageSize]);

  // Pagination calculation
  const totalPages = pageSize === 0 ? 1 : Math.ceil(filteredProducts.length / pageSize);
  const paginatedList = useMemo(() => {
    if (pageSize === 0) return filteredProducts;
    const start = (currentPage - 1) * pageSize;
    return filteredProducts.slice(start, start + pageSize);
  }, [filteredProducts, currentPage, pageSize]);

  // -------------------------------------------------------------------------
  // 6. DUPLICATE INSPECTION HANDLERS
  // -------------------------------------------------------------------------
  const openNameConflict = (product: Product) => {
    triggerHaptic('medium');
    const norm = normalizeSearchText(product.name);
    const conflicts = nameMap.get(norm) || [product];
    if (conflicts.length > 1) {
      setConflictModalData({
        type: 'name',
        value: product.name,
        fieldLabel: 'Nom de Produit Répété',
        products: conflicts,
      });
    }
  };

  const openBarcodeConflict = (barcode: string | undefined, label: string) => {
    if (!barcode) return;
    const clean = barcode.replace(/\D/g, '');
    const conflicts = barcodeMap.get(clean) || [];
    if (conflicts.length > 1) {
      triggerHaptic('medium');
      setConflictModalData({
        type: 'barcode',
        value: clean,
        fieldLabel: `Code-barres (${label}) Répété`,
        products: conflicts,
      });
    }
  };

  const openCodeConflict = (code: string) => {
    const clean = getCleanProductCode(code);
    if (!clean) return;
    const conflicts = codeMap.get(clean) || [];
    if (conflicts.length > 1) {
      triggerHaptic('medium');
      setConflictModalData({
        type: 'code',
        value: clean,
        fieldLabel: 'Code Court Article Répété',
        products: conflicts,
      });
    }
  };

  // -------------------------------------------------------------------------
  // 7. ACTIONS (EXPORT, IMPORT, EXTRACTION)
  // -------------------------------------------------------------------------
  const handleExportCsv = () => {
    triggerHaptic('success');
    const csvContent = exportProductsToCsv(products);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `catalogue_marjane_12colonnes_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    showToast(`✅ Export CSV généré (${products.length} articles, 12 colonnes)`);
  };

  const handleProcessExtractor = () => {
    if (!extractorText.trim()) return;
    triggerHaptic('light');

    let list: Product[] = [];
    if (extractorMode === 'csv') {
      const res = parseProductsFromCsv(extractorText);
      if (res.error) {
        showToast(`❌ ${res.error}`);
        return;
      }
      list = res.products;
    } else {
      list = extractProductsFromHtmlOrScript(extractorText);
    }

    if (list.length === 0) {
      showToast('⚠️ Aucun produit détecté. Vérifiez le texte HTML ou CSV collé.');
      setExtractedPreview([]);
      setMergeResult(null);
      return;
    }

    const merge = mergeExtractedProductsWithExisting(list, products);
    setExtractedPreview(list);
    setMergeResult(merge);

    showToast(
      `🔍 ${list.length} détectés : +${merge.addedProducts.length} nouveaux, 📸 ${merge.updatedProducts.length} photos enrichies, ⏭️ ${merge.skippedCount} ignorés`
    );
  };

  const handleApplyExtractedProducts = async () => {
    if (!mergeResult && extractedPreview.length === 0) return;
    triggerHaptic('success');

    let addedCount = 0;
    let updatedCount = 0;

    if (mergeResult) {
      // 1. Enrich existing products missing images
      for (const up of mergeResult.updatedProducts) {
        await updateProduct(up);
        updatedCount++;
      }

      // 2. Add brand-new products or products with different images
      for (const p of mergeResult.addedProducts) {
        await addProduct({
          code: p.code,
          name: p.name,
          department: p.department,
          category: p.category,
          quantite: p.quantite || extractPureUnit(p.name),
          barcodeMarjane: p.barcodeMarjane,
          barcodeP2: p.barcodeP2,
          barcodeInterne: p.barcodeInterne,
          barcodeMiniSecours: p.barcodeMiniSecours,
          barcodeSecours: p.barcodeSecours,
          barcodeP3: p.barcodeP3,
          imageUrl: p.imageUrl,
          isEnabled: true,
        });
        addedCount++;
      }
    } else {
      // Direct fallback
      for (const p of extractedPreview) {
        await addProduct({
          code: p.code,
          name: p.name,
          department: p.department,
          category: p.category,
          quantite: p.quantite || extractPureUnit(p.name),
          barcodeMarjane: p.barcodeMarjane,
          barcodeP2: p.barcodeP2,
          barcodeInterne: p.barcodeInterne,
          barcodeMiniSecours: p.barcodeMiniSecours,
          barcodeSecours: p.barcodeSecours,
          barcodeP3: p.barcodeP3,
          imageUrl: p.imageUrl,
          isEnabled: true,
        });
        addedCount++;
      }
    }

    showToast(`✅ Succès : +${addedCount} articles ajoutés & ${updatedCount} photos mises à jour !`);
    setIsExtractorModalOpen(false);
    setExtractorText('');
    setExtractedPreview([]);
    setMergeResult(null);
  };

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const content = evt.target?.result as string;
      if (content) {
        setExtractorText(content);
        setExtractorMode('csv');
        setIsExtractorModalOpen(true);
        const res = parseProductsFromCsv(content);
        if (!res.error) {
          setExtractedPreview(res.products);
        }
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // SQL snippet for ALTER TABLE quantite
  const alterTableSql = `ALTER TABLE public.products ADD COLUMN IF NOT EXISTS quantite TEXT DEFAULT 'pièce';
ALTER TABLE api.products ADD COLUMN IF NOT EXISTS quantite TEXT DEFAULT 'pièce';`;

  return (
    <div className="min-h-screen bg-[#F4F5F9] dark:bg-slate-950 text-gray-900 dark:text-slate-100 flex flex-col transition-colors pb-16">
      
      {/* ------------------------------------------------------------------- */}
      {/* BANDEAU KPI SUPÉRIEUR EN DIRECT                                     */}
      {/* ------------------------------------------------------------------- */}
      <div className="bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-800 shadow-2xs px-4 sm:px-6 py-3 shrink-0">
        <div className="max-w-[1700px] mx-auto flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Brand & Supabase connection badge */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-[12px] bg-[#0759A4] flex items-center justify-center text-white shadow-sm shrink-0">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-base sm:text-lg font-black text-gray-900 dark:text-white leading-tight">
                  Gestionnaire Catalogue Retail & Marjane
                </h1>
                {supabaseHealth?.connected ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                    <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                    Supabase Connecté ({supabaseHealth.productCount} en ligne)
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                    <AlertTriangle className="w-3 h-3 text-amber-500" />
                    En attente connexion
                  </span>
                )}
              </div>
              <p className="text-[11px] text-gray-500 dark:text-slate-400">
                Format 12 colonnes strictes • Détection automatique des doublons • Unités sans chiffres
              </p>
            </div>
          </div>

          {/* Action buttons (Extract, Export, Phones, Sync, SQL) */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Extract HTML & Images */}
            <button
              type="button"
              onClick={() => {
                triggerHaptic('light');
                setExtractorMode('html');
                setIsExtractorModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-[10px] bg-gradient-to-r from-[#0759A4] to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white text-xs font-black shadow-xs active:scale-95 transition cursor-pointer select-none"
              title="Extraction de fiches produits et photos depuis du texte HTML ou script"
            >
              <Globe className="w-3.5 h-3.5 text-blue-200" />
              <span>Extraire HTML & Images</span>
            </button>

            {/* Hidden File input for CSV */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileImport}
              accept=".csv,.txt"
              className="hidden"
            />

            {/* Export CSV (12 Colonnes) */}
            <button
              type="button"
              onClick={handleExportCsv}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-[10px] bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-200 border border-gray-200 dark:border-slate-700 text-xs font-bold shadow-2xs active:scale-95 transition cursor-pointer"
              title="Exporter le catalogue au format strict 12 colonnes"
            >
              <Download className="w-3.5 h-3.5 text-emerald-600" />
              <span>Exporter CSV (12 col)</span>
            </button>

            {/* User Devices button */}
            <button
              type="button"
              onClick={() => {
                triggerHaptic('light');
                setIsDevicesModalOpen(true);
                refreshUserDevices();
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-[10px] bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white text-xs font-black shadow-xs active:scale-95 transition cursor-pointer select-none"
              title="Consulter les téléphones enregistrés et leur temps d'utilisation"
            >
              <Smartphone className="w-3.5 h-3.5 text-white" />
              <span>Téléphones ({deviceStats?.totalDevices ?? userDevices.length})</span>
              {deviceStats && deviceStats.onlineDevices > 0 && (
                <span className="w-2 h-2 rounded-full bg-emerald-300 animate-pulse" />
              )}
            </button>

            {/* Supabase Sync Button */}
            <button
              type="button"
              onClick={() => {
                triggerHaptic('light');
                syncWithSupabase(true);
              }}
              disabled={syncStatus === 'syncing'}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-[10px] bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-200 text-xs font-bold transition active:scale-95 cursor-pointer disabled:opacity-50"
              title="Synchroniser avec Supabase"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${syncStatus === 'syncing' ? 'animate-spin text-blue-600' : ''}`} />
              <span>Sync DB</span>
            </button>

            {/* SQL Modal button */}
            <button
              type="button"
              onClick={() => setIsSqlModalOpen(true)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-[10px] bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 text-gray-700 dark:text-slate-300 text-xs font-bold transition cursor-pointer"
              title="Afficher le script SQL Supabase"
            >
              <Code2 className="w-3.5 h-3.5" />
              <span>SQL</span>
            </button>

            {/* Add product button */}
            <button
              type="button"
              onClick={() => {
                triggerHaptic('light');
                setIsAddModalOpen(true);
              }}
              className="flex items-center gap-1 px-3 py-1.5 rounded-[10px] bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black shadow-xs active:scale-95 transition cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Ajouter</span>
            </button>
          </div>
        </div>

        {/* KPI Counter Cards Row */}
        <div className="max-w-[1700px] mx-auto grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5 pt-3">
          {/* KPI 1: Total Produits */}
          <div
            onClick={() => setFilterSpecial('ALL')}
            className={`p-2.5 sm:p-3 rounded-[14px] border cursor-pointer transition select-none ${
              filterSpecial === 'ALL'
                ? 'bg-blue-50/80 dark:bg-blue-950/40 border-blue-300 dark:border-blue-700 shadow-xs'
                : 'bg-gray-50 dark:bg-slate-800/60 border-gray-200 dark:border-slate-700 hover:bg-gray-100'
            }`}
          >
            <div className="flex items-center justify-between text-gray-500 dark:text-slate-400">
              <span className="text-[10px] font-bold uppercase tracking-wider">Total Produits</span>
              <Layers className="w-3.5 h-3.5 text-blue-600" />
            </div>
            <div className="text-lg sm:text-xl font-black text-gray-900 dark:text-white mt-0.5">
              {totalProducts}
            </div>
          </div>

          {/* KPI 2: Sans Code (Orange / Ambre) */}
          <div
            onClick={() => setFilterSpecial(filterSpecial === 'NO_CODE' ? 'ALL' : 'NO_CODE')}
            className={`p-2.5 sm:p-3 rounded-[14px] border cursor-pointer transition select-none ${
              filterSpecial === 'NO_CODE'
                ? 'bg-amber-100/80 dark:bg-amber-950/60 border-amber-400 dark:border-amber-700 shadow-xs ring-1 ring-amber-400'
                : 'bg-amber-50/70 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800/60 hover:bg-amber-100/50'
            }`}
          >
            <div className="flex items-center justify-between text-amber-800 dark:text-amber-300">
              <span className="text-[10px] font-bold uppercase tracking-wider">Sans Code</span>
              <Tag className="w-3.5 h-3.5 text-amber-600" />
            </div>
            <div className="text-lg sm:text-xl font-black text-amber-900 dark:text-amber-200 mt-0.5">
              {withoutCodeCount}
            </div>
          </div>

          {/* KPI 3: Sans Code-barre */}
          <div
            onClick={() => setFilterSpecial(filterSpecial === 'NO_BARCODE' ? 'ALL' : 'NO_BARCODE')}
            className={`p-2.5 sm:p-3 rounded-[14px] border cursor-pointer transition select-none ${
              filterSpecial === 'NO_BARCODE'
                ? 'bg-orange-100/80 dark:bg-orange-950/60 border-orange-400 dark:border-orange-700 shadow-xs ring-1 ring-orange-400'
                : 'bg-orange-50/70 dark:bg-orange-950/30 border-orange-200 dark:border-orange-800/60 hover:bg-orange-100/50'
            }`}
          >
            <div className="flex items-center justify-between text-orange-800 dark:text-orange-300">
              <span className="text-[10px] font-bold uppercase tracking-wider">Sans Code-barres</span>
              <AlertTriangle className="w-3.5 h-3.5 text-orange-600" />
            </div>
            <div className="text-lg sm:text-xl font-black text-orange-900 dark:text-orange-200 mt-0.5">
              {withoutBarcodeCount}
            </div>
          </div>

          {/* KPI 4: Noms Répétés (Violet clair) */}
          <div
            onClick={() => setFilterSpecial(filterSpecial === 'DUP_NAMES' ? 'ALL' : 'DUP_NAMES')}
            className={`p-2.5 sm:p-3 rounded-[14px] border cursor-pointer transition select-none ${
              filterSpecial === 'DUP_NAMES'
                ? 'bg-purple-100 dark:bg-purple-950/60 border-purple-400 dark:border-purple-700 shadow-xs ring-1 ring-purple-400'
                : 'bg-purple-50/70 dark:bg-purple-950/30 border-purple-200 dark:border-purple-800/60 hover:bg-purple-100/50'
            }`}
          >
            <div className="flex items-center justify-between text-purple-800 dark:text-purple-300">
              <span className="text-[10px] font-bold uppercase tracking-wider">Noms Répétés</span>
              <span className="w-2 h-2 rounded-full bg-purple-500" />
            </div>
            <div className="text-lg sm:text-xl font-black text-purple-900 dark:text-purple-200 mt-0.5">
              {duplicateNamesCount}
            </div>
          </div>

          {/* KPI 5: Code-barres Répétés (Rose / Rouge clair) */}
          <div
            onClick={() => setFilterSpecial(filterSpecial === 'DUP_BARCODES' ? 'ALL' : 'DUP_BARCODES')}
            className={`p-2.5 sm:p-3 rounded-[14px] border cursor-pointer transition select-none ${
              filterSpecial === 'DUP_BARCODES'
                ? 'bg-rose-100 dark:bg-rose-950/60 border-rose-400 dark:border-rose-700 shadow-xs ring-1 ring-rose-400'
                : 'bg-rose-50/70 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800/60 hover:bg-rose-100/50'
            }`}
          >
            <div className="flex items-center justify-between text-rose-800 dark:text-rose-300">
              <span className="text-[10px] font-bold uppercase tracking-wider">Codes-barres Répétés</span>
              <span className="w-2 h-2 rounded-full bg-rose-500" />
            </div>
            <div className="text-lg sm:text-xl font-black text-rose-900 dark:text-rose-200 mt-0.5">
              {duplicateBarcodesCount}
            </div>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------------- */}
      {/* CORPS PRINCIPAL & FILTRES DÉDIÉS                                    */}
      {/* ------------------------------------------------------------------- */}
      <div className="flex-1 max-w-[1700px] w-full mx-auto px-3 sm:px-6 py-4 space-y-3 flex flex-col">

        {/* LIGNE 1 DÉDIÉE : GRANDE BARRE DE RECHERCHE + SÉLECTEUR D'UNITÉ */}
        <div className="bg-white dark:bg-slate-900 rounded-[18px] border border-gray-200 dark:border-slate-800 p-2.5 sm:p-3 shadow-2xs flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
          {/* Main Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={adminSearch}
              onChange={(e) => setAdminSearch(e.target.value)}
              placeholder="Rechercher par code (ex: 6037), nom de produit, code-barres (EAN-13 / EAN-8), département..."
              className="w-full pl-9 pr-9 py-2 rounded-[12px] bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-xs sm:text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0759A4]"
            />
            {adminSearch && (
              <button
                type="button"
                onClick={() => setAdminSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Pure Unit Selector ('Toutes' | 'kg' | 'g' | 'pièce') */}
          <div className="flex items-center gap-1 bg-gray-100 dark:bg-slate-800 p-1 rounded-[12px] border border-gray-200 dark:border-slate-700 shrink-0">
            <span className="text-[11px] font-bold text-gray-500 dark:text-slate-400 px-2 hidden md:inline">
              Unité :
            </span>
            {(['ALL', 'kg', 'g', 'pièce'] as const).map((unit) => (
              <button
                key={unit}
                type="button"
                onClick={() => {
                  triggerHaptic('light');
                  setSelectedUnit(unit);
                }}
                className={`px-3 py-1 rounded-[8px] text-xs font-black transition cursor-pointer select-none ${
                  selectedUnit === unit
                    ? 'bg-[#0759A4] text-white shadow-xs'
                    : 'text-gray-600 dark:text-slate-300 hover:text-gray-900 hover:bg-white/60 dark:hover:bg-slate-700'
                }`}
              >
                {unit === 'ALL' ? 'Toutes' : unit}
              </button>
            ))}
          </div>
        </div>

        {/* LIGNE 2 DÉDIÉE : FILTRES ANOMALIES + ONGLETS CATÉGORIES A-Z */}
        <div className="bg-white dark:bg-slate-900 rounded-[18px] border border-gray-200 dark:border-slate-800 p-2.5 sm:p-3 shadow-2xs space-y-2">
          {/* Quick Anomaly Filter Chips */}
          <div className="flex items-center gap-1.5 flex-wrap pb-1 border-b border-gray-100 dark:border-slate-800">
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mr-1">
              Filtres :
            </span>

            <button
              type="button"
              onClick={() => setFilterSpecial('ALL')}
              className={`px-2.5 py-1 rounded-full text-xs font-bold transition cursor-pointer select-none ${
                filterSpecial === 'ALL'
                  ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900'
                  : 'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-300 hover:bg-gray-200'
              }`}
            >
              Tous ({products.length})
            </button>

            <button
              type="button"
              onClick={() => setFilterSpecial('NO_CODE')}
              className={`px-2.5 py-1 rounded-full text-xs font-bold transition cursor-pointer select-none ${
                filterSpecial === 'NO_CODE'
                  ? 'bg-amber-600 text-white'
                  : 'bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
              }`}
            >
              Sans Code ({withoutCodeCount})
            </button>

            <button
              type="button"
              onClick={() => setFilterSpecial('NO_BARCODE')}
              className={`px-2.5 py-1 rounded-full text-xs font-bold transition cursor-pointer select-none ${
                filterSpecial === 'NO_BARCODE'
                  ? 'bg-orange-600 text-white'
                  : 'bg-orange-50 dark:bg-orange-950/60 text-orange-800 dark:text-orange-300 border border-orange-200 dark:border-orange-800'
              }`}
            >
              Sans Code-barre ({withoutBarcodeCount})
            </button>

            <button
              type="button"
              onClick={() => setFilterSpecial('DUP_NAMES')}
              className={`px-2.5 py-1 rounded-full text-xs font-bold transition cursor-pointer select-none ${
                filterSpecial === 'DUP_NAMES'
                  ? 'bg-purple-700 text-white'
                  : 'bg-purple-50 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300 border border-purple-200 dark:border-purple-800'
              }`}
            >
              Noms Répétés ({duplicateNamesCount})
            </button>

            <button
              type="button"
              onClick={() => setFilterSpecial('DUP_BARCODES')}
              className={`px-2.5 py-1 rounded-full text-xs font-bold transition cursor-pointer select-none ${
                filterSpecial === 'DUP_BARCODES'
                  ? 'bg-rose-700 text-white'
                  : 'bg-rose-50 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
              }`}
            >
              Codes-barres Répétés ({duplicateBarcodesCount})
            </button>

            <button
              type="button"
              onClick={() => setFilterSpecial(filterSpecial === 'VISIBLE' ? 'ALL' : 'VISIBLE')}
              className={`px-2.5 py-1 rounded-full text-xs font-bold transition cursor-pointer select-none flex items-center gap-1 ${
                filterSpecial === 'VISIBLE'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
              }`}
            >
              <Eye className="w-3 h-3 text-emerald-500" />
              <span>Visibles ({activeProductsCount})</span>
            </button>

            <button
              type="button"
              onClick={() => setFilterSpecial(filterSpecial === 'HIDDEN' ? 'ALL' : 'HIDDEN')}
              className={`px-2.5 py-1 rounded-full text-xs font-bold transition cursor-pointer select-none flex items-center gap-1 ${
                filterSpecial === 'HIDDEN'
                  ? 'bg-slate-700 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
              }`}
            >
              <EyeOff className="w-3 h-3 text-gray-500" />
              <span>Masqués ({hiddenProductsCount})</span>
            </button>
          </div>

          {/* Sorted Categories A-Z Horizontal Scroll */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-1">
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mr-1 shrink-0">
              Catégories (A-Z) :
            </span>

            <button
              type="button"
              onClick={() => setSelectedCategory('ALL')}
              className={`px-2.5 py-0.5 rounded-[8px] text-[11px] font-bold transition cursor-pointer select-none shrink-0 ${
                selectedCategory === 'ALL'
                  ? 'bg-[#0759A4] text-white'
                  : 'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-300 hover:bg-gray-200'
              }`}
            >
              Toutes
            </button>

            {sortedCategories.map((c) => (
              <button
                key={c.name}
                type="button"
                onClick={() => {
                  triggerHaptic('light');
                  setSelectedCategory(selectedCategory === c.name ? 'ALL' : c.name);
                }}
                className={`px-2.5 py-0.5 rounded-[8px] text-[11px] font-bold transition cursor-pointer select-none shrink-0 flex items-center gap-1 ${
                  selectedCategory === c.name
                    ? 'bg-[#0759A4] text-white shadow-xs'
                    : 'bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-700'
                }`}
              >
                <span>{c.name}</span>
                <span className="text-[10px] opacity-75 font-mono">({c.count})</span>
              </button>
            ))}
          </div>
        </div>

        {/* ------------------------------------------------------------------- */}
        {/* TABLEAU DES 12 COLONNES STRICTES & CELLULES INTERACTIVES            */}
        {/* ------------------------------------------------------------------- */}
        <div className="flex-1 bg-white dark:bg-slate-900 rounded-[18px] border border-gray-200 dark:border-slate-800 shadow-2xs overflow-hidden flex flex-col">
          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-gray-50 dark:bg-slate-800/80 border-b border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-300 font-black uppercase tracking-wider text-[10.5px]">
                  <th className="py-2.5 px-3 whitespace-nowrap">Image</th>
                  <th className="py-2.5 px-3 whitespace-nowrap">Code</th>
                  <th className="py-2.5 px-3 min-w-[200px]">Produit</th>
                  <th className="py-2.5 px-3 whitespace-nowrap">Marjane</th>
                  <th className="py-2.5 px-3 whitespace-nowrap">Marjane 2</th>
                  <th className="py-2.5 px-3 whitespace-nowrap">Marjane Interne</th>
                  <th className="py-2.5 px-3 whitespace-nowrap">Marjane Mini</th>
                  <th className="py-2.5 px-3 whitespace-nowrap">Marjane Sec</th>
                  <th className="py-2.5 px-3 whitespace-nowrap">Marjane Sec 2</th>
                  <th className="py-2.5 px-3 whitespace-nowrap">Département</th>
                  <th className="py-2.5 px-3 whitespace-nowrap">Catégorie</th>
                  <th className="py-2.5 px-3 whitespace-nowrap text-center">Quantité</th>
                  <th className="py-2.5 px-3 whitespace-nowrap text-center">Visibilité</th>
                  <th className="py-2.5 px-3 whitespace-nowrap text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-slate-800 font-medium">
                {paginatedList.length > 0 ? (
                  paginatedList.map((product) => {
                    const normName = normalizeSearchText(product.name);
                    const isDuplicateName = (nameMap.get(normName)?.length || 0) > 1;
                    const cleanCode = getCleanProductCode(product.code);
                    const isMissingCode = !cleanCode || cleanCode === '-';
                    const isDuplicateCode = cleanCode && (codeMap.get(cleanCode)?.length || 0) > 1;

                    // Barcode duplicates check helper
                    const checkBcDuplicate = (bc: string | undefined) => {
                      if (!bc) return false;
                      const clean = bc.replace(/\D/g, '');
                      return (barcodeMap.get(clean)?.length || 0) > 1;
                    };

                    const isMjDup = checkBcDuplicate(product.barcodeMarjane);
                    const isP2Dup = checkBcDuplicate(product.barcodeP2);
                    const isInterneDup = checkBcDuplicate(product.barcodeInterne);
                    const isMiniDup = checkBcDuplicate(product.barcodeMiniSecours);
                    const isSecDup = checkBcDuplicate(product.barcodeSecours);
                    const isSec2Dup = checkBcDuplicate(product.barcodeP3);

                    const pureUnit = product.quantite || extractPureUnit(product.name);

                    return (
                      <tr
                        key={product.id}
                        className={`hover:bg-blue-50/40 dark:hover:bg-slate-800/40 transition-colors ${
                          !product.isEnabled ? 'opacity-65 bg-gray-50/70 dark:bg-slate-900/50' : ''
                        }`}
                      >
                        {/* 1. image_html */}
                        <td className="py-2 px-3 whitespace-nowrap">
                          {product.imageUrl ? (
                            <button
                              type="button"
                              onClick={() => setPreviewImageUrl(product.imageUrl || null)}
                              className="w-10 h-10 rounded-[10px] bg-white border border-gray-200 overflow-hidden p-0.5 flex items-center justify-center cursor-pointer hover:scale-105 transition shadow-2xs"
                              title="Agrandir l'image"
                            >
                              <img
                                src={product.imageUrl}
                                alt={product.name}
                                className="w-full h-full object-contain pointer-events-none"
                                onError={(e) => {
                                  (e.target as HTMLElement).style.display = 'none';
                                }}
                              />
                            </button>
                          ) : (
                            <div className="w-10 h-10 rounded-[10px] bg-gray-100 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 flex items-center justify-center text-gray-400">
                              <ShoppingBag className="w-4 h-4 opacity-40" />
                            </div>
                          )}
                        </td>

                        {/* 2. code (Orange si manquant, clic inspecte si dupliqué) */}
                        <td className="py-2 px-3 whitespace-nowrap">
                          {isMissingCode ? (
                            <span className="inline-block px-2 py-0.5 rounded-[6px] bg-amber-50 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 border border-amber-300 font-mono font-bold text-[11px]">
                              Indisponible (-)
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => isDuplicateCode && openCodeConflict(product.code)}
                              className={`font-mono text-xs font-black px-2 py-0.5 rounded-[6px] border select-none transition ${
                                isDuplicateCode
                                  ? 'bg-amber-100 text-amber-900 border-amber-400 cursor-pointer hover:scale-105'
                                  : 'bg-gray-100 dark:bg-slate-800 text-gray-800 dark:text-slate-200 border-gray-200 dark:border-slate-700'
                              }`}
                              title={isDuplicateCode ? 'Code dupliqué ! Cliquer pour inspecter' : 'Code article'}
                            >
                              {product.code}
                            </button>
                          )}
                        </td>

                        {/* 3. produit (Violet clair si répété) */}
                        <td className="py-2 px-3">
                          <button
                            type="button"
                            onClick={() => isDuplicateName && openNameConflict(product)}
                            className={`text-left font-bold text-xs leading-snug rounded-[6px] px-1.5 py-0.5 transition ${
                              isDuplicateName
                                ? 'bg-purple-100 dark:bg-purple-950/80 text-purple-900 dark:text-purple-200 border border-purple-300 dark:border-purple-700 hover:ring-2 hover:ring-purple-400 cursor-pointer'
                                : 'text-gray-900 dark:text-white'
                            }`}
                            title={isDuplicateName ? 'Nom en doublon ! Cliquer pour voir les conflits' : product.name}
                          >
                            <span>{product.name}</span>
                            {isDuplicateName && (
                              <span className="ml-1.5 text-[10px] font-black uppercase text-purple-700 dark:text-purple-300 underline">
                                (Doublon)
                              </span>
                            )}
                          </button>
                        </td>

                        {/* 4. marjane (Rose clair si dupliqué) */}
                        <td className="py-2 px-3 whitespace-nowrap">
                          {product.barcodeMarjane ? (
                            <button
                              type="button"
                              onClick={() => openBarcodeConflict(product.barcodeMarjane, 'Marjane')}
                              className={`font-mono text-xs px-2 py-0.5 rounded-[6px] border select-none transition ${
                                isMjDup
                                  ? 'bg-rose-100 dark:bg-rose-950/80 text-rose-900 dark:text-rose-200 border-rose-300 cursor-pointer font-black hover:scale-105'
                                  : 'bg-blue-50/60 dark:bg-blue-950/40 text-blue-800 dark:text-blue-300 border-blue-200'
                              }`}
                              title={isMjDup ? 'Code-barres dupliqué ! Cliquer pour inspecter' : 'Code principal'}
                            >
                              {product.barcodeMarjane}
                            </button>
                          ) : (
                            <span className="text-gray-300 dark:text-slate-600 font-mono">-</span>
                          )}
                        </td>

                        {/* 5. marjane 2 */}
                        <td className="py-2 px-3 whitespace-nowrap">
                          {product.barcodeP2 ? (
                            <button
                              type="button"
                              onClick={() => openBarcodeConflict(product.barcodeP2, 'Marjane 2')}
                              className={`font-mono text-xs px-2 py-0.5 rounded-[6px] border select-none transition ${
                                isP2Dup
                                  ? 'bg-rose-100 dark:bg-rose-950/80 text-rose-900 dark:text-rose-200 border-rose-300 cursor-pointer font-black hover:scale-105'
                                  : 'bg-orange-50/60 dark:bg-orange-950/40 text-orange-800 dark:text-orange-300 border-orange-200'
                              }`}
                            >
                              {product.barcodeP2}
                            </button>
                          ) : (
                            <span className="text-gray-300 dark:text-slate-600 font-mono">-</span>
                          )}
                        </td>

                        {/* 6. marjane Interne */}
                        <td className="py-2 px-3 whitespace-nowrap">
                          {product.barcodeInterne ? (
                            <button
                              type="button"
                              onClick={() => openBarcodeConflict(product.barcodeInterne, 'Marjane Interne')}
                              className={`font-mono text-xs px-2 py-0.5 rounded-[6px] border select-none transition ${
                                isInterneDup
                                  ? 'bg-rose-100 dark:bg-rose-950/80 text-rose-900 dark:text-rose-200 border-rose-300 cursor-pointer font-black hover:scale-105'
                                  : 'bg-purple-50/60 dark:bg-purple-950/40 text-purple-800 dark:text-purple-300 border-purple-200'
                              }`}
                            >
                              {product.barcodeInterne}
                            </button>
                          ) : (
                            <span className="text-gray-300 dark:text-slate-600 font-mono">-</span>
                          )}
                        </td>

                        {/* 7. marjane mini */}
                        <td className="py-2 px-3 whitespace-nowrap">
                          {product.barcodeMiniSecours ? (
                            <button
                              type="button"
                              onClick={() => openBarcodeConflict(product.barcodeMiniSecours, 'Marjane Mini')}
                              className={`font-mono text-xs px-2 py-0.5 rounded-[6px] border select-none transition ${
                                isMiniDup
                                  ? 'bg-rose-100 dark:bg-rose-950/80 text-rose-900 dark:text-rose-200 border-rose-300 cursor-pointer font-black hover:scale-105'
                                  : 'bg-sky-50 dark:bg-sky-950/40 text-sky-800 dark:text-sky-300 border-sky-200'
                              }`}
                            >
                              {product.barcodeMiniSecours}
                            </button>
                          ) : (
                            <span className="text-gray-300 dark:text-slate-600 font-mono">-</span>
                          )}
                        </td>

                        {/* 8. marjane sec */}
                        <td className="py-2 px-3 whitespace-nowrap">
                          {product.barcodeSecours ? (
                            <button
                              type="button"
                              onClick={() => openBarcodeConflict(product.barcodeSecours, 'Marjane Sec')}
                              className={`font-mono text-xs px-2 py-0.5 rounded-[6px] border select-none transition ${
                                isSecDup
                                  ? 'bg-rose-100 dark:bg-rose-950/80 text-rose-900 dark:text-rose-200 border-rose-300 cursor-pointer font-black hover:scale-105'
                                  : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-300 border-slate-200'
                              }`}
                            >
                              {product.barcodeSecours}
                            </button>
                          ) : (
                            <span className="text-gray-300 dark:text-slate-600 font-mono">-</span>
                          )}
                        </td>

                        {/* 9. marjane sec 2 */}
                        <td className="py-2 px-3 whitespace-nowrap">
                          {product.barcodeP3 ? (
                            <button
                              type="button"
                              onClick={() => openBarcodeConflict(product.barcodeP3, 'Marjane Sec 2')}
                              className={`font-mono text-xs px-2 py-0.5 rounded-[6px] border select-none transition ${
                                isSec2Dup
                                  ? 'bg-rose-100 dark:bg-rose-950/80 text-rose-900 dark:text-rose-200 border-rose-300 cursor-pointer font-black hover:scale-105'
                                  : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-300 border-slate-200'
                              }`}
                            >
                              {product.barcodeP3}
                            </button>
                          ) : (
                            <span className="text-gray-300 dark:text-slate-600 font-mono">-</span>
                          )}
                        </td>

                        {/* 10. département */}
                        <td className="py-2 px-3 whitespace-nowrap">
                          <span
                            className="px-2 py-0.5 rounded-[6px] text-[10px] font-bold"
                            style={{
                              backgroundColor: DEPARTMENT_CONFIGS[product.department]?.tagBg || '#EFF6FF',
                              color: DEPARTMENT_CONFIGS[product.department]?.tagText || '#1E40AF',
                            }}
                          >
                            {DEPARTMENT_CONFIGS[product.department]?.shortName || product.department}
                          </span>
                        </td>

                        {/* 11. catégorie */}
                        <td className="py-2 px-3 whitespace-nowrap text-gray-600 dark:text-slate-300 font-semibold">
                          {product.category || 'Général'}
                        </td>

                        {/* 12. quantite (Pure Unité : 'kg' | 'g' | 'pièce') */}
                        <td className="py-2 px-3 whitespace-nowrap text-center">
                          <select
                            value={pureUnit}
                            onChange={(e) => {
                              const newUnit = e.target.value as 'kg' | 'g' | 'pièce';
                              updateProduct({ ...product, quantite: newUnit });
                              showToast(`Unité modifiée pour ${product.name} : ${newUnit}`);
                            }}
                            className={`px-2 py-0.5 rounded-[6px] text-xs font-black border cursor-pointer focus:outline-none focus:ring-1 ${
                              pureUnit === 'kg'
                                ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300'
                                : pureUnit === 'g'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300'
                                : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300'
                            }`}
                          >
                            <option value="kg">kg</option>
                            <option value="g">g</option>
                            <option value="pièce">pièce</option>
                          </select>
                        </td>

                        {/* Visibilité (O KHLI LIA L POSSIBILITE F DASH ANANI NKHLI PRODUCT IBANO OLA MAYBANOCH FDASHBOARD) */}
                        <td className="py-2 px-3 whitespace-nowrap text-center">
                          <button
                            type="button"
                            onClick={() => {
                              triggerHaptic('light');
                              toggleProductStatus(product.id);
                              showToast(
                                product.isEnabled
                                  ? `👁️ Produit masqué : ${product.name}`
                                  : `✅ Produit rendu visible : ${product.name}`
                              );
                            }}
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[8px] text-[11px] font-black transition cursor-pointer shadow-2xs select-none active:scale-95 ${
                              product.isEnabled
                                ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200 dark:bg-emerald-950/70 dark:text-emerald-300 dark:hover:bg-emerald-900/90 border border-emerald-300 dark:border-emerald-700'
                                : 'bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700 border border-gray-300 dark:border-slate-700'
                            }`}
                            title={
                              product.isEnabled
                                ? 'Visible dans le catalogue (Actif) - Cliquer pour masquer'
                                : 'Masqué du catalogue (Inactif) - Cliquer pour rendre visible'
                            }
                          >
                            {product.isEnabled ? (
                              <>
                                <Eye className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                                <span>Visible</span>
                              </>
                            ) : (
                              <>
                                <EyeOff className="w-3.5 h-3.5 text-gray-500" />
                                <span>Masqué</span>
                              </>
                            )}
                          </button>
                        </td>

                        {/* Actions */}
                        <td className="py-2 px-3 whitespace-nowrap text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingProduct(product);
                              }}
                              className="p-1 rounded-[6px] text-gray-500 hover:text-blue-600 hover:bg-gray-100 dark:hover:bg-slate-700 transition"
                              title="Modifier la fiche complète"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setProductToDelete(product)}
                              className="p-1 rounded-[6px] text-gray-500 hover:text-rose-600 hover:bg-gray-100 dark:hover:bg-slate-700 transition"
                              title="Supprimer l'article"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={14} className="py-12 text-center text-gray-500 dark:text-slate-400">
                      <Layers className="w-10 h-10 mx-auto text-gray-300 dark:text-slate-600 mb-2" />
                      <p className="text-sm font-bold">Aucun produit ne correspond aux filtres sélectionnés</p>
                      <button
                        type="button"
                        onClick={() => {
                          setAdminSearch('');
                          setSelectedUnit('ALL');
                          setFilterSpecial('ALL');
                          setSelectedCategory('ALL');
                        }}
                        className="mt-2 px-3 py-1 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 rounded-[8px] text-xs font-bold text-gray-700 dark:text-slate-300 cursor-pointer"
                      >
                        Réinitialiser tous les filtres
                      </button>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Table Footer: Pagination */}
          <div className="p-3 border-t border-gray-100 dark:border-slate-800 bg-gray-50/60 dark:bg-slate-800/40 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gray-600 dark:text-slate-400">
            <div>
              Affichage de{' '}
              <span className="font-bold text-gray-900 dark:text-white">
                {paginatedList.length > 0 ? (currentPage - 1) * pageSize + 1 : 0}
              </span>{' '}
              à{' '}
              <span className="font-bold text-gray-900 dark:text-white">
                {Math.min(currentPage * pageSize, filteredProducts.length)}
              </span>{' '}
              sur{' '}
              <span className="font-bold text-gray-900 dark:text-white">{filteredProducts.length}</span>{' '}
              produits filtrés ({totalProducts} au total)
            </div>

            <div className="flex items-center gap-2">
              <span className="hidden sm:inline">Lignes par page :</span>
              <select
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
                className="px-2 py-1 rounded-[6px] bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-xs font-bold"
              >
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
                <option value={200}>200</option>
                <option value={0}>Tous</option>
              </select>

              <div className="flex items-center gap-1 ml-2">
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage <= 1}
                  className="p-1 rounded-[6px] border border-gray-200 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-700 disabled:opacity-30 cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="px-2 font-bold font-mono">
                  {currentPage} / {totalPages || 1}
                </span>
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage >= totalPages}
                  className="p-1 rounded-[6px] border border-gray-200 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-700 disabled:opacity-30 cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* ------------------------------------------------------------------- */}
      {/* MODALE D'INSPECTION DE CONFLIT / DOUBLONS                           */}
      {/* ------------------------------------------------------------------- */}
      {conflictModalData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-4xl max-h-[90vh] bg-white dark:bg-slate-900 rounded-[24px] shadow-2xl border border-gray-200 dark:border-slate-800 flex flex-col overflow-hidden text-gray-900 dark:text-slate-100">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100 dark:border-slate-800 bg-gray-50/80 dark:bg-slate-800/60 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-[10px] bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-black text-gray-900 dark:text-white leading-tight">
                    Inspection de Doublon : {conflictModalData.fieldLabel}
                  </h3>
                  <p className="text-xs text-gray-500 font-mono">
                    Valeur en conflit : <strong className="text-purple-700 dark:text-purple-400">"{conflictModalData.value}"</strong> ({conflictModalData.products.length} articles trouvés)
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setConflictModalData(null)}
                className="p-1.5 rounded-full text-gray-400 hover:text-gray-700 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* List of conflicting products side by side */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3">
              <p className="text-xs text-gray-600 dark:text-slate-300">
                Ces {conflictModalData.products.length} articles partagent la même valeur. Vous pouvez les comparer, corriger l'un d'eux, ou filtrer le tableau principal sur cette anomalie.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {conflictModalData.products.map((p, idx) => (
                  <div
                    key={p.id}
                    className="p-3.5 rounded-[16px] border border-gray-200 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-800/40 space-y-2 relative"
                  >
                    <div className="flex items-start gap-3">
                      {p.imageUrl ? (
                        <div className="w-14 h-14 rounded-[12px] bg-white border border-gray-200 overflow-hidden p-1 shrink-0 flex items-center justify-center">
                          <img
                            src={p.imageUrl}
                            alt={p.name}
                            className="w-full h-full object-contain pointer-events-none"
                          />
                        </div>
                      ) : (
                        <div className="w-14 h-14 rounded-[12px] bg-gray-200 dark:bg-slate-700 flex items-center justify-center text-gray-400 shrink-0">
                          <ShoppingBag className="w-6 h-6 opacity-30" />
                        </div>
                      )}

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-mono text-xs font-black px-2 py-0.5 rounded bg-gray-200 dark:bg-slate-700 text-gray-800 dark:text-slate-200">
                            {p.code}
                          </span>
                          <span className="text-[10px] text-gray-500 font-semibold">
                            ID: {p.id} • {p.category}
                          </span>
                        </div>
                        <h4 className="text-xs sm:text-sm font-black text-gray-900 dark:text-white mt-1 leading-snug">
                          {p.name}
                        </h4>
                      </div>
                    </div>

                    {/* Barcodes list */}
                    <div className="text-[11px] font-mono space-y-1 bg-white dark:bg-slate-900 p-2 rounded-[10px] border border-gray-200 dark:border-slate-800">
                      <div className="flex justify-between">
                        <span className="text-gray-400 font-sans">Marjane:</span>
                        <span className={p.barcodeMarjane === conflictModalData.value ? 'font-bold text-rose-600' : ''}>
                          {p.barcodeMarjane || '-'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400 font-sans">Marjane 2:</span>
                        <span className={p.barcodeP2 === conflictModalData.value ? 'font-bold text-rose-600' : ''}>
                          {p.barcodeP2 || '-'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400 font-sans">Interne:</span>
                        <span className={p.barcodeInterne === conflictModalData.value ? 'font-bold text-rose-600' : ''}>
                          {p.barcodeInterne || '-'}
                        </span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          setConflictModalData(null);
                          setEditingProduct(p);
                        }}
                        className="px-2.5 py-1 rounded-[8px] bg-blue-50 text-[#0759A4] text-xs font-bold hover:bg-blue-100 transition"
                      >
                        Modifier cet article
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setConflictModalData(null);
                          setProductToDelete(p);
                        }}
                        className="px-2.5 py-1 rounded-[8px] bg-rose-50 text-rose-700 text-xs font-bold hover:bg-rose-100 transition"
                      >
                        Supprimer
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Footer */}
            <div className="p-3 border-t border-gray-100 dark:border-slate-800 bg-gray-50/80 dark:bg-slate-800/60 flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  setAdminSearch(conflictModalData.value);
                  setConflictModalData(null);
                  showToast(`Filtre appliqué pour "${conflictModalData.value}"`);
                }}
                className="px-3.5 py-1.5 rounded-[10px] bg-[#0759A4] text-white text-xs font-bold hover:bg-blue-700 transition cursor-pointer"
              >
                Filtrer le tableau principal sur cette valeur
              </button>
              <button
                type="button"
                onClick={() => setConflictModalData(null)}
                className="px-4 py-1.5 rounded-[10px] bg-gray-200 dark:bg-slate-700 text-gray-800 dark:text-slate-200 text-xs font-bold transition cursor-pointer"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------- */}
      {/* MODALE D'EXTRACTION & IMPORTATION INTELLIGENTE                       */}
      {/* ------------------------------------------------------------------- */}
      {isExtractorModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-4xl max-h-[92vh] bg-white dark:bg-slate-900 rounded-[24px] shadow-2xl border border-gray-200 dark:border-slate-800 flex flex-col overflow-hidden text-gray-900 dark:text-slate-100">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-slate-800 bg-gray-50/80 dark:bg-slate-800/60 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-[12px] bg-gradient-to-br from-[#0759A4] to-blue-700 text-white flex items-center justify-center shadow-md">
                  <Sparkles className="w-5 h-5 text-blue-200" />
                </div>
                <div>
                  <h3 className="text-base font-black text-gray-900 dark:text-white leading-tight">
                    Extraction Automatique HTML & Images Produit
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-slate-400">
                    Collez du texte HTML ou un script de page web pour extraire automatiquement noms, photos, catégories et unités
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsExtractorModalOpen(false)}
                className="p-1.5 rounded-full text-gray-400 hover:text-gray-700 dark:hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content body */}
            <div className="p-4 sm:p-5 space-y-3.5 flex-1 overflow-y-auto">
              {/* Rules banner (4 User Rules) */}
              <div className="p-3 bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 rounded-[14px] text-xs space-y-1.5">
                <div className="font-black text-blue-900 dark:text-blue-200 flex items-center gap-1.5">
                  <Lightbulb className="w-4 h-4 text-amber-500 shrink-0" />
                  <span>Règles d'extraction & gestion des doublons (قواعد الدمج الآلي) :</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-[11px] text-blue-950 dark:text-blue-200 font-medium">
                  <div className="flex items-start gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                    <span><strong>Nouveaux produits :</strong> Ajoutés automatiquement au catalogue avec leur photo et unité pure.</span>
                  </div>
                  <div className="flex items-start gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 shrink-0" />
                    <span><strong>Produit sans image :</strong> Enrichi automatiquement avec la nouvelle photo trouvée dans le HTML.</span>
                  </div>
                  <div className="flex items-start gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-purple-500 mt-1.5 shrink-0" />
                    <span><strong>Même nom, photo différente :</strong> Ajouté comme nouvelle variante du produit dans le dashboard.</span>
                  </div>
                  <div className="flex items-start gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-gray-400 mt-1.5 shrink-0" />
                    <span><strong>Doublon identique :</strong> Même nom et même image déjà présents = ignoré automatiquement.</span>
                  </div>
                </div>
              </div>

              {/* Mode Switcher */}
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-1 bg-gray-100 dark:bg-slate-800 p-1 rounded-[12px] border border-gray-200 dark:border-slate-700">
                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic('light');
                      setExtractorMode('html');
                    }}
                    className={`px-3 py-1.5 rounded-[9px] text-xs font-black transition cursor-pointer select-none flex items-center gap-1.5 ${
                      extractorMode === 'html'
                        ? 'bg-[#0759A4] text-white shadow-xs'
                        : 'text-gray-600 dark:text-slate-300 hover:text-gray-900'
                    }`}
                  >
                    <Globe className="w-3.5 h-3.5" />
                    <span>Code HTML / Script Web (Images & Produits)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic('light');
                      setExtractorMode('csv');
                    }}
                    className={`px-3 py-1.5 rounded-[9px] text-xs font-black transition cursor-pointer select-none flex items-center gap-1.5 ${
                      extractorMode === 'csv'
                        ? 'bg-[#0759A4] text-white shadow-xs'
                        : 'text-gray-600 dark:text-slate-300 hover:text-gray-900'
                    }`}
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5" />
                    <span>Format CSV (12 Colonnes)</span>
                  </button>
                </div>

                {extractorMode === 'csv' && (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-1 text-xs font-bold text-blue-600 hover:underline cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Charger un fichier .csv</span>
                  </button>
                )}
              </div>

              {/* Textarea for pasting */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-gray-700 dark:text-slate-300">
                    {extractorMode === 'html'
                      ? 'Collez le code source HTML, cartes d’articles ou script de la page :'
                      : 'Collez vos lignes CSV (12 colonnes) :'}
                  </span>
                  {extractorText && (
                    <button
                      type="button"
                      onClick={() => {
                        setExtractorText('');
                        setExtractedPreview([]);
                        setMergeResult(null);
                      }}
                      className="text-gray-400 hover:text-rose-500 font-bold transition cursor-pointer"
                    >
                      Effacer
                    </button>
                  )}
                </div>
                <textarea
                  rows={6}
                  value={extractorText}
                  onChange={(e) => setExtractorText(e.target.value)}
                  placeholder={
                    extractorMode === 'html'
                      ? 'Collez ici le HTML ou script (ex: <div class="product"><img src="...jpg" alt="Banane 1kg">... ou JSON { "name": "...", "image": "..." })...'
                      : 'code,produit,marjane,marjane 2,marjane Interne,marjane mini,marjane sec,marjane sec 2,image_html,département,catégorie,quantite\n6037,Banane 1kg,6111242400018,,,,,,https://example.com/banane.jpg,Frais,Fruits,kg'
                  }
                  className="w-full p-3 text-xs font-mono bg-gray-50 dark:bg-slate-800 rounded-[14px] border border-gray-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-[#0759A4] text-gray-900 dark:text-white"
                />
              </div>

              {/* Action: Analyser & Extraire */}
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={handleProcessExtractor}
                  disabled={!extractorText.trim()}
                  className="px-4 py-2 rounded-[11px] bg-gradient-to-r from-[#0759A4] to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white text-xs font-black shadow-xs transition active:scale-95 cursor-pointer disabled:opacity-40 flex items-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5 text-blue-200" />
                  <span>Extraire les Produits & Détecter les Doublons</span>
                </button>

                {mergeResult && (
                  <span className="text-xs font-bold text-gray-500 dark:text-slate-400">
                    Total détecté : {extractedPreview.length} articles
                  </span>
                )}
              </div>

              {/* KPI Breakdown Cards (after extraction) */}
              {mergeResult && (
                <div className="grid grid-cols-3 gap-2 pt-1 animate-in fade-in duration-200">
                  <div className="p-2.5 rounded-[12px] bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-center">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300 block">
                      Nouveaux à Ajouter
                    </span>
                    <span className="text-lg font-black text-emerald-900 dark:text-emerald-200">
                      +{mergeResult.addedProducts.length}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-[12px] bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-center">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-blue-800 dark:text-blue-300 block">
                      Photos Enrichies
                    </span>
                    <span className="text-lg font-black text-blue-900 dark:text-blue-200">
                      🔄 {mergeResult.updatedProducts.length}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-[12px] bg-gray-100 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-center">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-gray-600 dark:text-slate-400 block">
                      Doublons Ignorés
                    </span>
                    <span className="text-lg font-black text-gray-700 dark:text-slate-300">
                      ⏭️ {mergeResult.skippedCount}
                    </span>
                  </div>
                </div>
              )}

              {/* Preview table of extracted items */}
              {mergeResult && (mergeResult.addedProducts.length > 0 || mergeResult.updatedProducts.length > 0) && (
                <div className="space-y-2 pt-2 border-t border-gray-100 dark:border-slate-800">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-wider">
                      Aperçu des fiches à enregistrer ({mergeResult.addedProducts.length + mergeResult.updatedProducts.length}) :
                    </h4>
                  </div>
                  <div className="max-h-[230px] overflow-y-auto rounded-[12px] border border-gray-200 dark:border-slate-800">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-gray-100 dark:bg-slate-800 sticky top-0 text-[10px] font-bold text-gray-500 uppercase">
                        <tr>
                          <th className="p-2 whitespace-nowrap">Image</th>
                          <th className="p-2 whitespace-nowrap">Code</th>
                          <th className="p-2">Nom Produit</th>
                          <th className="p-2 whitespace-nowrap">Catégorie</th>
                          <th className="p-2 whitespace-nowrap text-center">Unité Pure</th>
                          <th className="p-2 whitespace-nowrap text-center">Statut</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                        {/* 1. Added products */}
                        {mergeResult.addedProducts.slice(0, 40).map((p, idx) => (
                          <tr key={`add-${idx}`} className="hover:bg-emerald-50/40 dark:hover:bg-emerald-950/20">
                            <td className="p-2 whitespace-nowrap">
                              {p.imageUrl ? (
                                <img
                                  src={p.imageUrl}
                                  alt={p.name}
                                  className="w-8 h-8 rounded-[6px] object-contain bg-white border border-gray-200 p-0.5"
                                  onError={(e) => {
                                    (e.target as HTMLElement).style.display = 'none';
                                  }}
                                />
                              ) : (
                                <div className="w-8 h-8 rounded-[6px] bg-gray-100 flex items-center justify-center text-gray-400">
                                  <ShoppingBag className="w-3.5 h-3.5" />
                                </div>
                              )}
                            </td>
                            <td className="p-2 font-mono font-bold">{p.code || '-'}</td>
                            <td className="p-2 font-bold text-gray-900 dark:text-white">{p.name}</td>
                            <td className="p-2 text-gray-500">{p.category || 'Général'}</td>
                            <td className="p-2 text-center font-mono font-black text-blue-600">
                              {p.quantite || extractPureUnit(p.name)}
                            </td>
                            <td className="p-2 text-center whitespace-nowrap">
                              <span className="px-2 py-0.5 rounded-[6px] text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300">
                                + Nouveau
                              </span>
                            </td>
                          </tr>
                        ))}

                        {/* 2. Updated products (Photos enrichies) */}
                        {mergeResult.updatedProducts.map((p, idx) => (
                          <tr key={`upd-${idx}`} className="hover:bg-blue-50/40 dark:hover:bg-blue-950/20">
                            <td className="p-2 whitespace-nowrap">
                              {p.imageUrl ? (
                                <img
                                  src={p.imageUrl}
                                  alt={p.name}
                                  className="w-8 h-8 rounded-[6px] object-contain bg-white border border-blue-300 p-0.5"
                                  onError={(e) => {
                                    (e.target as HTMLElement).style.display = 'none';
                                  }}
                                />
                              ) : (
                                <div className="w-8 h-8 rounded-[6px] bg-gray-100 flex items-center justify-center text-gray-400">
                                  <ShoppingBag className="w-3.5 h-3.5" />
                                </div>
                              )}
                            </td>
                            <td className="p-2 font-mono font-bold">{p.code || '-'}</td>
                            <td className="p-2 font-bold text-gray-900 dark:text-white">{p.name}</td>
                            <td className="p-2 text-gray-500">{p.category || 'Général'}</td>
                            <td className="p-2 text-center font-mono font-black text-blue-600">
                              {p.quantite || extractPureUnit(p.name)}
                            </td>
                            <td className="p-2 text-center whitespace-nowrap">
                              <span className="px-2 py-0.5 rounded-[6px] text-[10px] font-black bg-blue-100 text-blue-800 border border-blue-300">
                                📸 Photo enrichie
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-gray-100 dark:border-slate-800 bg-gray-50/80 dark:bg-slate-800/60 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setIsExtractorModalOpen(false)}
                className="px-4 py-2 rounded-[10px] bg-gray-200 dark:bg-slate-700 text-gray-800 dark:text-slate-200 text-xs font-bold cursor-pointer"
              >
                Fermer
              </button>

              <button
                type="button"
                onClick={handleApplyExtractedProducts}
                disabled={!mergeResult || (mergeResult.addedProducts.length === 0 && mergeResult.updatedProducts.length === 0)}
                className="px-5 py-2 rounded-[10px] bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black shadow-md transition disabled:opacity-40 cursor-pointer flex items-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                <span>
                  {mergeResult
                    ? `Enregistrer (+${mergeResult.addedProducts.length} nouveaux, 📸 ${mergeResult.updatedProducts.length} photos)`
                    : 'Enregistrer au catalogue'}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------- */}
      {/* MODALE DU SCRIPT SQL SUPABASE & SCHÉMA TABLE                        */}
      {/* ------------------------------------------------------------------- */}
      {isSqlModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-4xl max-h-[92vh] bg-white dark:bg-slate-900 rounded-[24px] shadow-2xl border border-gray-200 dark:border-slate-800 flex flex-col overflow-hidden text-gray-900 dark:text-slate-100">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100 dark:border-slate-800 bg-gray-50/80 dark:bg-slate-800/60 shrink-0">
              <div className="flex items-center gap-2.5">
                <Code2 className="w-5 h-5 text-[#0759A4]" />
                <div>
                  <h3 className="text-sm sm:text-base font-black text-gray-900 dark:text-white leading-tight">
                    Script SQL Supabase (12 Colonnes & user_devices)
                  </h3>
                  <p className="text-xs text-gray-500">
                    Copiez et exécutez ce script dans Supabase Dashboard -&gt; SQL Editor -&gt; Run
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsSqlModalOpen(false)}
                className="p-1.5 rounded-full text-gray-400 hover:text-gray-700 dark:hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 sm:p-5 space-y-3 flex-1 overflow-y-auto">
              {/* Quick ALTER TABLE notice */}
              <div className="p-3 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-[12px] flex items-center justify-between gap-2">
                <div>
                  <div className="text-xs font-bold text-blue-900 dark:text-blue-200">
                    Mise à jour rapide pour la colonne <code>quantite</code> :
                  </div>
                  <pre className="text-[11px] font-mono text-blue-800 dark:text-blue-300 mt-0.5">
                    {alterTableSql}
                  </pre>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(alterTableSql);
                    setCopiedAlterSql(true);
                    setTimeout(() => setCopiedAlterSql(false), 2000);
                  }}
                  className="px-3 py-1 bg-[#0759A4] text-white text-xs font-bold rounded-[8px] hover:bg-blue-700 transition shrink-0 cursor-pointer"
                >
                  {copiedAlterSql ? 'Copié !' : 'Copier ALTER TABLE'}
                </button>
              </div>

              <div className="relative">
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(SUPABASE_SETUP_SQL);
                    setCopiedSql(true);
                    setTimeout(() => setCopiedSql(false), 2000);
                  }}
                  className="absolute right-3 top-3 z-10 px-3 py-1 bg-white/10 hover:bg-white/20 text-white rounded-[8px] text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                >
                  {copiedSql ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedSql ? 'Copié !' : 'Copier tout le SQL'}</span>
                </button>

                <pre className="p-4 bg-slate-950 text-emerald-400 rounded-[14px] text-xs font-mono overflow-x-auto max-h-[380px] leading-relaxed">
                  {SUPABASE_SETUP_SQL}
                </pre>
              </div>
            </div>

            <div className="p-3 border-t border-gray-100 dark:border-slate-800 bg-gray-50/80 dark:bg-slate-800/60 flex justify-end">
              <button
                type="button"
                onClick={() => setIsSqlModalOpen(false)}
                className="px-4 py-1.5 rounded-[10px] bg-gray-900 text-white text-xs font-bold cursor-pointer"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------- */}
      {/* MODALE ÉDITION PRODUIT                                              */}
      {/* ------------------------------------------------------------------- */}
      {editingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-2xl max-h-[90vh] bg-white dark:bg-slate-900 rounded-[24px] shadow-2xl border border-gray-200 dark:border-slate-800 flex flex-col overflow-hidden text-gray-900 dark:text-slate-100">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100 dark:border-slate-800 bg-gray-50/80 dark:bg-slate-800/60 shrink-0">
              <h3 className="text-sm sm:text-base font-black text-gray-900 dark:text-white">
                Modifier le Produit #{editingProduct.id}
              </h3>
              <button
                type="button"
                onClick={() => setEditingProduct(null)}
                className="p-1.5 rounded-full text-gray-400 hover:text-gray-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 sm:p-5 space-y-3 flex-1 overflow-y-auto">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1">
                    Code Article (court)
                  </label>
                  <input
                    type="text"
                    value={editingProduct.code}
                    onChange={(e) => setEditingProduct({ ...editingProduct, code: e.target.value })}
                    className="w-full px-3 py-1.5 rounded-[10px] bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-xs font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1">
                    Quantité (Unité Pure sans chiffres)
                  </label>
                  <select
                    value={editingProduct.quantite || extractPureUnit(editingProduct.name)}
                    onChange={(e) =>
                      setEditingProduct({
                        ...editingProduct,
                        quantite: e.target.value as 'kg' | 'g' | 'pièce',
                      })
                    }
                    className="w-full px-3 py-1.5 rounded-[10px] bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-xs font-bold"
                  >
                    <option value="kg">kg (Kilogramme)</option>
                    <option value="g">g (Grammes)</option>
                    <option value="pièce">pièce</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1">
                  Nom du Produit
                </label>
                <input
                  type="text"
                  value={editingProduct.name}
                  onChange={(e) => setEditingProduct({ ...editingProduct, name: e.target.value })}
                  className="w-full px-3 py-1.5 rounded-[10px] bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-xs font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1">
                    Marjane (Code-barres Principal)
                  </label>
                  <input
                    type="text"
                    value={editingProduct.barcodeMarjane || ''}
                    onChange={(e) =>
                      setEditingProduct({ ...editingProduct, barcodeMarjane: e.target.value })
                    }
                    className="w-full px-3 py-1.5 rounded-[10px] bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1">
                    Marjane 2
                  </label>
                  <input
                    type="text"
                    value={editingProduct.barcodeP2 || ''}
                    onChange={(e) => setEditingProduct({ ...editingProduct, barcodeP2: e.target.value })}
                    className="w-full px-3 py-1.5 rounded-[10px] bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-xs font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1">
                    Marjane Interne
                  </label>
                  <input
                    type="text"
                    value={editingProduct.barcodeInterne || ''}
                    onChange={(e) =>
                      setEditingProduct({ ...editingProduct, barcodeInterne: e.target.value })
                    }
                    className="w-full px-3 py-1.5 rounded-[10px] bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1">
                    Marjane Mini
                  </label>
                  <input
                    type="text"
                    value={editingProduct.barcodeMiniSecours || ''}
                    onChange={(e) =>
                      setEditingProduct({ ...editingProduct, barcodeMiniSecours: e.target.value })
                    }
                    className="w-full px-3 py-1.5 rounded-[10px] bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-xs font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1">
                    Marjane Sec
                  </label>
                  <input
                    type="text"
                    value={editingProduct.barcodeSecours || ''}
                    onChange={(e) =>
                      setEditingProduct({ ...editingProduct, barcodeSecours: e.target.value })
                    }
                    className="w-full px-3 py-1.5 rounded-[10px] bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1">
                    Marjane Sec 2
                  </label>
                  <input
                    type="text"
                    value={editingProduct.barcodeP3 || ''}
                    onChange={(e) => setEditingProduct({ ...editingProduct, barcodeP3: e.target.value })}
                    className="w-full px-3 py-1.5 rounded-[10px] bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-xs font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1">
                  URL de l'image (image_html)
                </label>
                <input
                  type="text"
                  value={editingProduct.imageUrl || ''}
                  onChange={(e) => setEditingProduct({ ...editingProduct, imageUrl: e.target.value })}
                  className="w-full px-3 py-1.5 rounded-[10px] bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-xs font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1">
                    Département
                  </label>
                  <select
                    value={editingProduct.department}
                    onChange={(e) =>
                      setEditingProduct({ ...editingProduct, department: e.target.value as Department })
                    }
                    className="w-full px-3 py-1.5 rounded-[10px] bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-xs font-bold"
                  >
                    <option value="Fruits et légumes">Fruits et légumes</option>
                    <option value="Boucherie et volaille">Boucherie et volaille</option>
                    <option value="Fromage et charcuterie">Fromage et charcuterie</option>
                    <option value="Boulangerie et pâtisserie">Boulangerie et pâtisserie</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1">
                    Catégorie
                  </label>
                  <input
                    type="text"
                    value={editingProduct.category}
                    onChange={(e) => setEditingProduct({ ...editingProduct, category: e.target.value })}
                    className="w-full px-3 py-1.5 rounded-[10px] bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-xs font-bold"
                  />
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-gray-100 dark:border-slate-800 bg-gray-50/80 dark:bg-slate-800/60 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setEditingProduct(null)}
                className="px-4 py-1.5 rounded-[10px] bg-gray-200 dark:bg-slate-700 text-gray-800 dark:text-slate-200 text-xs font-bold cursor-pointer"
              >
                Annuler
              </button>

              <button
                type="button"
                onClick={async () => {
                  await updateProduct(editingProduct);
                  setEditingProduct(null);
                  showToast('✅ Produit mis à jour avec succès !');
                }}
                className="px-5 py-1.5 rounded-[10px] bg-[#0759A4] text-white text-xs font-black shadow-md cursor-pointer hover:bg-blue-700 transition"
              >
                Enregistrer les Modifications
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------- */}
      {/* MODALE AJOUT RAPIDE PRODUIT                                         */}
      {/* ------------------------------------------------------------------- */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-xl bg-white dark:bg-slate-900 rounded-[24px] shadow-2xl border border-gray-200 dark:border-slate-800 flex flex-col overflow-hidden text-gray-900 dark:text-slate-100">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100 dark:border-slate-800 bg-gray-50/80 shrink-0">
              <h3 className="text-sm sm:text-base font-black">Ajouter un Nouveau Produit</h3>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 rounded-full text-gray-400 hover:text-gray-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const form = e.currentTarget;
                const fd = new FormData(form);
                const name = fd.get('name') as string;
                if (!name) return;

                await addProduct({
                  code: (fd.get('code') as string) || '-',
                  name: name,
                  department: fd.get('department') as Department,
                  category: (fd.get('category') as string) || 'Général',
                  quantite: (fd.get('quantite') as 'kg' | 'g' | 'pièce') || extractPureUnit(name),
                  barcodeMarjane: (fd.get('barcodeMarjane') as string) || undefined,
                  imageUrl: (fd.get('imageUrl') as string) || undefined,
                  isEnabled: true,
                });

                setIsAddModalOpen(false);
                showToast(`✅ Produit "${name}" ajouté !`);
              }}
              className="p-4 sm:p-5 space-y-3"
            >
              <div>
                <label className="block text-xs font-bold mb-1">Nom du Produit *</label>
                <input
                  name="name"
                  required
                  placeholder="ex: Banane Cavendish 1kg"
                  className="w-full px-3 py-1.5 rounded-[10px] bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-xs font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold mb-1">Code Article</label>
                  <input
                    name="code"
                    placeholder="ex: 6037"
                    className="w-full px-3 py-1.5 rounded-[10px] bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold mb-1">Unité Pure</label>
                  <select
                    name="quantite"
                    defaultValue="kg"
                    className="w-full px-3 py-1.5 rounded-[10px] bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-xs font-bold"
                  >
                    <option value="kg">kg</option>
                    <option value="g">g</option>
                    <option value="pièce">pièce</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold mb-1">Code-barres Principal (EAN)</label>
                  <input
                    name="barcodeMarjane"
                    placeholder="ex: 2000000060378"
                    className="w-full px-3 py-1.5 rounded-[10px] bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold mb-1">Département</label>
                  <select
                    name="department"
                    defaultValue="Fruits et légumes"
                    className="w-full px-3 py-1.5 rounded-[10px] bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-xs font-bold"
                  >
                    <option value="Fruits et légumes">Fruits et légumes</option>
                    <option value="Boucherie et volaille">Boucherie et volaille</option>
                    <option value="Fromage et charcuterie">Fromage et charcuterie</option>
                    <option value="Boulangerie et pâtisserie">Boulangerie et pâtisserie</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold mb-1">URL de l'image</label>
                <input
                  name="imageUrl"
                  placeholder="https://..."
                  className="w-full px-3 py-1.5 rounded-[10px] bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-xs font-mono"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-1.5 rounded-[10px] bg-gray-200 dark:bg-slate-700 text-xs font-bold"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-1.5 rounded-[10px] bg-[#0759A4] text-white text-xs font-black shadow-md cursor-pointer"
                >
                  Créer le Produit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------- */}
      {/* MODALE SUPPRESSION                                                  */}
      {/* ------------------------------------------------------------------- */}
      {productToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-[20px] p-5 max-w-sm w-full space-y-3 text-center border border-gray-200 dark:border-slate-800 shadow-xl">
            <Trash2 className="w-10 h-10 text-rose-500 mx-auto" />
            <h4 className="text-base font-black">Confirmer la suppression</h4>
            <p className="text-xs text-gray-500">
              Voulez-vous vraiment supprimer "{productToDelete.name}" (#{productToDelete.id}) ?
            </p>
            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setProductToDelete(null)}
                className="px-4 py-2 rounded-[10px] bg-gray-200 dark:bg-slate-700 text-xs font-bold"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={async () => {
                  await deleteProduct(productToDelete.id);
                  setProductToDelete(null);
                  showToast('Produit supprimé.');
                }}
                className="px-4 py-2 rounded-[10px] bg-rose-600 text-white text-xs font-black"
              >
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------- */}
      {/* MODALE APERÇU IMAGE                                                 */}
      {/* ------------------------------------------------------------------- */}
      {previewImageUrl && (
        <div
          onClick={() => setPreviewImageUrl(null)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm cursor-pointer"
        >
          <div className="relative max-w-lg w-full bg-white dark:bg-slate-900 rounded-[24px] p-4 flex flex-col items-center">
            <button
              type="button"
              onClick={() => setPreviewImageUrl(null)}
              className="absolute right-3 top-3 p-1.5 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
            <img
              src={previewImageUrl}
              alt="Aperçu grand format"
              className="max-h-[70vh] w-auto object-contain rounded-[14px]"
            />
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------- */}
      {/* MODALE SUIVI DES TÉLÉPHONES & TEMPS D'UTILISATION                   */}
      {/* ------------------------------------------------------------------- */}
      <UserDevicesModal
        isOpen={isDevicesModalOpen}
        onClose={() => setIsDevicesModalOpen(false)}
      />

    </div>
  );
};

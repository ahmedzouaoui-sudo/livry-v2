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
  EyeOff,
  ArrowLeft,
  Trash2,
  Check,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Eye,
  Filter,
  Copy,
  Layers,
  Database,
  RefreshCw,
  Code2,
  CheckCircle2,
  AlertTriangle,
  Lightbulb,
  Globe,
  Terminal,
  Link,
  Zap,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Department, Product } from '../types';
import { DEPARTMENT_CONFIGS, getProductBarcodeVariants, getCleanProductCode } from '../utils/productUtils';
import {
  getSupabaseProjectId,
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  setCustomSupabaseCredentials,
  resetSupabaseCredentialsToDefault,
} from '../services/supabaseClient';
import { SUPABASE_SETUP_SQL } from '../services/supabaseService';
import { triggerHaptic } from '../utils/haptics';

export const AdminDashboard: React.FC = () => {
  const {
    role,
    products,
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
    syncProgress,
    lastSyncTimestamp,
    importProductsCsv,
    exportCatalogueCsv,
    setActiveTab,
    showToast,
    userIp,
  } = useApp();

  const [isSqlModalOpen, setIsSqlModalOpen] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);
  const [isApiGuideModalOpen, setIsApiGuideModalOpen] = useState(false);
  const [apiSnippetLang, setApiSnippetLang] = useState<'js' | 'react' | 'php' | 'python' | 'curl'>('js');
  const [apiTestStatus, setApiTestStatus] = useState<{ testing: boolean; result?: string; success?: boolean; latency?: number }>({ testing: false });
  const [copiedSnippet, setCopiedSnippet] = useState(false);
  const [copiedEndpoint, setCopiedEndpoint] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);
  const [copiedUrlVar, setCopiedUrlVar] = useState(false);
  const [copiedKeyVar, setCopiedKeyVar] = useState(false);

  // Supabase Custom Config Modal
  const [isCustomConfigModalOpen, setIsCustomConfigModalOpen] = useState(false);
  const [customUrlInput, setCustomUrlInput] = useState(SUPABASE_URL);
  const [customKeyInput, setCustomKeyInput] = useState(SUPABASE_ANON_KEY);

  // Safe In-App Confirmation Modals (Replacing window.confirm which is blocked in iframes)
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [isClearModalOpen, setIsClearModalOpen] = useState(false);
  const [isRestoreModalOpen, setIsRestoreModalOpen] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);

  const supabaseProjectId = getSupabaseProjectId();

  const testSiteConnection = async () => {
    setApiTestStatus({ testing: true });
    const start = performance.now();
    try {
      const res = await fetch(`https://${supabaseProjectId}.supabase.co/rest/v1/products?select=id,code,produit&limit=3`, {
        headers: {
          apikey: 'sb_publishable_Edhz1UUdYBSAmU65NCv08w_Z5u-D2mp',
          Authorization: 'Bearer sb_publishable_Edhz1UUdYBSAmU65NCv08w_Z5u-D2mp',
        },
      });
      const end = performance.now();
      const latency = Math.round(end - start);
      if (res.ok) {
        const data = await res.json();
        setApiTestStatus({
          testing: false,
          success: true,
          latency,
          result: `Connexion 100% réussie ! (HTTP 200 - ${data.length} articles tests reçus en ${latency}ms)`,
        });
        showToast(`✅ Test réussi (${latency}ms) ! Le site web peut se connecter sans restriction.`);
      } else {
        setApiTestStatus({
          testing: false,
          success: false,
          result: `Erreur HTTP ${res.status}: ${res.statusText}`,
        });
      }
    } catch (err: any) {
      setApiTestStatus({
        testing: false,
        success: false,
        result: `Erreur réseau: ${err.message}`,
      });
    }
  };

  useEffect(() => {
    if (role !== 'Admin') {
      setActiveTab('home');
    }
  }, [role, setActiveTab]);

  // Filters and search
  const [adminSearch, setAdminSearch] = useState('');
  const [filterDept, setFilterDept] = useState<Department | 'ALL'>('ALL');
  const [filterCategory, setFilterCategory] = useState<string>('ALL');
  const [filterSpecial, setFilterSpecial] = useState<'ALL' | 'NO_CODE' | 'XXXX' | 'NO_BARCODE' | 'NO_IMAGE'>('ALL');

  // Pagination
  const [pageSize, setPageSize] = useState<number>(50);
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Modals
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isCsvModalOpen, setIsCsvModalOpen] = useState(false);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const [csvRawText, setCsvRawText] = useState('');
  const [csvMode, setCsvMode] = useState<'merge' | 'replace'>('merge');

  // Quick inline edit state
  const [inlineEditingId, setInlineEditingId] = useState<number | null>(null);
  const [inlineCode, setInlineCode] = useState('');
  const [inlineName, setInlineName] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  // New product form state
  const initialNewProd: Omit<Product, 'id'> = {
    code: '',
    name: '',
    department: 'Boucherie et volaille',
    category: 'Viandes',
    barcodeMjValide: '',
    barcodeMarjane: '',
    barcodeSecours: '',
    barcodeMiniSecours: '',
    barcodeP2: '',
    barcodeP3: '',
    imageUrl: '',
    isEnabled: true,
  };
  const [newProd, setNewProd] = useState<Omit<Product, 'id'>>(initialNewProd);

  // Unique categories for the dropdown filter
  const availableCategories = useMemo(() => {
    const list = filterDept === 'ALL'
      ? products
      : products.filter((p) => p.department === filterDept);
    const set = new Set(list.map((p) => p.category).filter(Boolean));
    return Array.from(set).sort();
  }, [products, filterDept]);

  // KPI Calculations
  const totalProducts = products.length;
  const activeProducts = products.filter((p) => p.isEnabled).length;
  const withoutCode = products.filter((p) => !p.code || p.code === '-').length;
  const unavailableCodeXXXX = products.filter((p) => p.code?.toUpperCase() === 'XXXX').length;
  const withoutImage = products.filter((p) => !p.imageUrl).length;
  const withoutBarcodes = products.filter((p) => getProductBarcodeVariants(p).length === 0).length;

  // Filtered List
  const filteredList = useMemo(() => {
    return products.filter((p) => {
      // Special filter tabs
      if (filterSpecial === 'XXXX' && p.code?.toUpperCase() !== 'XXXX') return false;
      if (filterSpecial === 'NO_CODE' && (p.code && p.code !== '-')) return false;
      if (filterSpecial === 'NO_BARCODE' && getProductBarcodeVariants(p).length > 0) return false;
      if (filterSpecial === 'NO_IMAGE' && p.imageUrl) return false;

      // Department & Category filters
      if (filterDept !== 'ALL' && p.department !== filterDept) return false;
      if (filterCategory !== 'ALL' && p.category !== filterCategory) return false;

      // Text / Number Search
      if (!adminSearch.trim()) return true;
      const q = adminSearch.toLowerCase().trim();
      const codeMatch = p.code?.toLowerCase().includes(q);
      const nameMatch = p.name.toLowerCase().includes(q);
      const catMatch = p.category?.toLowerCase().includes(q);
      const barcodeMatch =
        (p.barcodeMarjane && p.barcodeMarjane.includes(q)) ||
        (p.barcodeP2 && p.barcodeP2.includes(q)) ||
        (p.barcodeInterne && p.barcodeInterne.includes(q)) ||
        (p.barcodeMjValide && p.barcodeMjValide.includes(q)) ||
        (p.barcodeMiniSecours && p.barcodeMiniSecours.includes(q)) ||
        (p.barcodeSecours && p.barcodeSecours.includes(q)) ||
        (p.barcodeP3 && p.barcodeP3.includes(q));

      return codeMatch || nameMatch || catMatch || barcodeMatch;
    });
  }, [products, filterDept, filterCategory, filterSpecial, adminSearch]);

  // Pagination calculation
  const totalPages = pageSize === 0 ? 1 : Math.ceil(filteredList.length / pageSize);
  const paginatedList = useMemo(() => {
    if (pageSize === 0) return filteredList;
    const start = (currentPage - 1) * pageSize;
    return filteredList.slice(start, start + pageSize);
  }, [filteredList, currentPage, pageSize]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [adminSearch, filterDept, filterCategory, filterSpecial, pageSize]);

  const handleExportCsv = () => {
    const csvContent = exportCatalogueCsv();
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', url);
    downloadAnchor.setAttribute(
      'download',
      `produits-livry_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    URL.revokeObjectURL(url);
    showToast('Fichier CSV exporté avec succès');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        if (text) {
          importProductsCsv(text, csvMode);
          if (fileInputRef.current) fileInputRef.current.value = '';
          setIsCsvModalOpen(false);
        }
      };
      reader.readAsText(file);
    }
  };

  const handleManualCsvImport = () => {
    if (csvRawText.trim()) {
      importProductsCsv(csvRawText, csvMode);
      setCsvRawText('');
      setIsCsvModalOpen(false);
    }
  };

  const handleStartInlineEdit = (p: Product) => {
    setInlineEditingId(p.id);
    setInlineCode(p.code || '');
    setInlineName(p.name || '');
  };

  const handleSaveInlineEdit = (p: Product) => {
    updateProduct({
      ...p,
      code: inlineCode.trim() || '-',
      name: inlineName.trim() || p.name,
    });
    setInlineEditingId(null);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingProduct) {
      updateProduct({
        ...editingProduct,
        code: editingProduct.code.trim() || '-',
        name: editingProduct.name.trim(),
      });
      setEditingProduct(null);
    }
  };

  const handleSaveAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (newProd.name.trim()) {
      addProduct({
        ...newProd,
        code: newProd.code.trim() || '-',
      });
      setIsAddModalOpen(false);
      setNewProd(initialNewProd);
    }
  };

  const handleDeleteProduct = (p: Product) => {
    setProductToDelete(p);
  };

  return (
    <div className="w-full max-w-[96%] mx-auto px-2 sm:px-4 py-4 pb-24 space-y-4">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gradient-to-r from-[#1E293B] via-[#0759A4] to-[#0A3D6B] p-4 sm:p-5 rounded-[20px] text-white shadow-md">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-[14px] bg-white/10 backdrop-blur-xs flex items-center justify-center border border-white/20 shrink-0">
            <FileSpreadsheet className="w-6 h-6 text-amber-300" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-xl font-black tracking-tight">Tableur Catalogue CSV & Données</h1>
              <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-[10px] font-bold px-2 py-0.5 rounded-full">
                {products.length} articles
              </span>
              {userIp && (
                <span className="bg-white/10 text-white/90 border border-white/20 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full">
                  IP: {userIp}
                </span>
              )}
            </div>
            <p className="text-xs text-white/80">Format tabulaire identique au CSV (11 colonnes) avec édition directe</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('home')}
            className="flex items-center gap-1.5 px-3 py-2 rounded-[12px] bg-white/15 hover:bg-white/25 text-white font-bold text-xs backdrop-blur-xs transition active:scale-95 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Écran Pickeur</span>
          </button>

          <button
            type="button"
            onClick={() => syncWithSupabase(true)}
            disabled={syncStatus === 'syncing'}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-[12px] bg-white text-[#0759A4] hover:bg-gray-100 font-bold text-xs shadow-md transition active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            <Cloud className={`w-3.5 h-3.5 text-emerald-600 ${syncStatus === 'syncing' ? 'animate-spin' : ''}`} />
            <span>{syncStatus === 'syncing' ? 'Sync...' : 'Sync Supabase'}</span>
          </button>
        </div>
      </div>

      {/* Supabase Connection & Live Status Panel */}
      <div className="bg-white border border-gray-200 rounded-[18px] p-3.5 sm:p-4 shadow-2xs space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-[12px] flex items-center justify-center shrink-0 ${
              supabaseHealth?.tableExists
                ? 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                : 'bg-amber-50 text-amber-600 border border-amber-200'
            }`}>
              <Database className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold text-[#171717]">Base Supabase :</span>
                <span className="font-mono text-xs px-2 py-0.5 bg-gray-100 text-gray-700 rounded-md border border-gray-200">
                  {supabaseProjectId}.supabase.co
                </span>
                {supabaseHealth?.tableExists ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    En ligne ({supabaseHealth.productCount} produits stockés)
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                    <AlertTriangle className="w-3 h-3 text-amber-600" />
                    Table "products" à initialiser
                  </span>
                )}
              </div>
              <p className="text-[11px] text-gray-500 mt-0.5">
                {lastSyncTimestamp || 'Synchronisation automatique bidirectionnelle active'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => checkSupabaseStatus()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-[10px] bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold transition active:scale-95 cursor-pointer"
              title="Tester la connexion Supabase"
            >
              <RefreshCw className="w-3.5 h-3.5 text-gray-600" />
              <span>Vérifier</span>
            </button>

            <button
              type="button"
              onClick={() => setIsSqlModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-[10px] bg-blue-50 hover:bg-blue-100 text-[#0759A4] border border-blue-200 text-xs font-bold transition active:scale-95 cursor-pointer"
            >
              <Code2 className="w-3.5 h-3.5" />
              <span>Script SQL Supabase</span>
            </button>

            <button
              type="button"
              onClick={() => setIsApiGuideModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-[10px] bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white text-xs font-black transition active:scale-95 shadow-xs cursor-pointer select-none"
              title="Paramètres, URL et codes prêts à l'emploi pour connecter votre site web à la base de données"
            >
              <Globe className="w-3.5 h-3.5 text-white" />
              <span>Connecter au Site Web (API)</span>
            </button>

            {products.length === 0 && (
              <button
                type="button"
                onClick={seedInitialCatalogueToSupabase}
                disabled={syncStatus === 'syncing'}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-[10px] bg-[#0759A4] hover:bg-[#064a88] text-white text-xs font-bold transition active:scale-95 shadow-xs disabled:opacity-50 cursor-pointer"
                title="Pousser les 543 articles de base vers Supabase"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Envoyer les 543 articles vers Supabase</span>
              </button>
            )}

            <button
              type="button"
              onClick={seedSupabase}
              disabled={syncStatus === 'syncing' || products.length === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-[10px] bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition active:scale-95 shadow-xs disabled:opacity-50 cursor-pointer"
              title="Uploader tous les produits locaux vers Supabase"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Pousser catalogue ({products.length})</span>
            </button>

            <button
              type="button"
              onClick={seedTips}
              disabled={syncStatus === 'syncing'}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-[10px] bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold transition active:scale-95 shadow-xs disabled:opacity-50 cursor-pointer"
              title="Envoyer tous les tutoriels & astuces vers Supabase"
            >
              <Lightbulb className="w-3.5 h-3.5" />
              <span>Envoyer Tips vers DB</span>
            </button>
          </div>
        </div>

        {/* Quick Env Vars Helper Box (Répond directement à : où trouver NEXT_PUBLIC_SUPABASE_URL et NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) */}
        <div className="bg-slate-50 border border-slate-200 rounded-[14px] p-3 text-xs">
          <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
            <span className="font-extrabold text-slate-800 flex items-center gap-1.5 text-[11px]">
              <Database className="w-3.5 h-3.5 text-[#0759A4]" />
              <span>Vos variables Supabase prêtes à copier (pour .env ou .env.local) :</span>
            </span>
            <span className="text-[10px] text-slate-500 font-medium">
              (Disponibles dans Supabase ⚙️ Project Settings → API Keys)
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 font-mono text-[11px]">
            <div className="bg-white p-2 rounded-[10px] border border-slate-200 flex items-center justify-between gap-2 shadow-2xs">
              <div className="truncate min-w-0">
                <span className="text-slate-400 font-bold block text-[9px] uppercase">NEXT_PUBLIC_SUPABASE_URL</span>
                <span className="text-slate-900 font-bold truncate block select-all">https://{supabaseProjectId}.supabase.co</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(`https://${supabaseProjectId}.supabase.co`);
                  setCopiedUrlVar(true);
                  showToast('NEXT_PUBLIC_SUPABASE_URL copié !');
                  setTimeout(() => setCopiedUrlVar(false), 2000);
                }}
                className="px-2.5 py-1 rounded-[6px] bg-slate-100 hover:bg-slate-200 text-slate-700 font-sans text-[10px] font-bold flex items-center gap-1 shrink-0 cursor-pointer transition active:scale-95"
              >
                {copiedUrlVar ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3 text-slate-600" />}
                <span>{copiedUrlVar ? 'Copié' : 'Copier'}</span>
              </button>
            </div>

            <div className="bg-white p-2 rounded-[10px] border border-slate-200 flex items-center justify-between gap-2 shadow-2xs">
              <div className="truncate min-w-0">
                <span className="text-slate-400 font-bold block text-[9px] uppercase">NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY</span>
                <span className="text-slate-900 font-bold truncate block select-all">sb_publishable_Edhz1UUdYBSAmU65NCv08w_Z5u-D2mp</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText('sb_publishable_Edhz1UUdYBSAmU65NCv08w_Z5u-D2mp');
                  setCopiedKeyVar(true);
                  showToast('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY copié !');
                  setTimeout(() => setCopiedKeyVar(false), 2000);
                }}
                className="px-2.5 py-1 rounded-[6px] bg-slate-100 hover:bg-slate-200 text-slate-700 font-sans text-[10px] font-bold flex items-center gap-1 shrink-0 cursor-pointer transition active:scale-95"
              >
                {copiedKeyVar ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3 text-slate-600" />}
                <span>{copiedKeyVar ? 'Copié' : 'Copier'}</span>
              </button>
            </div>
          </div>

          <div className="mt-2.5 pt-2 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2">
            <span className="text-[11px] text-slate-600">
              💡 Vous avez votre propre projet Supabase ou vous voulez changer de base ?
            </span>
            <button
              type="button"
              onClick={() => {
                setCustomUrlInput(SUPABASE_URL);
                setCustomKeyInput(SUPABASE_ANON_KEY);
                setIsCustomConfigModalOpen(true);
              }}
              className="px-3 py-1.5 rounded-[8px] bg-[#0759A4] hover:bg-[#064a88] text-white text-[11px] font-bold flex items-center gap-1.5 transition active:scale-95 cursor-pointer shadow-2xs"
            >
              <Zap className="w-3.5 h-3.5 text-amber-300" />
              <span>Changer de Projet / Entrer mes clés Supabase</span>
            </button>
          </div>
        </div>

        {/* Database setup notification banner */}
        {!supabaseHealth?.tableExists && (
          <div className="bg-amber-50 border border-amber-200 rounded-[14px] p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-amber-900 animate-in fade-in">
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-amber-900">
                  Base Supabase connectée ! Schéma exposé : <code className="bg-amber-100 px-1 py-0.5 rounded font-mono text-[10px]">api</code>
                </p>
                <p className="text-[11px] text-amber-700 mt-0.5">
                  Pour activer les tables et synchroniser les données, copiez le script SQL ci-dessous et collez-le dans votre <strong>Supabase SQL Editor</strong>.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsSqlModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-[10px] bg-[#0759A4] hover:bg-[#064a88] text-white text-xs font-bold transition active:scale-95 shrink-0 shadow-xs cursor-pointer"
            >
              <Code2 className="w-3.5 h-3.5" />
              <span>Voir le Script SQL (1 clic)</span>
            </button>
          </div>
        )}

        {/* Sync Progress Bar */}
        {syncProgress && (
          <div className="bg-blue-50 border border-blue-200 rounded-[12px] p-3 space-y-1.5">
            <div className="flex justify-between text-xs font-bold text-[#0759A4]">
              <span>Synchronisation Supabase en cours...</span>
              <span>{syncProgress.processed} / {syncProgress.total} produits</span>
            </div>
            <div className="w-full bg-blue-200 rounded-full h-2 overflow-hidden">
              <div
                className="bg-[#0759A4] h-2 transition-all duration-200"
                style={{ width: `${Math.round((syncProgress.processed / syncProgress.total) * 100)}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* KPI Metrics Grid with Quick Click Filters */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
        <div
          onClick={() => setFilterSpecial('ALL')}
          className={`p-3 rounded-[15px] border shadow-2xs cursor-pointer transition select-none ${
            filterSpecial === 'ALL'
              ? 'bg-blue-50/80 border-[#0759A4] ring-2 ring-[#0759A4]/20'
              : 'bg-white border-gray-200 hover:border-blue-300'
          }`}
        >
          <span className="text-[10px] font-bold text-gray-500 uppercase">Total Produits</span>
          <p className="text-lg font-black text-[#171717] mt-0.5">{totalProducts}</p>
          <span className="text-[10px] text-gray-400">Tous les articles</span>
        </div>

        <div
          onClick={() => setFilterSpecial('NO_CODE')}
          className={`p-3 rounded-[15px] border shadow-2xs cursor-pointer transition select-none ${
            filterSpecial === 'NO_CODE'
              ? 'bg-amber-50 border-amber-400 ring-2 ring-amber-400/20'
              : 'bg-white border-gray-200 hover:border-amber-300'
          }`}
        >
          <span className="text-[10px] font-bold text-amber-600 uppercase">Sans Code (-)</span>
          <p className="text-lg font-black text-amber-700 mt-0.5">{withoutCode}</p>
          <span className="text-[10px] text-amber-600 font-medium">À renseigner</span>
        </div>

        <div
          onClick={() => setFilterSpecial('XXXX')}
          className={`p-3 rounded-[15px] border shadow-2xs cursor-pointer transition select-none ${
            filterSpecial === 'XXXX'
              ? 'bg-rose-50 border-rose-400 ring-2 ring-rose-400/20'
              : 'bg-white border-gray-200 hover:border-rose-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-rose-600 uppercase">Code XXXX</span>
            <EyeOff className="w-3.5 h-3.5 text-rose-500" />
          </div>
          <p className="text-lg font-black text-rose-700 mt-0.5">{unavailableCodeXXXX}</p>
          <span className="text-[10px] text-rose-600 font-medium">Masqués côté client</span>
        </div>

        <div
          onClick={() => setFilterSpecial('NO_BARCODE')}
          className={`p-3 rounded-[15px] border shadow-2xs cursor-pointer transition select-none ${
            filterSpecial === 'NO_BARCODE'
              ? 'bg-purple-50 border-purple-400 ring-2 ring-purple-400/20'
              : 'bg-white border-gray-200 hover:border-purple-300'
          }`}
        >
          <span className="text-[10px] font-bold text-purple-600 uppercase">Sans Barcode</span>
          <p className="text-lg font-black text-purple-700 mt-0.5">{withoutBarcodes}</p>
          <span className="text-[10px] text-purple-600 font-medium">0 code-barres</span>
        </div>

        <div
          onClick={() => setFilterSpecial('NO_IMAGE')}
          className={`p-3 rounded-[15px] border shadow-2xs cursor-pointer transition select-none ${
            filterSpecial === 'NO_IMAGE'
              ? 'bg-orange-50 border-orange-400 ring-2 ring-orange-400/20'
              : 'bg-white border-gray-200 hover:border-orange-300'
          }`}
        >
          <span className="text-[10px] font-bold text-gray-500 uppercase">Sans Photo</span>
          <p className="text-lg font-black text-gray-700 mt-0.5">{withoutImage}</p>
          <span className="text-[10px] text-gray-400">Image manquante</span>
        </div>

        <div className="bg-white p-3 rounded-[15px] border border-gray-200 shadow-2xs">
          <span className="text-[10px] font-bold text-emerald-600 uppercase">Actifs</span>
          <p className="text-lg font-black text-emerald-700 mt-0.5">{activeProducts}</p>
          <span className="text-[10px] text-emerald-600 font-medium">Visible en rayon</span>
        </div>
      </div>

      {/* Action Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 bg-white p-3 rounded-[18px] border border-gray-200 shadow-2xs">
        <div className="flex flex-wrap items-center gap-2">
          {/* File input for CSV */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept=".csv,text/csv"
            className="hidden"
          />

          {/* New Product */}
          <button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-[12px] bg-[#0759A4] text-white text-xs font-bold shadow-xs hover:bg-blue-800 transition active:scale-95 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Nouveau Produit</span>
          </button>

          {/* Import CSV Button */}
          <button
            type="button"
            onClick={() => setIsCsvModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-[12px] border border-[#0759A4]/30 bg-blue-50/50 hover:bg-blue-50 text-[#0759A4] text-xs font-bold transition active:scale-95 cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Importer CSV</span>
          </button>

          {/* Export CSV Button */}
          <button
            type="button"
            onClick={handleExportCsv}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-[12px] border border-emerald-300 bg-emerald-50/50 hover:bg-emerald-50 text-emerald-800 text-xs font-bold transition cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-emerald-600" />
            <span>Exporter CSV (11 colonnes)</span>
          </button>

          {/* Vider catalogue (0 produits pour test) */}
          <button
            type="button"
            onClick={() => setIsClearModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-[12px] border border-rose-300 bg-rose-50/80 text-rose-700 hover:bg-rose-100 text-xs font-bold transition active:scale-95 cursor-pointer shadow-2xs"
            title="Vider tous les produits (0 articles dans l'app et sur Supabase)"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Vider tout (0 produit)</span>
          </button>

          {/* Restaurer 543 articles originaux */}
          <button
            type="button"
            onClick={() => setIsRestoreModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-[12px] border border-blue-300 bg-blue-50/80 text-[#0759A4] hover:bg-blue-100 text-xs font-bold transition active:scale-95 cursor-pointer shadow-2xs"
            title="Restaurer le catalogue par défaut (543 articles) et synchroniser avec Supabase"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Restaurer CSV (543)</span>
          </button>
        </div>

        {/* Rows per page */}
        <div className="flex items-center gap-2 text-xs font-bold text-gray-600">
          <span>Lignes / page :</span>
          <select
            value={pageSize}
            onChange={(e) => setPageSize(Number(e.target.value))}
            className="px-2 py-1 rounded-[10px] border border-gray-200 bg-white text-xs font-bold outline-none focus:border-[#0759A4]"
          >
            <option value={20}>20</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
            <option value={0}>Tous ({filteredList.length})</option>
          </select>
        </div>
      </div>

      {/* Filtering & Search Bar */}
      <div className="flex flex-col sm:flex-row gap-2 bg-white p-3 rounded-[16px] border border-gray-200 shadow-2xs">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={adminSearch}
            onChange={(e) => setAdminSearch(e.target.value)}
            placeholder="Rechercher par code (ex: 6037), produit, code-barres ou catégorie..."
            className="w-full pl-9 pr-3 py-1.5 text-xs font-semibold border border-gray-200 rounded-[12px] outline-none focus:border-[#0759A4] bg-gray-50/50"
          />
          {adminSearch && (
            <button
              type="button"
              onClick={() => setAdminSearch('')}
              className="absolute right-2.5 top-2 text-gray-400 hover:text-gray-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Department Filter */}
        <select
          value={filterDept}
          onChange={(e) => {
            setFilterDept(e.target.value as Department | 'ALL');
            setFilterCategory('ALL');
          }}
          className="px-2.5 py-1.5 text-xs font-bold border border-gray-200 rounded-[12px] outline-none focus:border-[#0759A4] bg-white text-gray-800"
        >
          <option value="ALL">Tous les Rayons ({products.length})</option>
          <option value="Boucherie et volaille">Boucherie et volaille ({products.filter((p) => p.department === 'Boucherie et volaille').length})</option>
          <option value="Fromage et charcuterie">Fromage et charcuterie ({products.filter((p) => p.department === 'Fromage et charcuterie').length})</option>
          <option value="Fruits et légumes">Fruits et légumes ({products.filter((p) => p.department === 'Fruits et légumes').length})</option>
          <option value="Boulangerie et pâtisserie">Boulangerie et pâtisserie ({products.filter((p) => p.department === 'Boulangerie et pâtisserie').length})</option>
        </select>

        {/* Category Filter */}
        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className="px-2.5 py-1.5 text-xs font-bold border border-gray-200 rounded-[12px] outline-none focus:border-[#0759A4] bg-white text-gray-800"
        >
          <option value="ALL">Toutes Catégories</option>
          {availableCategories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>

        {filterSpecial !== 'ALL' && (
          <button
            type="button"
            onClick={() => setFilterSpecial('ALL')}
            className="px-2.5 py-1.5 text-xs font-bold bg-amber-50 text-amber-800 rounded-[12px] border border-amber-300 hover:bg-amber-100 flex items-center gap-1 cursor-pointer shrink-0"
          >
            <X className="w-3.5 h-3.5" />
            <span>Effacer filtre {filterSpecial}</span>
          </button>
        )}
      </div>

      {/* CSV Spreadsheet Table Grid */}
      <div className="bg-white rounded-[18px] border border-gray-200 overflow-hidden shadow-2xs">
        <div className="p-3 border-b border-gray-100 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-gray-900">
              {filteredList.length} produit{filteredList.length > 1 ? 's' : ''} trouvé{filteredList.length > 1 ? 's' : ''}
            </span>
            {pageSize > 0 && totalPages > 1 && (
              <span className="text-gray-400 text-[11px]">
                (Page {currentPage} sur {totalPages})
              </span>
            )}
          </div>

          {/* Quick Pagination in header */}
          {pageSize > 0 && totalPages > 1 && (
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-1 rounded-[8px] border border-gray-200 hover:bg-gray-50 disabled:opacity-30 cursor-pointer"
                aria-label="Page précédente"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <span className="px-2 font-bold text-gray-700 text-xs">
                {currentPage} / {totalPages}
              </span>
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-1 rounded-[8px] border border-gray-200 hover:bg-gray-50 disabled:opacity-30 cursor-pointer"
                aria-label="Page suivante"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* Mobile Horizontal Scroll Hint */}
        <div className="md:hidden px-3 py-1.5 bg-amber-50/80 border-b border-amber-200/80 text-[10px] font-bold text-amber-900 flex items-center justify-between">
          <span>👉 Glissez horizontalement pour voir les 11 colonnes CSV</span>
          <span className="bg-amber-100 px-1.5 py-0.5 rounded text-[9px]">13 colonnes</span>
        </div>

        {/* Scrollable table container */}
        <div className="overflow-x-auto max-h-[620px] relative overscroll-x-contain">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="sticky top-0 bg-[#F1F5F9] text-gray-700 uppercase tracking-wider font-extrabold border-b-2 border-gray-200 z-10 select-none text-[11px]">
              <tr>
                <th className="px-3 py-2.5 border-r border-gray-200 bg-[#F1F5F9] sticky left-0 z-20 w-[95px]">
                  code
                </th>
                <th className="px-3 py-2.5 border-r border-gray-200 min-w-[240px]">produit</th>
                <th className="px-2 py-2.5 border-r border-gray-200 text-blue-800 min-w-[130px]">
                  marjane
                </th>
                <th className="px-2 py-2.5 border-r border-gray-200 text-purple-800 min-w-[120px]">
                  marjane 2
                </th>
                <th className="px-2 py-2.5 border-r border-gray-200 text-emerald-800 min-w-[130px]">
                  marjane Interne
                </th>
                <th className="px-2 py-2.5 border-r border-gray-200 text-teal-800 min-w-[105px]">
                  marjane mini
                </th>
                <th className="px-2 py-2.5 border-r border-gray-200 text-amber-800 min-w-[125px]">
                  marjane sec
                </th>
                <th className="px-2 py-2.5 border-r border-gray-200 text-fuchsia-800 min-w-[125px]">
                  marjane sec 2
                </th>
                <th className="px-2 py-2.5 border-r border-gray-200 text-center min-w-[85px]">image_html</th>
                <th className="px-2.5 py-2.5 border-r border-gray-200 min-w-[130px]">département</th>
                <th className="px-2.5 py-2.5 border-r border-gray-200 min-w-[110px]">catégorie</th>
                <th className="px-2 py-2.5 border-r border-gray-200 text-center w-[60px]">Actif</th>
                <th className="px-2 py-2.5 text-center w-[80px]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 font-medium">
              {paginatedList.length > 0 ? (
                paginatedList.map((p) => {
                  const isXXXX = p.code?.toUpperCase() === 'XXXX';
                  const isNoCode = !p.code || p.code === '-';
                  const isInline = inlineEditingId === p.id;
                  const deptConfig = DEPARTMENT_CONFIGS[p.department];

                  return (
                    <tr
                      key={p.id}
                      className={`hover:bg-blue-50/40 transition-colors ${
                        !p.isEnabled ? 'bg-gray-50/80 opacity-60' : ''
                      }`}
                    >
                      {/* 1. CODE (Sticky Left Column) */}
                      <td className="px-3 py-2 border-r border-gray-100 bg-white sticky left-0 z-1 font-mono font-black text-gray-900">
                        {isInline ? (
                          <div className="flex items-center gap-1">
                            <input
                              type="text"
                              value={inlineCode}
                              onChange={(e) => setInlineCode(e.target.value)}
                              className="w-16 px-1.5 py-0.5 border border-[#0759A4] rounded text-xs font-mono font-bold"
                              autoFocus
                            />
                            <button
                              type="button"
                              onClick={() => handleSaveInlineEdit(p)}
                              className="text-emerald-600 hover:text-emerald-800"
                              title="Enregistrer"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : isXXXX ? (
                          <span
                            onClick={() => handleStartInlineEdit(p)}
                            className="text-rose-700 bg-rose-50 border border-rose-200 px-1.5 py-0.5 rounded text-[10px] font-bold inline-flex items-center gap-0.5 cursor-pointer hover:bg-rose-100"
                            title="Code XXXX masqué. Cliquez pour éditer"
                          >
                            <EyeOff className="w-2.5 h-2.5 shrink-0" />
                            XXXX
                          </span>
                        ) : isNoCode ? (
                          <span
                            onClick={() => handleStartInlineEdit(p)}
                            className="text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded text-[11px] font-bold cursor-pointer hover:bg-amber-100"
                            title="Sans code. Cliquez pour renseigner"
                          >
                            -
                          </span>
                        ) : p.code && p.code.trim().replace(/^#\s*/, '') === '0000' ? (
                          <span
                            onClick={() => handleStartInlineEdit(p)}
                            className="text-amber-900 bg-amber-100 border border-amber-300 px-2 py-0.5 rounded text-[11px] font-black cursor-pointer hover:bg-amber-200"
                            title="Code 0000 (Non adressé). Cliquez pour éditer"
                          >
                            Non adressé
                          </span>
                        ) : (
                          <span
                            onClick={() => handleStartInlineEdit(p)}
                            className="text-[#171717] bg-gray-100/90 border border-gray-200 px-2 py-0.5 rounded text-xs font-black tracking-wider cursor-pointer hover:bg-gray-200"
                            title="Cliquez pour modifier directement le code"
                          >
                            {getCleanProductCode(p.code)}
                          </span>
                        )}
                      </td>

                      {/* 2. PRODUIT (NAME + THUMBNAIL) */}
                      <td className="px-3 py-2 border-r border-gray-100">
                        {isInline ? (
                          <div className="flex items-center gap-1">
                            <input
                              type="text"
                              value={inlineName}
                              onChange={(e) => setInlineName(e.target.value)}
                              className="w-full px-2 py-0.5 border border-[#0759A4] rounded text-xs font-semibold"
                            />
                            <button
                              type="button"
                              onClick={() => handleSaveInlineEdit(p)}
                              className="text-emerald-600 hover:text-emerald-800 shrink-0"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setInlineEditingId(null)}
                              className="text-gray-400 hover:text-gray-600 shrink-0"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            {p.imageUrl ? (
                              <img
                                src={p.imageUrl}
                                alt=""
                                referrerPolicy="no-referrer"
                                onClick={() => setPreviewImageUrl(p.imageUrl || null)}
                                className="w-7 h-7 object-contain rounded border border-gray-200 bg-white shrink-0 cursor-zoom-in"
                                loading="lazy"
                              />
                            ) : (
                              <div className="w-7 h-7 rounded border border-gray-200 bg-gray-100 flex items-center justify-center text-gray-400 text-[10px] shrink-0 font-bold">
                                ∅
                              </div>
                            )}
                            <span
                              className="font-bold text-gray-900 line-clamp-1 hover:text-[#0759A4] cursor-pointer"
                              onClick={() => setEditingProduct(p)}
                              title={`${p.name} (Cliquez pour modifier)`}
                            >
                              {p.name}
                            </span>
                          </div>
                        )}
                      </td>

                      {/* 3. MARJANE */}
                      <td className="px-2 py-2 border-r border-gray-100 font-mono text-[11px]">
                        {p.barcodeMarjane ? (
                          <span className="text-blue-800 bg-blue-50 border border-blue-200/90 px-1.5 py-0.5 rounded font-bold">
                            {p.barcodeMarjane}
                          </span>
                        ) : (
                          <span className="text-gray-300">0</span>
                        )}
                      </td>

                      {/* 4. MARJANE 2 */}
                      <td className="px-2 py-2 border-r border-gray-100 font-mono text-[11px]">
                        {p.barcodeP2 ? (
                          <span className="text-purple-800 bg-purple-50 border border-purple-200/90 px-1.5 py-0.5 rounded font-bold">
                            {p.barcodeP2}
                          </span>
                        ) : (
                          <span className="text-gray-300">0</span>
                        )}
                      </td>

                      {/* 5. MARJANE INTERNE */}
                      <td className="px-2 py-2 border-r border-gray-100 font-mono text-[11px]">
                        {p.barcodeInterne || p.barcodeMjValide ? (
                          <span className="text-emerald-800 bg-emerald-50 border border-emerald-200/90 px-1.5 py-0.5 rounded font-bold">
                            {p.barcodeInterne || p.barcodeMjValide}
                          </span>
                        ) : (
                          <span className="text-gray-300">0</span>
                        )}
                      </td>

                      {/* 6. MARJANE MINI */}
                      <td className="px-2 py-2 border-r border-gray-100 font-mono text-[11px]">
                        {p.barcodeMiniSecours ? (
                          <span className="text-teal-800 bg-teal-50 border border-teal-200/90 px-1.5 py-0.5 rounded font-bold">
                            {p.barcodeMiniSecours}
                          </span>
                        ) : (
                          <span className="text-gray-300">0</span>
                        )}
                      </td>

                      {/* 7. MARJANE SEC */}
                      <td className="px-2 py-2 border-r border-gray-100 font-mono text-[11px]">
                        {p.barcodeSecours ? (
                          <span className="text-amber-800 bg-amber-50 border border-amber-200/90 px-1.5 py-0.5 rounded font-bold">
                            {p.barcodeSecours}
                          </span>
                        ) : (
                          <span className="text-gray-300">0</span>
                        )}
                      </td>

                      {/* 8. MARJANE SEC 2 */}
                      <td className="px-2 py-2 border-r border-gray-100 font-mono text-[11px]">
                        {p.barcodeP3 ? (
                          <span className="text-fuchsia-800 bg-fuchsia-50 border border-fuchsia-200/90 px-1.5 py-0.5 rounded font-bold">
                            {p.barcodeP3}
                          </span>
                        ) : (
                          <span className="text-gray-300">0</span>
                        )}
                      </td>

                      {/* 9. IMAGE_HTML */}
                      <td className="px-2 py-2 border-r border-gray-100 text-center">
                        {p.imageUrl ? (
                          <a
                            href={p.imageUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] text-blue-600 hover:text-blue-800 font-mono p-0.5"
                            title="Ouvrir l'image"
                          >
                            <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                            <span className="truncate max-w-[60px]">Lien</span>
                          </a>
                        ) : (
                          <span className="text-[10px] text-gray-300">sans</span>
                        )}
                      </td>

                      {/* 10. DÉPARTEMENT */}
                      <td className="px-2.5 py-2 border-r border-gray-100">
                        <span
                          className="inline-block text-[10px] font-bold px-2 py-0.5 rounded-[6px] border truncate max-w-[125px]"
                          style={{
                            backgroundColor: deptConfig?.tagBg || '#F1F5F9',
                            color: deptConfig?.tagText || '#334155',
                            borderColor: `${deptConfig?.accentColor || '#64748B'}30`,
                          }}
                        >
                          {deptConfig?.shortName || p.department}
                        </span>
                      </td>

                      {/* 11. CATÉGORIE */}
                      <td className="px-2.5 py-2 border-r border-gray-100 text-gray-700 font-semibold text-[11px] truncate max-w-[110px]">
                        {p.category || 'Général'}
                      </td>

                      {/* 12. ACTIF TOGGLE */}
                      <td className="px-2 py-2 border-r border-gray-100 text-center">
                        <button
                          type="button"
                          onClick={() => toggleProductStatus(p.id)}
                          className="transition cursor-pointer"
                          title={p.isEnabled ? 'Désactiver le produit' : 'Activer le produit'}
                        >
                          {p.isEnabled ? (
                            <ToggleRight className="w-5 h-5 text-emerald-600 inline" />
                          ) : (
                            <ToggleLeft className="w-5 h-5 text-gray-300 inline" />
                          )}
                        </button>
                      </td>

                      {/* 13. ACTIONS */}
                      <td className="px-2 py-2 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => setEditingProduct(p)}
                            className="p-1 text-[#0759A4] hover:bg-blue-50 rounded-[6px] transition cursor-pointer"
                            title="Modifier tous les champs CSV"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteProduct(p)}
                            className="p-1 text-rose-500 hover:bg-rose-50 rounded-[6px] transition cursor-pointer"
                            title="Supprimer le produit"
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
                  <td colSpan={13} className="p-10 text-center bg-gray-50/60 text-gray-500">
                    {products.length === 0 ? (
                      <div className="max-w-md mx-auto space-y-2">
                        <div className="w-12 h-12 mx-auto rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center">
                          <CheckCircle2 className="w-6 h-6" />
                        </div>
                        <p className="font-black text-[#171717] text-sm">
                          Catalogue entièrement vide (0 produit)
                        </p>
                        <p className="text-xs text-gray-500 leading-relaxed">
                          Tous les produits ont été retirés. La base de données Supabase est connectée et prête pour vos tests !
                        </p>
                        <div className="pt-2 flex items-center justify-center gap-2">
                          <button
                            type="button"
                            onClick={() => setIsAddModalOpen(true)}
                            className="px-3.5 py-1.5 rounded-[10px] bg-[#0759A4] text-white text-xs font-bold hover:bg-blue-800 transition active:scale-95 cursor-pointer shadow-xs"
                          >
                            + Ajouter un produit test
                          </button>
                          <button
                            type="button"
                            onClick={() => syncWithSupabase(true)}
                            className="px-3 py-1.5 rounded-[10px] bg-white border border-gray-300 text-gray-700 text-xs font-bold hover:bg-gray-50 transition active:scale-95 cursor-pointer"
                          >
                            Rafraîchir depuis Supabase
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <p className="font-bold text-[#171717]">Aucun produit ne correspond aux filtres.</p>
                        <p className="text-xs mt-1 text-gray-500">Modifiez vos filtres ou la recherche.</p>
                      </div>
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Footer Pagination */}
        {pageSize > 0 && totalPages > 1 && (
          <div className="p-3 border-t border-gray-100 bg-gray-50 flex items-center justify-between text-xs">
            <span className="text-gray-500">
              Affichage de {(currentPage - 1) * pageSize + 1} à{' '}
              {Math.min(currentPage * pageSize, filteredList.length)} sur {filteredList.length} articles
            </span>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
                className="px-2 py-1 rounded-[8px] border border-gray-200 bg-white font-bold disabled:opacity-30 cursor-pointer"
              >
                Début
              </button>
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-2.5 py-1 rounded-[8px] border border-gray-200 bg-white font-bold disabled:opacity-30 cursor-pointer"
              >
                Précédent
              </button>
              <span className="px-2 font-black text-gray-800">
                {currentPage} / {totalPages}
              </span>
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-2.5 py-1 rounded-[8px] border border-gray-200 bg-white font-bold disabled:opacity-30 cursor-pointer"
              >
                Suivant
              </button>
              <button
                type="button"
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages}
                className="px-2 py-1 rounded-[8px] border border-gray-200 bg-white font-bold disabled:opacity-30 cursor-pointer"
              >
                Fin
              </button>
            </div>
          </div>
        )}
      </div>

      {/* CSV Import Modal */}
      {isCsvModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-white rounded-[20px] p-5 shadow-2xl border border-gray-200">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 mb-3">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-[#0759A4]" />
                <h3 className="text-sm font-black text-[#171717]">Importer un fichier CSV</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsCsvModalOpen(false)}
                className="p-1 text-gray-400 hover:text-gray-600 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              <p className="text-gray-600">
                Téléversez un fichier CSV ou collez les données au format standard :
                <br />
                <code className="text-[10px] bg-gray-100 p-1 rounded font-mono block mt-1">
                  code,produit,code-barres Mj valide,code-barres Marjane possible,code-barres mj secoure...
                </code>
              </p>

              {/* Import Mode Radio */}
              <div className="flex items-center gap-4 bg-gray-50 p-2.5 rounded-[12px] border border-gray-200">
                <label className="flex items-center gap-2 cursor-pointer font-bold text-[#171717]">
                  <input
                    type="radio"
                    name="csvMode"
                    value="merge"
                    checked={csvMode === 'merge'}
                    onChange={() => setCsvMode('merge')}
                  />
                  <span>Fusionner & Mettre à jour</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer font-bold text-rose-700">
                  <input
                    type="radio"
                    name="csvMode"
                    value="replace"
                    checked={csvMode === 'replace'}
                    onChange={() => setCsvMode('replace')}
                  />
                  <span>Remplacer tout le catalogue</span>
                </label>
              </div>

              {/* Upload file trigger */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-[#0759A4]/40 hover:border-[#0759A4] p-5 rounded-[14px] text-center bg-[#EBF4FC]/40 cursor-pointer transition select-none"
              >
                <Upload className="w-6 h-6 text-[#0759A4] mx-auto mb-1.5" />
                <span className="block font-bold text-[#0759A4]">Cliquer pour choisir le fichier CSV</span>
                <span className="block text-[10px] text-gray-500 mt-0.5">Compatible format Marjane/Livry</span>
              </div>

              {/* Or paste CSV content */}
              <div>
                <label className="block text-[11px] font-bold text-gray-700 mb-1">
                  Ou coller le contenu CSV :
                </label>
                <textarea
                  value={csvRawText}
                  onChange={(e) => setCsvRawText(e.target.value)}
                  placeholder="code,produit,code-barres Mj valide,code-barres Marjane possible..."
                  rows={4}
                  className="w-full p-2 border border-gray-200 rounded-[12px] font-mono text-[11px] outline-none focus:border-[#0759A4]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsCsvModalOpen(false)}
                  className="px-3.5 py-1.5 rounded-[10px] border border-gray-200 text-gray-600 hover:bg-gray-50 font-bold"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={handleManualCsvImport}
                  disabled={!csvRawText.trim()}
                  className="px-4 py-1.5 rounded-[10px] bg-[#0759A4] text-white font-bold hover:bg-blue-800 disabled:opacity-40 transition cursor-pointer"
                >
                  Importer le texte
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Product Modal (All 11 CSV fields) */}
      {editingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-xl bg-white rounded-[22px] p-5 shadow-2xl border border-gray-200 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 mb-3">
              <div>
                <h3 className="text-sm sm:text-base font-black text-[#171717]">Modifier l'article</h3>
                <p className="text-[11px] text-gray-500">Mise à jour directe des 11 colonnes CSV</p>
              </div>
              <button
                type="button"
                onClick={() => setEditingProduct(null)}
                className="p-1 text-gray-400 hover:text-gray-600 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-3.5 text-xs">
              {/* Row 1: Code & Departement & Categorie */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div>
                  <label className="block text-[11px] font-bold text-gray-700 mb-1">
                    Code court (2, 3, 4 chiffres)
                  </label>
                  <input
                    type="text"
                    value={editingProduct.code}
                    onChange={(e) => setEditingProduct({ ...editingProduct, code: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded-[10px] font-mono font-bold text-sm"
                    placeholder="ex: 6037, -, XXXX"
                  />
                  <div className="flex gap-1 mt-1">
                    <button
                      type="button"
                      onClick={() => setEditingProduct({ ...editingProduct, code: '-' })}
                      className="text-[10px] bg-gray-100 hover:bg-gray-200 px-1.5 py-0.5 rounded font-bold"
                    >
                      Mettre &ldquo;-&rdquo;
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingProduct({ ...editingProduct, code: 'XXXX' })}
                      className="text-[10px] bg-rose-50 text-rose-700 hover:bg-rose-100 px-1.5 py-0.5 rounded font-bold"
                    >
                      Mettre &ldquo;XXXX&rdquo;
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-gray-700 mb-1">Département (Rayon)</label>
                  <select
                    value={editingProduct.department}
                    onChange={(e) =>
                      setEditingProduct({ ...editingProduct, department: e.target.value as Department })
                    }
                    className="w-full p-2 border border-gray-300 rounded-[10px] font-bold bg-white"
                  >
                    <option value="Boucherie et volaille">Boucherie et volaille</option>
                    <option value="Fromage et charcuterie">Fromage et charcuterie</option>
                    <option value="Fruits et légumes">Fruits et légumes</option>
                    <option value="Boulangerie et pâtisserie">Boulangerie et pâtisserie</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-gray-700 mb-1">Catégorie</label>
                  <input
                    type="text"
                    value={editingProduct.category}
                    onChange={(e) => setEditingProduct({ ...editingProduct, category: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded-[10px] font-semibold"
                    placeholder="Viandes, Fruits, etc."
                    required
                  />
                </div>
              </div>

              {/* Row 2: Nom du produit */}
              <div>
                <label className="block text-[11px] font-bold text-gray-700 mb-1">Nom du produit</label>
                <input
                  type="text"
                  value={editingProduct.name}
                  onChange={(e) => setEditingProduct({ ...editingProduct, name: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded-[10px] font-bold text-sm"
                  required
                />
              </div>

              {/* Row 3: Codes-Barres Grid matching CSV columns */}
              <div className="p-3 bg-gray-50 rounded-[16px] border border-gray-200 space-y-2.5">
                <span className="block text-[11px] font-black uppercase tracking-wider text-gray-700">
                  Codes-Barres GS1 (Colonnes CSV) :
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[10px] font-bold text-blue-800 mb-0.5">
                      1. marjane (Statut: Valide, EAN-13)
                    </label>
                    <input
                      type="text"
                      value={editingProduct.barcodeMarjane || ''}
                      onChange={(e) => setEditingProduct({ ...editingProduct, barcodeMarjane: e.target.value })}
                      className="w-full p-1.5 border border-gray-300 rounded-[8px] font-mono text-xs"
                      placeholder="13 chiffres"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-purple-800 mb-0.5">
                      2. marjane 2 (Statut: Possible, EAN-13)
                    </label>
                    <input
                      type="text"
                      value={editingProduct.barcodeP2 || ''}
                      onChange={(e) => setEditingProduct({ ...editingProduct, barcodeP2: e.target.value })}
                      className="w-full p-1.5 border border-gray-300 rounded-[8px] font-mono text-xs"
                      placeholder="13 chiffres"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-emerald-800 mb-0.5">
                      3. marjane Interne (Statut: Possible, Interne)
                    </label>
                    <input
                      type="text"
                      value={editingProduct.barcodeInterne || editingProduct.barcodeMjValide || ''}
                      onChange={(e) => setEditingProduct({
                        ...editingProduct,
                        barcodeInterne: e.target.value,
                        barcodeMjValide: e.target.value,
                      })}
                      className="w-full p-1.5 border border-gray-300 rounded-[8px] font-mono text-xs"
                      placeholder="13 chiffres"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-teal-800 mb-0.5">
                      4. marjane mini (Statut: Possible, EAN-8)
                    </label>
                    <input
                      type="text"
                      value={editingProduct.barcodeMiniSecours || ''}
                      onChange={(e) => setEditingProduct({ ...editingProduct, barcodeMiniSecours: e.target.value })}
                      className="w-full p-1.5 border border-gray-300 rounded-[8px] font-mono text-xs"
                      placeholder="8 chiffres"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-amber-800 mb-0.5">
                      5. marjane sec (Statut: Possible, Secours)
                    </label>
                    <input
                      type="text"
                      value={editingProduct.barcodeSecours || ''}
                      onChange={(e) => setEditingProduct({ ...editingProduct, barcodeSecours: e.target.value })}
                      className="w-full p-1.5 border border-gray-300 rounded-[8px] font-mono text-xs"
                      placeholder="13 chiffres"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-fuchsia-800 mb-0.5">
                      6. marjane sec 2 (Statut: Possible, Secours 2)
                    </label>
                    <input
                      type="text"
                      value={editingProduct.barcodeP3 || ''}
                      onChange={(e) => setEditingProduct({ ...editingProduct, barcodeP3: e.target.value })}
                      className="w-full p-1.5 border border-gray-300 rounded-[8px] font-mono text-xs"
                      placeholder="13 chiffres"
                    />
                  </div>
                </div>
              </div>

              {/* Row 4: Image URL with preview */}
              <div>
                <label className="block text-[11px] font-bold text-gray-700 mb-1">
                  URL de l'image (image_html)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="url"
                    value={editingProduct.imageUrl || ''}
                    onChange={(e) => setEditingProduct({ ...editingProduct, imageUrl: e.target.value })}
                    className="flex-1 p-2 border border-gray-300 rounded-[10px] text-xs font-mono"
                    placeholder="https://res.cloudinary.com/..."
                  />
                  {editingProduct.imageUrl && (
                    <img
                      src={editingProduct.imageUrl}
                      alt="Aperçu"
                      className="w-9 h-9 object-contain rounded border border-gray-200 bg-white shrink-0"
                    />
                  )}
                </div>
              </div>

              {/* Row 5: Actif Toggle */}
              <div className="flex items-center gap-3 pt-1">
                <label className="flex items-center gap-2 cursor-pointer font-bold text-gray-800">
                  <input
                    type="checkbox"
                    checked={editingProduct.isEnabled}
                    onChange={(e) => setEditingProduct({ ...editingProduct, isEnabled: e.target.checked })}
                    className="w-4 h-4 accent-[#0759A4]"
                  />
                  <span>Produit Actif (visible dans la recherche et le rayon)</span>
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setEditingProduct(null)}
                  className="px-4 py-2 rounded-[10px] border border-gray-200 font-bold text-gray-600 hover:bg-gray-50"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-[10px] bg-[#0759A4] text-white font-bold hover:bg-blue-800 shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Enregistrer les modifications</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Product Modal (All 11 CSV fields) */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-xl bg-white rounded-[22px] p-5 shadow-2xl border border-gray-200 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 mb-3">
              <div>
                <h3 className="text-sm sm:text-base font-black text-[#171717]">Ajouter un nouveau produit</h3>
                <p className="text-[11px] text-gray-500">Ajoute une nouvelle ligne au catalogue CSV</p>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 text-gray-400 hover:text-gray-600 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveAdd} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div>
                  <label className="block text-[11px] font-bold text-gray-700 mb-1">
                    Code court (2, 3, 4 chiffres)
                  </label>
                  <input
                    type="text"
                    value={newProd.code}
                    onChange={(e) => setNewProd({ ...newProd, code: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded-[10px] font-mono font-bold text-sm"
                    placeholder="ex: 6037, -"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-gray-700 mb-1">Département (Rayon)</label>
                  <select
                    value={newProd.department}
                    onChange={(e) =>
                      setNewProd({ ...newProd, department: e.target.value as Department })
                    }
                    className="w-full p-2 border border-gray-300 rounded-[10px] font-bold bg-white"
                  >
                    <option value="Boucherie et volaille">Boucherie et volaille</option>
                    <option value="Fromage et charcuterie">Fromage et charcuterie</option>
                    <option value="Fruits et légumes">Fruits et légumes</option>
                    <option value="Boulangerie et pâtisserie">Boulangerie et pâtisserie</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-gray-700 mb-1">Catégorie</label>
                  <input
                    type="text"
                    value={newProd.category}
                    onChange={(e) => setNewProd({ ...newProd, category: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded-[10px] font-semibold"
                    placeholder="Viandes, Fruits..."
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-700 mb-1">Nom du produit</label>
                <input
                  type="text"
                  value={newProd.name}
                  onChange={(e) => setNewProd({ ...newProd, name: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded-[10px] font-bold text-sm"
                  placeholder="ex: Beefsteak de bœuf 500g"
                  required
                />
              </div>

              {/* Barcode Grid */}
              <div className="p-3 bg-gray-50 rounded-[16px] border border-gray-200 space-y-2.5">
                <span className="block text-[11px] font-black uppercase tracking-wider text-gray-700">
                  Codes-Barres GS1 :
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[10px] font-bold text-blue-800 mb-0.5">
                      1. marjane (Statut: Valide, EAN-13)
                    </label>
                    <input
                      type="text"
                      value={newProd.barcodeMarjane || ''}
                      onChange={(e) => setNewProd({ ...newProd, barcodeMarjane: e.target.value })}
                      className="w-full p-1.5 border border-gray-300 rounded-[8px] font-mono text-xs"
                      placeholder="13 chiffres"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-purple-800 mb-0.5">
                      2. marjane 2 (Statut: Possible, EAN-13)
                    </label>
                    <input
                      type="text"
                      value={newProd.barcodeP2 || ''}
                      onChange={(e) => setNewProd({ ...newProd, barcodeP2: e.target.value })}
                      className="w-full p-1.5 border border-gray-300 rounded-[8px] font-mono text-xs"
                      placeholder="13 chiffres"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-emerald-800 mb-0.5">
                      3. marjane Interne (Statut: Possible, Interne)
                    </label>
                    <input
                      type="text"
                      value={newProd.barcodeInterne || newProd.barcodeMjValide || ''}
                      onChange={(e) => setNewProd({
                        ...newProd,
                        barcodeInterne: e.target.value,
                        barcodeMjValide: e.target.value,
                      })}
                      className="w-full p-1.5 border border-gray-300 rounded-[8px] font-mono text-xs"
                      placeholder="13 chiffres"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-teal-800 mb-0.5">
                      4. marjane mini (Statut: Possible, EAN-8)
                    </label>
                    <input
                      type="text"
                      value={newProd.barcodeMiniSecours || ''}
                      onChange={(e) => setNewProd({ ...newProd, barcodeMiniSecours: e.target.value })}
                      className="w-full p-1.5 border border-gray-300 rounded-[8px] font-mono text-xs"
                      placeholder="8 chiffres"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-amber-800 mb-0.5">
                      5. marjane sec (Statut: Possible, Secours)
                    </label>
                    <input
                      type="text"
                      value={newProd.barcodeSecours || ''}
                      onChange={(e) => setNewProd({ ...newProd, barcodeSecours: e.target.value })}
                      className="w-full p-1.5 border border-gray-300 rounded-[8px] font-mono text-xs"
                      placeholder="13 chiffres"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-fuchsia-800 mb-0.5">
                      6. marjane sec 2 (Statut: Possible, Secours 2)
                    </label>
                    <input
                      type="text"
                      value={newProd.barcodeP3 || ''}
                      onChange={(e) => setNewProd({ ...newProd, barcodeP3: e.target.value })}
                      className="w-full p-1.5 border border-gray-300 rounded-[8px] font-mono text-xs"
                      placeholder="13 chiffres"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-700 mb-1">
                  URL de l'image (image_html)
                </label>
                <input
                  type="url"
                  value={newProd.imageUrl || ''}
                  onChange={(e) => setNewProd({ ...newProd, imageUrl: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded-[10px] text-xs font-mono"
                  placeholder="https://..."
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-[10px] border border-gray-200 font-bold text-gray-600 hover:bg-gray-50"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-[10px] bg-[#0759A4] text-white font-bold hover:bg-blue-800 shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Ajouter au catalogue</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Supabase SQL Setup Modal */}
      {isSqlModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-[22px] shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-150">
            {/* Modal Header */}
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-gray-900 to-[#0759A4] text-white">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
                  <Database className="w-4 h-4 text-emerald-300" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-black">Initialisation Table Supabase</h3>
                  <p className="text-[11px] text-white/80">Projet : {supabaseProjectId}.supabase.co</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsSqlModalOpen(false)}
                className="p-1.5 rounded-full hover:bg-white/20 text-white/80 hover:text-white transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-5 space-y-4 overflow-y-auto">
              <div className="bg-blue-50 border border-blue-200 rounded-[14px] p-3.5 text-xs text-blue-900 space-y-1.5">
                <p className="font-bold flex items-center gap-1.5 text-[#0759A4]">
                  <CheckCircle2 className="w-4 h-4 text-[#0759A4]" />
                  Étape unique : Initialiser les tables dans Supabase
                </p>
                <p className="text-gray-600 leading-relaxed">
                  1. Cliquez sur <strong>Copier SQL</strong> ci-dessous.<br />
                  2. Cliquez sur <strong>Ouvrir Supabase SQL</strong> (SQL Editor).<br />
                  3. Collez et cliquez sur <strong>RUN</strong> pour créer la table <code className="bg-white px-1 py-0.5 rounded border text-blue-800 font-mono">products</code> (avec les 11 colonnes exactes : code, produit, marjane, marjane 2, marjane Interne, marjane mini, marjane sec, marjane sec 2, image_html, département, catégorie) et la table <code className="bg-white px-1 py-0.5 rounded border text-blue-800 font-mono">tips</code> avec le Realtime actif.<br />
                  4. La synchronisation bidirectionnelle est instantanée entre le site Supabase et l'application !
                </p>
              </div>

              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold text-gray-700">Script SQL DDL & Politiques RLS :</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(SUPABASE_SETUP_SQL);
                      setCopiedSql(true);
                      showToast('Script SQL copié dans le presse-papier !');
                      setTimeout(() => setCopiedSql(false), 2500);
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0759A4] hover:bg-blue-800 text-white text-xs font-bold rounded-[10px] transition active:scale-95 shadow-xs cursor-pointer"
                  >
                    {copiedSql ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedSql ? 'Copié !' : 'Copier SQL'}</span>
                  </button>

                  <a
                    href={`https://supabase.com/dashboard/project/${supabaseProjectId}/sql/new`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-900 hover:bg-black text-white text-xs font-bold rounded-[10px] transition active:scale-95 shadow-xs cursor-pointer"
                  >
                    <span>Ouvrir Supabase SQL</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>

              <div className="relative">
                <pre className="bg-gray-900 text-gray-100 p-4 rounded-[14px] text-xs font-mono overflow-x-auto max-h-[300px] border border-gray-800 select-all leading-relaxed">
                  {SUPABASE_SETUP_SQL}
                </pre>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-5 py-3.5 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
              <button
                type="button"
                onClick={async () => {
                  const health = await checkSupabaseStatus();
                  if (health && health.tableExists) {
                    showToast('Table détectée avec succès sur Supabase !');
                    setIsSqlModalOpen(false);
                  } else {
                    showToast("La table 'products' n'est pas encore détectée. Assurez-vous d'avoir cliqué sur RUN dans Supabase.");
                  }
                }}
                className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-[10px] transition active:scale-95 shadow-xs cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Tester la détection maintenant</span>
              </button>

              <button
                type="button"
                onClick={() => setIsSqlModalOpen(false)}
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 text-xs font-bold rounded-[10px] transition cursor-pointer"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Web Site & API Connection Guide Modal */}
      {isApiGuideModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-2xl max-h-[90vh] bg-white rounded-[22px] shadow-2xl border border-gray-200 flex flex-col overflow-hidden animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 bg-gradient-to-r from-[#0F172A] via-[#064E3B] to-[#047857] text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-[12px] bg-white/15 backdrop-blur-xs flex items-center justify-center border border-white/20">
                  <Globe className="w-5 h-5 text-emerald-300" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-black">Connexion Simple Base de Données ↔ Site Web</h3>
                  <p className="text-[11px] text-emerald-100">Synchronisez vos produits entre votre site et cette application en direct</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsApiGuideModalOpen(false)}
                className="p-1.5 rounded-full hover:bg-white/20 text-white/80 hover:text-white transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 sm:p-5 space-y-4 overflow-y-auto text-xs">
              {/* Live Connection Test Banner */}
              <div className="bg-emerald-50/80 border border-emerald-200 rounded-[16px] p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="font-extrabold text-[#064E3B]">Base Supabase Ouverte & Prête :</span>
                    <span className="font-mono text-[11px] bg-white px-2 py-0.5 rounded border border-emerald-200 text-emerald-800">
                      {supabaseProjectId}.supabase.co
                    </span>
                  </div>
                  <p className="text-[11px] text-emerald-800">
                    L&apos;API REST est accessible sans restriction (CORS et accès anonyme autorisés pour la lecture et l&apos;écriture).
                  </p>
                  {apiTestStatus.result && (
                    <p className={`text-[11px] font-bold mt-1 ${apiTestStatus.success ? 'text-emerald-700' : 'text-rose-700'}`}>
                      {apiTestStatus.result}
                    </p>
                  )}
                </div>

                <button
                  type="button"
                  onClick={testSiteConnection}
                  disabled={apiTestStatus.testing}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold rounded-[12px] shadow-xs transition shrink-0 cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${apiTestStatus.testing ? 'animate-spin' : ''}`} />
                  <span>{apiTestStatus.testing ? 'Test en cours...' : 'Tester Connexion Directe'}</span>
                </button>
              </div>

              {/* Paramètres de Connexion (URL + API Key) */}
              <div className="space-y-2">
                <h4 className="font-black text-[#171717] flex items-center gap-1.5 text-xs">
                  <Link className="w-3.5 h-3.5 text-emerald-600" />
                  <span>1. Paramètres de Connexion à copier dans votre site</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div className="p-3 bg-gray-50 rounded-[14px] border border-gray-200 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-gray-500 uppercase">URL API REST (Endpoint)</span>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(`https://${supabaseProjectId}.supabase.co/rest/v1/products`);
                          setCopiedEndpoint(true);
                          showToast('URL API copiée !');
                          setTimeout(() => setCopiedEndpoint(false), 2000);
                        }}
                        className="text-[10px] font-bold text-emerald-700 hover:underline flex items-center gap-1"
                      >
                        {copiedEndpoint ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                        <span>{copiedEndpoint ? 'Copié' : 'Copier'}</span>
                      </button>
                    </div>
                    <p className="font-mono text-[11px] text-gray-800 break-all select-all">
                      https://{supabaseProjectId}.supabase.co/rest/v1/products
                    </p>
                  </div>

                  <div className="p-3 bg-gray-50 rounded-[14px] border border-gray-200 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-gray-500 uppercase">Clé API (Anon Publishable)</span>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText('sb_publishable_Edhz1UUdYBSAmU65NCv08w_Z5u-D2mp');
                          setCopiedKey(true);
                          showToast('Clé API copiée !');
                          setTimeout(() => setCopiedKey(false), 2000);
                        }}
                        className="text-[10px] font-bold text-emerald-700 hover:underline flex items-center gap-1"
                      >
                        {copiedKey ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                        <span>{copiedKey ? 'Copié' : 'Copier'}</span>
                      </button>
                    </div>
                    <p className="font-mono text-[11px] text-gray-800 truncate select-all">
                      sb_publishable_Edhz1UUdYBSAmU65NCv08w_Z5u-D2mp
                    </p>
                  </div>
                </div>
              </div>

              {/* Code Snippets Section */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-black text-[#171717] flex items-center gap-1.5 text-xs">
                    <Terminal className="w-3.5 h-3.5 text-[#0759A4]" />
                    <span>2. Code prêt à coller dans votre site web</span>
                  </h4>

                  <div className="flex items-center gap-1 bg-gray-100 p-0.5 rounded-[10px]">
                    {(['js', 'react', 'php', 'python', 'curl'] as const).map((lang) => (
                      <button
                        key={lang}
                        type="button"
                        onClick={() => setApiSnippetLang(lang)}
                        className={`px-2 py-1 rounded-[8px] font-bold text-[10px] transition cursor-pointer ${
                          apiSnippetLang === lang
                            ? 'bg-white text-[#0759A4] shadow-xs'
                            : 'text-gray-500 hover:text-gray-800'
                        }`}
                      >
                        {lang === 'js' ? 'JavaScript' : lang === 'react' ? 'React/Next.js' : lang.toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="relative">
                  <div className="absolute right-3 top-3 z-10">
                    <button
                      type="button"
                      onClick={() => {
                        let textToCopy = '';
                        if (apiSnippetLang === 'js') {
                          textToCopy = `// 1. Lire tous les produits depuis votre site web\nasync function chargerCatalogue() {\n  const res = await fetch('https://${supabaseProjectId}.supabase.co/rest/v1/products?select=*', {\n    headers: {\n      'apikey': 'sb_publishable_Edhz1UUdYBSAmU65NCv08w_Z5u-D2mp',\n      'Authorization': 'Bearer sb_publishable_Edhz1UUdYBSAmU65NCv08w_Z5u-D2mp'\n    }\n  });\n  const produits = await res.json();\n  console.log('Total articles :', produits.length);\n  return produits;\n}\n\n// 2. Ajouter un produit depuis votre site web\nasync function ajouterProduit(nouveau) {\n  const res = await fetch('https://${supabaseProjectId}.supabase.co/rest/v1/products', {\n    method: 'POST',\n    headers: {\n      'apikey': 'sb_publishable_Edhz1UUdYBSAmU65NCv08w_Z5u-D2mp',\n      'Authorization': 'Bearer sb_publishable_Edhz1UUdYBSAmU65NCv08w_Z5u-D2mp',\n      'Content-Type': 'application/json',\n      'Prefer': 'return=representation'\n    },\n    body: JSON.stringify({\n      code: nouveau.code || '-',\n      produit: nouveau.name,\n      département: nouveau.department || 'MARCHE', // MARCHE, STAND, BOUCHERIE, BOULANGERIE\n      catégorie: nouveau.category || 'Général',\n      marjane: nouveau.barcode || '0',\n      is_enabled: true\n    })\n  });\n  return await res.json();\n}`;
                        } else if (apiSnippetLang === 'react') {
                          textToCopy = `import { createClient } from '@supabase/supabase-js';\n\nexport const supabase = createClient(\n  'https://${supabaseProjectId}.supabase.co',\n  'sb_publishable_Edhz1UUdYBSAmU65NCv08w_Z5u-D2mp'\n);\n\n// Lire les produits\nexport async function getProducts() {\n  const { data, error } = await supabase\n    .from('products')\n    .select('*')\n    .order('id', { ascending: true });\n  return data;\n}\n\n// Synchronisation en temps réel (détection automatique des ajouts)\nsupabase\n  .channel('realtime-products')\n  .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, (payload) => {\n    console.log('Catalogue mis à jour !', payload);\n  })\n  .subscribe();`;
                        } else if (apiSnippetLang === 'php') {
                          textToCopy = `<?php\n// Récupérer les produits en PHP / WordPress\n$url = 'https://${supabaseProjectId}.supabase.co/rest/v1/products?select=*';\n$apiKey = 'sb_publishable_Edhz1UUdYBSAmU65NCv08w_Z5u-D2mp';\n\n$ch = curl_init($url);\ncurl_setopt($ch, CURLOPT_RETURNTRANSFER, true);\ncurl_setopt($ch, CURLOPT_HTTPHEADER, [\n    'apikey: ' . $apiKey,\n    'Authorization: Bearer ' . $apiKey\n]);\n\n$response = curl_exec($ch);\ncurl_close($ch);\n$products = json_decode($response, true);\necho "Total articles : " . count($products);\n?>`;
                        } else if (apiSnippetLang === 'python') {
                          textToCopy = `import requests\n\nurl = "https://${supabaseProjectId}.supabase.co/rest/v1/products?select=*"\nheaders = {\n    "apikey": "sb_publishable_Edhz1UUdYBSAmU65NCv08w_Z5u-D2mp",\n    "Authorization": "Bearer sb_publishable_Edhz1UUdYBSAmU65NCv08w_Z5u-D2mp"\n}\n\nresponse = requests.get(url, headers=headers)\nproducts = response.json()\nprint(f"Total articles : {len(products)}")`;
                        } else {
                          textToCopy = `curl -X GET "https://${supabaseProjectId}.supabase.co/rest/v1/products?select=*&limit=5" \\\n  -H "apikey: sb_publishable_Edhz1UUdYBSAmU65NCv08w_Z5u-D2mp" \\\n  -H "Authorization: Bearer sb_publishable_Edhz1UUdYBSAmU65NCv08w_Z5u-D2mp"`;
                        }
                        navigator.clipboard.writeText(textToCopy);
                        setCopiedSnippet(true);
                        showToast('Code copié dans le presse-papier !');
                        setTimeout(() => setCopiedSnippet(false), 2000);
                      }}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 bg-white/20 hover:bg-white/30 text-white rounded-[8px] text-[10px] font-bold backdrop-blur-xs transition cursor-pointer"
                    >
                      {copiedSnippet ? <Check className="w-3 h-3 text-emerald-300" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedSnippet ? 'Copié !' : 'Copier le code'}</span>
                    </button>
                  </div>

                  <pre className="p-4 bg-gray-900 text-gray-100 font-mono text-[11px] rounded-[14px] overflow-x-auto max-h-[220px] select-all leading-relaxed border border-gray-800">
                    {apiSnippetLang === 'js' && `// 1. Lire tous les produits depuis votre site web
async function chargerCatalogue() {
  const res = await fetch('https://${supabaseProjectId}.supabase.co/rest/v1/products?select=*', {
    headers: {
      'apikey': 'sb_publishable_Edhz1UUdYBSAmU65NCv08w_Z5u-D2mp',
      'Authorization': 'Bearer sb_publishable_Edhz1UUdYBSAmU65NCv08w_Z5u-D2mp'
    }
  });
  const produits = await res.json();
  console.log('Total articles :', produits.length);
  return produits;
}

// 2. Ajouter un produit depuis votre site web
async function ajouterProduit(nouveau) {
  const res = await fetch('https://${supabaseProjectId}.supabase.co/rest/v1/products', {
    method: 'POST',
    headers: {
      'apikey': 'sb_publishable_Edhz1UUdYBSAmU65NCv08w_Z5u-D2mp',
      'Authorization': 'Bearer sb_publishable_Edhz1UUdYBSAmU65NCv08w_Z5u-D2mp',
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    },
    body: JSON.stringify({
      code: nouveau.code || '-',
      produit: nouveau.name,
      département: nouveau.department || 'MARCHE', // MARCHE, STAND, BOUCHERIE, BOULANGERIE
      catégorie: nouveau.category || 'Général',
      marjane: nouveau.barcode || '0',
      is_enabled: true
    })
  });
  return await res.json();
}`}
                    {apiSnippetLang === 'react' && `import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  'https://${supabaseProjectId}.supabase.co',
  'sb_publishable_Edhz1UUdYBSAmU65NCv08w_Z5u-D2mp'
);

// Lire les produits
export async function getProducts() {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .order('id', { ascending: true });
  return data;
}

// Synchronisation en temps réel (détection automatique des ajouts)
supabase
  .channel('realtime-products')
  .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, (payload) => {
    console.log('Catalogue mis à jour !', payload);
  })
  .subscribe();`}
                    {apiSnippetLang === 'php' && `<?php
// Récupérer les produits en PHP / WordPress
$url = 'https://${supabaseProjectId}.supabase.co/rest/v1/products?select=*';
$apiKey = 'sb_publishable_Edhz1UUdYBSAmU65NCv08w_Z5u-D2mp';

$ch = curl_init($url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'apikey: ' . $apiKey,
    'Authorization: Bearer ' . $apiKey
]);

$response = curl_exec($ch);
curl_close($ch);
$products = json_decode($response, true);
echo "Total articles : " . count($products);
?>`}
                    {apiSnippetLang === 'python' && `import requests

url = "https://${supabaseProjectId}.supabase.co/rest/v1/products?select=*"
headers = {
    "apikey": "sb_publishable_Edhz1UUdYBSAmU65NCv08w_Z5u-D2mp",
    "Authorization": "Bearer sb_publishable_Edhz1UUdYBSAmU65NCv08w_Z5u-D2mp"
}

response = requests.get(url, headers=headers)
products = response.json()
print(f"Total articles : {len(products)}")`}
                    {apiSnippetLang === 'curl' && `curl -X GET "https://${supabaseProjectId}.supabase.co/rest/v1/products?select=*&limit=5" \\
  -H "apikey: sb_publishable_Edhz1UUdYBSAmU65NCv08w_Z5u-D2mp" \\
  -H "Authorization: Bearer sb_publishable_Edhz1UUdYBSAmU65NCv08w_Z5u-D2mp"`}
                  </pre>
                </div>
              </div>

              {/* Correspondance des rayons (Guide départements) */}
              <div className="p-3.5 bg-blue-50/70 border border-blue-200 rounded-[14px] space-y-2">
                <h4 className="font-extrabold text-[#0759A4] flex items-center gap-1.5 text-xs">
                  <Zap className="w-3.5 h-3.5" />
                  <span>3. Correspondance des Rayons (Marjane / Aswak)</span>
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                  <div className="bg-white p-2 rounded-[10px] border border-blue-100">
                    <span className="font-black text-emerald-800 block">MARCHE</span>
                    <span className="text-gray-600">Fruits et légumes (237 art.)</span>
                  </div>
                  <div className="bg-white p-2 rounded-[10px] border border-blue-100">
                    <span className="font-black text-blue-800 block">STAND</span>
                    <span className="text-gray-600">Fromage et charcuterie (203 art.)</span>
                  </div>
                  <div className="bg-white p-2 rounded-[10px] border border-blue-100">
                    <span className="font-black text-rose-800 block">BOUCHERIE</span>
                    <span className="text-gray-600">Boucherie et volaille (99 art.)</span>
                  </div>
                  <div className="bg-white p-2 rounded-[10px] border border-blue-100">
                    <span className="font-black text-amber-800 block">BOULANGERIE</span>
                    <span className="text-gray-600">Boulangerie et pâtisserie (4 art.)</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-5 py-3.5 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
              <span className="text-[11px] text-gray-500 font-medium">
                La synchronisation entre site et application s&apos;effectue toutes les 12 secondes et en temps réel.
              </span>
              <button
                type="button"
                onClick={() => setIsApiGuideModalOpen(false)}
                className="px-4 py-2 bg-gray-900 hover:bg-black text-white text-xs font-bold rounded-[10px] transition cursor-pointer"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal: Vider tout le catalogue (0 produit) */}
      {isClearModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-sm bg-white rounded-[22px] p-5 shadow-2xl border border-gray-200 animate-in zoom-in-95 duration-150 space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                <h3 className="font-black text-sm text-gray-900 leading-tight">Vider tout le catalogue ?</h3>
                <span className="text-[11px] text-rose-600 font-bold">Action irréversible (0 article)</span>
              </div>
            </div>

            <p className="text-xs text-gray-600 leading-relaxed">
              Voulez-vous supprimer <strong>TOUS les {products.length} articles</strong> du catalogue et de la base de données Supabase ? Le catalogue passera à 0 pour vous permettre de tester l&apos;ajout de nouveaux produits.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setIsClearModalOpen(false)}
                disabled={isClearing}
                className="px-3.5 py-2 rounded-[10px] bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold transition cursor-pointer"
              >
                Annuler
              </button>
              <button
                type="button"
                disabled={isClearing}
                onClick={async () => {
                  setIsClearing(true);
                  try {
                    await clearAllProducts();
                    showToast('🗑️ Tous les produits ont été supprimés (0 article) !');
                    setIsClearModalOpen(false);
                  } catch (err: any) {
                    showToast(`Erreur lors du vidage: ${err.message}`);
                  } finally {
                    setIsClearing(false);
                  }
                }}
                className="flex items-center gap-1.5 px-4 py-2 rounded-[10px] bg-rose-600 hover:bg-rose-700 text-white text-xs font-black shadow-xs transition active:scale-95 cursor-pointer disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isClearing ? 'Suppression...' : 'Oui, Vider tout (0)'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal: Restaurer le catalogue d'origine (543 articles) */}
      {isRestoreModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-sm bg-white rounded-[22px] p-5 shadow-2xl border border-gray-200 animate-in zoom-in-95 duration-150 space-y-4">
            <div className="flex items-center gap-3 text-[#0759A4]">
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                <RotateCcw className="w-5 h-5 text-[#0759A4]" />
              </div>
              <div>
                <h3 className="font-black text-sm text-gray-900 leading-tight">Restaurer le catalogue officiel ?</h3>
                <span className="text-[11px] text-[#0759A4] font-bold">543 articles Marjane / Aswak</span>
              </div>
            </div>

            <p className="text-xs text-gray-600 leading-relaxed">
              Voulez-vous recharger les <strong>543 articles officiels</strong> du catalogue et les synchroniser vers votre base de données Supabase ?
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setIsRestoreModalOpen(false)}
                disabled={isRestoring}
                className="px-3.5 py-2 rounded-[10px] bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold transition cursor-pointer"
              >
                Annuler
              </button>
              <button
                type="button"
                disabled={isRestoring}
                onClick={async () => {
                  setIsRestoring(true);
                  try {
                    await seedInitialCatalogueToSupabase();
                    setIsRestoreModalOpen(false);
                  } catch (err: any) {
                    showToast(`Erreur: ${err.message}`);
                  } finally {
                    setIsRestoring(false);
                  }
                }}
                className="flex items-center gap-1.5 px-4 py-2 rounded-[10px] bg-[#0759A4] hover:bg-blue-800 text-white text-xs font-black shadow-xs transition active:scale-95 cursor-pointer disabled:opacity-50"
              >
                <RotateCcw className={`w-3.5 h-3.5 ${isRestoring ? 'animate-spin' : ''}`} />
                <span>{isRestoring ? 'Restauration...' : 'Restaurer 543 articles'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal: Supprimer un seul produit */}
      {productToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-sm bg-white rounded-[22px] p-5 shadow-2xl border border-gray-200 animate-in zoom-in-95 duration-150 space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                <h3 className="font-black text-sm text-gray-900 leading-tight">Supprimer ce produit ?</h3>
                <span className="text-[11px] text-gray-500 font-bold">Code: {productToDelete.code}</span>
              </div>
            </div>

            <p className="text-xs text-gray-700 leading-relaxed font-semibold">
              &ldquo;{productToDelete.name}&rdquo;
            </p>
            <p className="text-[11px] text-gray-500">
              Ce produit sera retiré du catalogue et supprimé de Supabase.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setProductToDelete(null)}
                className="px-3.5 py-2 rounded-[10px] bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold transition cursor-pointer"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={() => {
                  deleteProduct(productToDelete.id);
                  setProductToDelete(null);
                }}
                className="flex items-center gap-1.5 px-4 py-2 rounded-[10px] bg-rose-600 hover:bg-rose-700 text-white text-xs font-black shadow-xs transition active:scale-95 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Supprimer</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Image Preview Modal */}
      {previewImageUrl && (
        <div
          onClick={() => setPreviewImageUrl(null)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs cursor-pointer"
        >
          <div className="relative max-w-md bg-white p-3 rounded-[20px] shadow-2xl">
            <img
              src={previewImageUrl}
              alt="Aperçu grand format"
              className="w-full h-auto max-h-[70vh] object-contain rounded-[14px]"
            />
            <p className="text-center text-xs font-bold text-gray-500 mt-2">Cliquez pour fermer</p>
          </div>
        </div>
      )}

      {/* Custom Supabase Project Configuration Modal */}
      {isCustomConfigModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-lg bg-white rounded-[24px] p-5 sm:p-6 shadow-2xl border border-gray-200 animate-in zoom-in-95 duration-150 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center text-[#0759A4]">
                  <Database className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-sm sm:text-base text-gray-900 leading-tight">
                    Lier votre propre base Supabase
                  </h3>
                  <p className="text-[11px] text-gray-500 font-medium">
                    ربط التطبيق مع مشروع Supabase الخاص بك
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCustomConfigModalOpen(false)}
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Step-by-step Guide */}
            <div className="bg-slate-50 border border-slate-200 rounded-[14px] p-3 text-xs text-slate-700 space-y-1.5">
              <p className="font-bold text-[#0759A4] flex items-center gap-1">
                <span>📋 Les 3 étapes pour lier votre projet :</span>
              </p>
              <ol className="list-decimal list-inside space-y-1 text-[11px] text-slate-600 leading-relaxed font-medium">
                <li>Ouvrez votre projet sur <strong>supabase.com</strong>.</li>
                <li>Allez dans <strong>Project Settings ⚙️ → API Keys / Data API</strong>.</li>
                <li>Copiez l&apos;<strong>URL du projet</strong> et la clé <strong>anon / public</strong> puis collez-les ci-dessous.</li>
                <li>Dans Supabase, allez sur <strong>SQL Editor</strong> et collez le script SQL (bouton vert en bas) pour créer la table.</li>
              </ol>
            </div>

            {/* Inputs */}
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  URL du projet Supabase (Project URL)
                </label>
                <input
                  type="text"
                  value={customUrlInput}
                  onChange={(e) => setCustomUrlInput(e.target.value)}
                  placeholder="https://pssizsvkbgabnarlyawj.supabase.co"
                  className="w-full px-3 py-2 text-xs font-mono bg-gray-50 border border-gray-300 rounded-[10px] focus:outline-none focus:ring-2 focus:ring-[#0759A4] focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Clé publique Supabase (Anon / Publishable API Key)
                </label>
                <textarea
                  rows={2}
                  value={customKeyInput}
                  onChange={(e) => setCustomKeyInput(e.target.value)}
                  placeholder="sb_publishable_... ou eyJhbGciOi..."
                  className="w-full px-3 py-2 text-xs font-mono bg-gray-50 border border-gray-300 rounded-[10px] focus:outline-none focus:ring-2 focus:ring-[#0759A4] focus:bg-white"
                />
              </div>
            </div>

            {/* SQL Script Quick Access */}
            <div className="bg-blue-50 border border-blue-200 rounded-[12px] p-2.5 flex items-center justify-between gap-2">
              <div className="text-[11px] text-blue-900 font-semibold">
                Table <code>products</code> manquante ?
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsCustomConfigModalOpen(false);
                  setIsSqlModalOpen(true);
                }}
                className="px-2.5 py-1 rounded-[8px] bg-[#0759A4] text-white text-[11px] font-bold hover:bg-[#064a88] transition cursor-pointer flex items-center gap-1 shrink-0"
              >
                <Code2 className="w-3 h-3" />
                <span>Copier le Script SQL</span>
              </button>
            </div>

            {/* Action buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-2 border-t border-gray-100">
              <button
                type="button"
                onClick={() => {
                  resetSupabaseCredentialsToDefault();
                  showToast('Réinitialisé au projet par défaut !');
                  setTimeout(() => {
                    window.location.reload();
                  }, 500);
                }}
                className="text-[11px] text-gray-500 hover:text-rose-600 font-bold underline cursor-pointer"
              >
                Remettre le projet par défaut
              </button>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  onClick={() => setIsCustomConfigModalOpen(false)}
                  className="px-3.5 py-2 rounded-[10px] bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold transition cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (!customUrlInput.trim() || !customKeyInput.trim()) {
                      showToast('Veuillez renseigner l URL et la clé');
                      return;
                    }
                    setCustomSupabaseCredentials(customUrlInput, customKeyInput);
                    showToast('✅ Clés sauvegardées ! Reconnexion...');
                    setTimeout(() => {
                      window.location.reload();
                    }, 600);
                  }}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-[10px] bg-[#0759A4] hover:bg-[#064a88] text-white text-xs font-black shadow-xs transition active:scale-95 cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Sauvegarder & Reconnecter</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

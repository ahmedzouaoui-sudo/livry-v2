import React, { useState, useMemo, useRef } from 'react';
import {
  ArrowLeft,
  Lightbulb,
  Plus,
  Search,
  ThumbsUp,
  Trash2,
  X,
  Send,
  Camera,
  ZoomIn,
  Pencil,
  Check,
  Database,
  BookOpen,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { TipCategory, TipPost } from '../types';
import { triggerHaptic } from '../utils/haptics';
import { AppTutorialModal } from './AppTutorialModal';

interface AstucesScreenProps {
  onBack: () => void;
}

export const AstucesScreen: React.FC<AstucesScreenProps> = ({ onBack }) => {
  const { tips, addTip, updateTip, deleteTip, likeTip, role, seedTips, setActiveTab } = useApp();

  const [searchTip, setSearchTip] = useState('');
  const [selectedCat, setSelectedCat] = useState<string>('ALL');
  const [audienceFilter, setAudienceFilter] = useState<'ALL' | 'Pickeur' | 'Livreur' | 'Référent'>('ALL');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isTutorialOpen, setIsTutorialOpen] = useState(false);
  const [editingTip, setEditingTip] = useState<TipPost | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // Form State
  const [formTitle, setFormTitle] = useState('');
  const [formCategory, setFormCategory] = useState<TipCategory>('Scanner & Caisse');
  const [formTargetAudience, setFormTargetAudience] = useState<'Tous' | 'Pickeur' | 'Livreur' | 'Référent'>('Tous');
  const [formContent, setFormContent] = useState('');
  const [formAuthorName, setFormAuthorName] = useState('');
  const [formImageUrl, setFormImageUrl] = useState('');
  const [isCompressingImage, setIsCompressingImage] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const categories: TipCategory[] = [
    'Général',
    'Pesée & Balance',
    'Scanner & Caisse',
    'Fruits & Légumes',
    'Boucherie',
    'Fromage',
    'Boulangerie',
  ];

  const getCategoryColor = (cat: TipCategory) => {
    switch (cat) {
      case 'Pesée & Balance':
        return { bg: '#EBF4FC', text: '#0759A4', border: '#D0E3F7' };
      case 'Scanner & Caisse':
        return { bg: '#FEF3C7', text: '#92400E', border: '#FDE68A' };
      case 'Fruits & Légumes':
        return { bg: '#E8F5E9', text: '#1B5E20', border: '#C8E6C9' };
      case 'Boucherie':
        return { bg: '#FFEBEE', text: '#B71C1C', border: '#FFCDD2' };
      case 'Fromage':
        return { bg: '#FFF8E1', text: '#B78103', border: '#FFE082' };
      case 'Boulangerie':
        return { bg: '#FFF3E0', text: '#E65100', border: '#FFE0B2' };
      default:
        return { bg: '#F3F4F6', text: '#374151', border: '#E5E7EB' };
    }
  };

  const getAudienceBadge = (audience?: 'Tous' | 'Pickeur' | 'Livreur' | 'Référent') => {
    switch (audience) {
      case 'Pickeur':
        return {
          label: '🛒 Pour Pickeurs',
          bg: '#EBF4FC',
          text: '#0759A4',
          border: '#B9DBF8',
        };
      case 'Livreur':
        return {
          label: '🛵 Pour Livreurs',
          bg: '#EAF8F1',
          text: '#1E8E55',
          border: '#B7EACD',
        };
      case 'Référent':
        return {
          label: '⭐ Pour Référents',
          bg: '#FFF3E0',
          text: '#E65100',
          border: '#FFE0B2',
        };
      default:
        return {
          label: '👥 Pour Tous',
          bg: '#F3E8FF',
          text: '#6B21A8',
          border: '#E9D5FF',
        };
    }
  };

  const filteredTips = useMemo(() => {
    return tips.filter((t) => {
      // Filter by audience
      if (audienceFilter !== 'ALL') {
        const aud = t.targetAudience || 'Tous';
        if (aud !== 'Tous' && aud !== audienceFilter) {
          return false;
        }
      }

      // Filter by category
      if (selectedCat !== 'ALL' && t.category !== selectedCat) {
        return false;
      }

      // Filter by search text
      if (!searchTip.trim()) return true;
      const q = searchTip.toLowerCase();
      return (
        t.title.toLowerCase().includes(q) ||
        t.content.toLowerCase().includes(q) ||
        (t.authorName && t.authorName.toLowerCase().includes(q))
      );
    });
  }, [tips, audienceFilter, selectedCat, searchTip]);

  // Open modal for new tip
  const handleOpenCreate = () => {
    setEditingTip(null);
    setFormTitle('');
    setFormCategory('Scanner & Caisse');
    setFormTargetAudience('Tous');
    setFormContent('');
    setFormAuthorName('Admin Livry');
    setFormImageUrl('');
    setIsModalOpen(true);
  };

  // Open modal for editing tip
  const handleOpenEdit = (tip: TipPost) => {
    setEditingTip(tip);
    setFormTitle(tip.title);
    setFormCategory(tip.category);
    setFormTargetAudience(tip.targetAudience || 'Tous');
    setFormContent(tip.content);
    setFormAuthorName(tip.authorName || 'Admin Livry');
    setFormImageUrl(tip.imageUrl || '');
    setIsModalOpen(true);
  };

  // Compress and convert image to lightweight Base64 to save in localStorage
  const handleImageFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsCompressingImage(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 750;
        let width = img.width;
        let height = img.height;

        if (width > MAX_WIDTH) {
          height = Math.round((height * MAX_WIDTH) / width);
          width = MAX_WIDTH;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.75);
          setFormImageUrl(compressedDataUrl);
        }
        setIsCompressingImage(false);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim() || !formContent.trim()) return;

    if (editingTip) {
      updateTip({
        ...editingTip,
        title: formTitle.trim(),
        category: formCategory,
        targetAudience: formTargetAudience,
        content: formContent.trim(),
        authorName: formAuthorName.trim() || editingTip.authorName,
        imageUrl: formImageUrl.trim() || undefined,
      });
    } else {
      addTip({
        title: formTitle.trim(),
        category: formCategory,
        targetAudience: formTargetAudience,
        content: formContent.trim(),
        authorRole: role,
        authorName: formAuthorName.trim() || `${role} Livry`,
        imageUrl: formImageUrl.trim() || undefined,
      });
    }

    setIsModalOpen(false);
    setEditingTip(null);
  };

  return (
    <div className="w-full max-w-[650px] mx-auto px-3.5 py-3 pb-20 flex flex-col min-h-[calc(100vh-65px)]">
      {/* Top Header with Back button and Add button (Admin ONLY) */}
      <div className="flex items-center justify-between gap-1.5 sm:gap-2.5 mb-3 flex-wrap">
        <button
          type="button"
          onClick={() => {
            triggerHaptic('light');
            onBack();
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-[12px] text-[#0759A4] bg-white border border-[#E0E0E6]/80 shadow-2xs hover:bg-[#EBF4FC] active:scale-95 transition font-bold text-xs shrink-0 cursor-pointer select-none"
        >
          <ArrowLeft className="w-4 h-4 text-[#0759A4]" />
          <span>Retour</span>
        </button>

        <div className="flex items-center gap-1.5">
          <Lightbulb className="w-4 h-4 text-amber-500 fill-amber-500" />
          <h1 className="text-sm sm:text-base font-bold text-[#171717]">
            Astuces & Tutos
          </h1>
        </div>

        {/* Only Admin can publish or seed tutorials */}
        {role === 'Admin' ? (
          <div className="flex items-center gap-1.5 flex-wrap ml-auto">
            <button
              type="button"
              onClick={() => {
                triggerHaptic('medium');
                setActiveTab('admin');
              }}
              className="flex items-center gap-1 px-2 py-1.5 rounded-[12px] bg-[#FDF0F5] hover:bg-[#FCE4EC] text-[#B43167] border border-[#B43167]/30 text-xs font-black transition active:scale-95 cursor-pointer shadow-2xs select-none"
              title="Ouvrir le panneau Données & Base Supabase"
            >
              <Database className="w-3.5 h-3.5" />
              <span className="hidden xs:inline">Data</span>
            </button>
            <button
              type="button"
              onClick={() => {
                triggerHaptic('light');
                handleOpenCreate();
              }}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-[12px] bg-[#B43167] text-white font-bold text-xs shadow-xs hover:bg-[#992655] active:scale-95 transition cursor-pointer select-none"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Nouveau</span>
            </button>
          </div>
        ) : (
          <div className="w-12" />
        )}
      </div>

      {/* Official Tutorial Callout Banner (B Darija) */}
      <div className="mb-3 bg-gradient-to-r from-[#0759A4] via-[#094d8a] to-[#155B48] text-white rounded-[20px] p-3.5 sm:p-4 shadow-md flex items-center justify-between gap-3 relative overflow-hidden">
        <div className="flex-1 min-w-0">
          <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/20 text-white text-[10px] font-black uppercase tracking-wider mb-1">
            <BookOpen className="w-3 h-3" />
            <span>Guide Officiel Pickeur (B Darija)</span>
          </div>
          <h2 className="text-xs sm:text-sm font-black leading-snug">
            Kifach tkhadmo b'l'app &amp; qawa3id d mizan
          </h2>
          <p className="text-[10.5px] text-white/80 line-clamp-1 mt-0.5">
            1. Mizan &amp; ticket • 2. Qlab &amp; Likes • 3. 3awnona f WhatsApp
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            triggerHaptic('medium');
            setIsTutorialOpen(true);
          }}
          className="px-3 py-2 rounded-[12px] bg-white text-[#0759A4] hover:bg-[#EBF4FC] active:scale-95 text-xs font-black shadow-xs shrink-0 transition flex items-center gap-1.5 cursor-pointer select-none"
        >
          <span>Chouf l'Guide</span>
        </button>
      </div>

      {/* Target Audience Filter Chips: [Tous] [Pickeurs] [Livreurs] [Référents] */}
      <div className="mb-2.5 bg-white p-1 rounded-[16px] border border-[#E0E0E6]/80 shadow-2xs grid grid-cols-4 gap-1">
        <button
          type="button"
          onClick={() => setAudienceFilter('ALL')}
          className={`py-1.5 px-1 sm:px-2 rounded-[12px] text-[11px] sm:text-xs font-bold transition text-center cursor-pointer select-none truncate ${
            audienceFilter === 'ALL'
              ? 'bg-[#171717] text-white shadow-xs'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          👥 Tous
        </button>
        <button
          type="button"
          onClick={() => setAudienceFilter('Pickeur')}
          className={`py-1.5 px-1 sm:px-2 rounded-[12px] text-[11px] sm:text-xs font-bold transition text-center cursor-pointer select-none truncate ${
            audienceFilter === 'Pickeur'
              ? 'bg-[#0759A4] text-white shadow-xs'
              : 'text-[#0759A4] hover:bg-[#EBF4FC]'
          }`}
        >
          🛒 Pickeurs
        </button>
        <button
          type="button"
          onClick={() => setAudienceFilter('Livreur')}
          className={`py-1.5 px-1 sm:px-2 rounded-[12px] text-[11px] sm:text-xs font-bold transition text-center cursor-pointer select-none truncate ${
            audienceFilter === 'Livreur'
              ? 'bg-[#28B873] text-white shadow-xs'
              : 'text-[#1E8E55] hover:bg-[#EAF8F1]'
          }`}
        >
          🛵 Livreurs
        </button>
        <button
          type="button"
          onClick={() => setAudienceFilter('Référent')}
          className={`py-1.5 px-1 sm:px-2 rounded-[12px] text-[11px] sm:text-xs font-bold transition text-center cursor-pointer select-none truncate ${
            audienceFilter === 'Référent'
              ? 'bg-[#E65100] text-white shadow-xs'
              : 'text-[#E65100] hover:bg-[#FFF3E0]'
          }`}
        >
          ⭐ Référents
        </button>
      </div>

      {/* Search Bar for Tips */}
      <div className="relative mb-2.5 bg-[#FFFFFF] rounded-[16px] border border-[#E0E0E6] shadow-2xs">
        <div className="flex items-center h-[44px] px-3.5">
          <Search className="w-4 h-4 text-gray-400 mr-2.5 shrink-0" />
          <input
            type="text"
            value={searchTip}
            onChange={(e) => setSearchTip(e.target.value)}
            placeholder="Rechercher une astuce (balance, scan, sachet, caisse...)"
            className="w-full h-full bg-transparent border-none outline-none text-xs font-semibold text-[#171717] placeholder-gray-400"
          />
          {searchTip && (
            <button
              type="button"
              onClick={() => setSearchTip('')}
              className="p-1 rounded-full text-gray-400 hover:text-gray-700 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Category Filter Chips */}
      <div className="flex items-center gap-1.5 mb-3.5 overflow-x-auto pb-1 no-scrollbar">
        <button
          type="button"
          onClick={() => setSelectedCat('ALL')}
          className={`px-3 py-1.5 rounded-[12px] text-xs font-bold transition shrink-0 cursor-pointer select-none ${
            selectedCat === 'ALL'
              ? 'bg-[#0759A4] text-white shadow-xs'
              : 'bg-white border border-gray-200 text-[#333333] hover:bg-gray-50'
          }`}
        >
          Toutes catégories
        </button>
        {categories.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setSelectedCat(cat)}
            className={`px-3 py-1.5 rounded-[12px] text-xs font-bold transition shrink-0 cursor-pointer select-none ${
              selectedCat === cat
                ? 'bg-[#0759A4] text-white shadow-xs'
                : 'bg-white border border-gray-200 text-[#333333] hover:bg-gray-50'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Posts Feed */}
      <div className="space-y-3">
        {filteredTips.length > 0 ? (
          filteredTips.map((post) => {
            const catStyle = getCategoryColor(post.category);
            const audStyle = getAudienceBadge(post.targetAudience);

            return (
              <div
                key={post.id}
                className="bg-[#FFFFFF] p-3.5 sm:p-4 rounded-[18px] border border-[#E0E0E6]/80 shadow-[0_2px_8px_rgba(0,0,0,0.03)] hover:shadow-xs transition-all space-y-2.5"
              >
                {/* Header of the Post: Badges + Author + Date */}
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {/* Audience badge */}
                    <span
                      className="text-[10px] font-bold px-2 py-0.5 rounded-[8px] border"
                      style={{
                        backgroundColor: audStyle.bg,
                        color: audStyle.text,
                        borderColor: audStyle.border,
                      }}
                    >
                      {audStyle.label}
                    </span>

                    {/* Category badge */}
                    <span
                      className="text-[10px] font-bold px-2 py-0.5 rounded-[8px] border"
                      style={{
                        backgroundColor: catStyle.bg,
                        color: catStyle.text,
                        borderColor: catStyle.border,
                      }}
                    >
                      {post.category}
                    </span>

                    <span className="text-[11px] font-semibold text-gray-600">
                      • {post.authorName || `${post.authorRole} Livry`}
                    </span>
                  </div>

                  <span className="text-[10px] text-gray-400 font-medium">
                    {post.createdAt}
                  </span>
                </div>

                {/* Title */}
                <h3 className="text-sm font-bold text-[#171717] leading-snug">
                  {post.title}
                </h3>

                {/* Attached Photo if available */}
                {post.imageUrl && (
                  <div
                    onClick={() => setPreviewImage(post.imageUrl!)}
                    className="relative rounded-[14px] overflow-hidden bg-gray-50 border border-gray-200 max-h-56 cursor-pointer group"
                    title="Cliquer pour agrandir la photo"
                  >
                    <img
                      src={post.imageUrl}
                      alt={post.title}
                      className="w-full h-auto max-h-56 object-cover group-hover:scale-102 transition-transform duration-200"
                    />
                    <div className="absolute bottom-2 right-2 px-2 py-1 bg-black/60 backdrop-blur-xs text-white text-[10px] font-bold rounded-lg flex items-center gap-1">
                      <ZoomIn className="w-3 h-3" />
                      <span>Agrandir</span>
                    </div>
                  </div>
                )}

                {/* Content */}
                <p className="text-xs text-[#333333] leading-relaxed whitespace-pre-line font-normal">
                  {post.content}
                </p>

                {/* Footer Actions: Like (all) / Edit & Delete (Admin ONLY) */}
                <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => likeTip(post.id)}
                    className="flex items-center gap-1.5 text-xs font-bold text-gray-600 hover:text-[#0759A4] p-1 rounded-[8px] transition active:scale-95 cursor-pointer"
                  >
                    <ThumbsUp className="w-3.5 h-3.5 text-amber-500" />
                    <span>Utile ({post.likes || 0})</span>
                  </button>

                  {role === 'Admin' && (
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(post)}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-[8px] bg-gray-100 text-gray-700 hover:bg-[#0759A4] hover:text-white text-[11px] font-bold transition cursor-pointer"
                        title="Modifier ce tuto"
                      >
                        <Pencil className="w-3 h-3" />
                        <span>Modifier</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => deleteTip(post.id)}
                        className="p-1.5 rounded-[8px] text-gray-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                        title="Supprimer ce tuto"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        ) : (
          <div className="bg-white rounded-[16px] p-8 text-center border border-gray-100 shadow-2xs mt-3">
            <Lightbulb className="w-8 h-8 text-amber-400 mx-auto mb-2 opacity-70" />
            <p className="text-xs font-bold text-[#171717]">Aucune astuce trouvée</p>
            <p className="text-[11px] text-gray-500 mt-1 max-w-sm mx-auto">
              {role === 'Admin'
                ? "Cliquez sur 'Nouveau tuto' pour rédiger une consigne pour les Pickeurs ou Livreurs."
                : "Les astuces publiées par l'administrateur s'afficheront ici."}
            </p>
            {role === 'Admin' && (
              <button
                type="button"
                onClick={handleOpenCreate}
                className="mt-3.5 px-3.5 py-1.5 rounded-[12px] bg-[#B43167] text-white text-xs font-bold hover:bg-[#992655] transition cursor-pointer"
              >
                Créer un tuto
              </button>
            )}
          </div>
        )}
      </div>

      {/* Admin Tutorial Create / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
          <div className="w-full max-w-lg bg-white rounded-[20px] p-5 shadow-2xl border border-gray-200 animate-in fade-in zoom-in-95 duration-150 my-auto max-h-[92vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 mb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-[#FDF0F5] text-[#B43167] flex items-center justify-center">
                  <Lightbulb className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#171717]">
                    {editingTip ? 'Modifier le Tuto' : 'Nouveau Tuto Admin'}
                  </h3>
                  <p className="text-[10px] text-gray-500">
                    Définissez la cible (Pickeur / Livreur / Tous) et les instructions
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsModalOpen(false);
                  setEditingTip(null);
                }}
                className="p-1 text-gray-400 hover:text-gray-600 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3 text-xs overflow-y-auto pr-0.5">
              {/* Target Audience Selector */}
              <div>
                <label className="block text-[11px] font-bold text-gray-700 mb-1.5">
                  Destinataires du tuto (Public cible) *
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <button
                    type="button"
                    onClick={() => setFormTargetAudience('Tous')}
                    className={`py-2 px-1.5 rounded-[12px] text-xs font-bold border transition text-center cursor-pointer flex items-center justify-center gap-1 ${
                      formTargetAudience === 'Tous'
                        ? 'bg-[#171717] text-white border-[#171717] shadow-xs'
                        : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <span>👥 Tous</span>
                    {formTargetAudience === 'Tous' && <Check className="w-3 h-3" />}
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormTargetAudience('Pickeur')}
                    className={`py-2 px-1.5 rounded-[12px] text-xs font-bold border transition text-center cursor-pointer flex items-center justify-center gap-1 ${
                      formTargetAudience === 'Pickeur'
                        ? 'bg-[#0759A4] text-white border-[#0759A4] shadow-xs'
                        : 'bg-white text-[#0759A4] border-[#0759A4]/30 hover:bg-[#EBF4FC]'
                    }`}
                  >
                    <span>🛒 Pickeurs</span>
                    {formTargetAudience === 'Pickeur' && <Check className="w-3 h-3" />}
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormTargetAudience('Livreur')}
                    className={`py-2 px-1.5 rounded-[12px] text-xs font-bold border transition text-center cursor-pointer flex items-center justify-center gap-1 ${
                      formTargetAudience === 'Livreur'
                        ? 'bg-[#28B873] text-white border-[#28B873] shadow-xs'
                        : 'bg-white text-[#1E8E55] border-[#28B873]/30 hover:bg-[#EAF8F1]'
                    }`}
                  >
                    <span>🛵 Livreurs</span>
                    {formTargetAudience === 'Livreur' && <Check className="w-3 h-3" />}
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormTargetAudience('Référent')}
                    className={`py-2 px-1.5 rounded-[12px] text-xs font-bold border transition text-center cursor-pointer flex items-center justify-center gap-1 ${
                      formTargetAudience === 'Référent'
                        ? 'bg-[#E65100] text-white border-[#E65100] shadow-xs'
                        : 'bg-white text-[#E65100] border-[#E65100]/30 hover:bg-[#FFF3E0]'
                    }`}
                  >
                    <span>⭐ Référents</span>
                    {formTargetAudience === 'Référent' && <Check className="w-3 h-3" />}
                  </button>
                </div>
              </div>

              {/* Title */}
              <div>
                <label className="block text-[11px] font-bold text-gray-700 mb-1">
                  Titre du tuto *
                </label>
                <input
                  type="text"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="ex: Comment peser un sachet ou scanner l'étiquette"
                  className="w-full p-2.5 border border-gray-200 rounded-[12px] font-semibold text-xs outline-none focus:border-[#B43167]"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-bold text-gray-700 mb-1">
                    Rayon / Domaine
                  </label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value as TipCategory)}
                    className="w-full p-2 border border-gray-200 rounded-[12px] text-xs bg-white font-medium outline-none focus:border-[#B43167]"
                  >
                    {categories.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-gray-700 mb-1">
                    Signature / Auteur
                  </label>
                  <input
                    type="text"
                    value={formAuthorName}
                    onChange={(e) => setFormAuthorName(e.target.value)}
                    placeholder="ex: Admin Livry"
                    className="w-full p-2 border border-gray-200 rounded-[12px] text-xs outline-none focus:border-[#B43167]"
                  />
                </div>
              </div>

              {/* Photo Upload Section */}
              <div className="bg-gray-50 p-3 rounded-[14px] border border-gray-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-gray-700 flex items-center gap-1.5">
                    <Camera className="w-4 h-4 text-[#B43167]" />
                    <span>Photo d'illustration (optionnelle)</span>
                  </span>
                  {formImageUrl && (
                    <button
                      type="button"
                      onClick={() => setFormImageUrl('')}
                      className="text-[10px] font-bold text-rose-600 hover:underline cursor-pointer"
                    >
                      Supprimer la photo
                    </button>
                  )}
                </div>

                {/* Hidden File Input */}
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleImageFile}
                  accept="image/*"
                  className="hidden"
                />

                {formImageUrl ? (
                  <div className="relative rounded-[12px] overflow-hidden max-h-40 border border-gray-300 bg-white">
                    <img
                      src={formImageUrl}
                      alt="Aperçu"
                      className="w-full h-auto max-h-40 object-cover"
                    />
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isCompressingImage}
                    className="w-full flex items-center justify-center gap-2 p-2.5 rounded-[12px] bg-white border border-[#B43167]/30 hover:bg-[#FDF0F5] text-[#B43167] font-bold text-xs shadow-2xs transition active:scale-95 cursor-pointer"
                  >
                    <Camera className="w-4 h-4" />
                    <span>
                      {isCompressingImage ? 'Traitement image...' : 'Prendre ou importer une photo'}
                    </span>
                  </button>
                )}

                {/* Paste URL option */}
                <input
                  type="url"
                  value={formImageUrl.startsWith('data:') ? '' : formImageUrl}
                  onChange={(e) => setFormImageUrl(e.target.value)}
                  placeholder="Ou coller un lien direct d'image (https://...)"
                  className="w-full p-2 bg-white border border-gray-200 rounded-[10px] text-[11px] outline-none focus:border-[#B43167]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-700 mb-1">
                  Explications & Astuces *
                </label>
                <textarea
                  value={formContent}
                  onChange={(e) => setFormContent(e.target.value)}
                  placeholder="Expliquez la marche à suivre, la procédure pour la balance, la douchette, les codes..."
                  rows={4}
                  className="w-full p-2.5 border border-gray-200 rounded-[12px] text-xs outline-none focus:border-[#B43167] leading-relaxed"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => {
                    setIsModalOpen(false);
                    setEditingTip(null);
                  }}
                  className="px-3.5 py-1.5 rounded-[10px] border border-gray-200 font-bold text-gray-600 hover:bg-gray-50 cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isCompressingImage}
                  className="px-4 py-1.5 rounded-[10px] bg-[#B43167] text-white font-bold hover:bg-[#992655] shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{editingTip ? 'Enregistrer les modifications' : 'Publier le tuto'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Fullscreen Photo Viewer */}
      {previewImage && (
        <div
          onClick={() => setPreviewImage(null)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md cursor-pointer animate-in fade-in duration-150"
        >
          <div className="relative max-w-lg max-h-[85vh] overflow-hidden rounded-[18px]">
            <img
              src={previewImage}
              alt="Plein écran"
              className="w-full h-auto max-h-[85vh] object-contain rounded-[18px]"
            />
            <button
              type="button"
              onClick={() => setPreviewImage(null)}
              className="absolute top-3 right-3 p-2 bg-black/60 text-white rounded-full hover:bg-black/80 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* Interactive 3-Slide Tutorial Modal */}
      <AppTutorialModal
        isOpen={isTutorialOpen}
        onClose={() => setIsTutorialOpen(false)}
        onOpenSuggest={() => {
          setIsTutorialOpen(false);
          setActiveTab('suggest');
        }}
        onOpenTips={() => {
          setIsTutorialOpen(false);
        }}
      />
    </div>
  );
};

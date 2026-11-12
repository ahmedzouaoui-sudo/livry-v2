import React, { useState, useEffect } from 'react';
import {
  X,
  Save,
  Trash2,
  Image as ImageIcon,
  Barcode as BarcodeIcon,
  Tag,
  Scale,
  Building,
  AlertTriangle,
  Check,
  ExternalLink,
} from 'lucide-react';
import { Department, Product } from '../types';
import { useApp } from '../context/AppContext';
import { extractPureUnit } from '../utils/productWeight';
import { triggerHaptic } from '../utils/haptics';

interface ProductEditModalProps {
  isOpen: boolean;
  product: Product;
  onClose: () => void;
  onSaved?: (updated: Product) => void;
  onDeleted?: (productId: number) => void;
}

export const ProductEditModal: React.FC<ProductEditModalProps> = ({
  isOpen,
  product,
  onClose,
  onSaved,
  onDeleted,
}) => {
  const { updateProduct, deleteProduct, setSelectedProduct, showToast } = useApp();

  const [formData, setFormData] = useState<Product>({ ...product });
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [previewImgError, setPreviewImgError] = useState(false);

  useEffect(() => {
    if (product) {
      setFormData({
        ...product,
        quantite: product.quantite || extractPureUnit(product.name),
      });
      setPreviewImgError(false);
      setShowDeleteConfirm(false);
    }
  }, [product, isOpen]);

  if (!isOpen) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      showToast('⚠️ Le nom du produit est obligatoire');
      return;
    }

    try {
      setIsSaving(true);
      triggerHaptic('medium');

      // Cleaned object
      const cleanedProduct: Product = {
        ...formData,
        code: formData.code?.trim() || '-',
        name: formData.name.trim(),
        category: formData.category?.trim() || 'Général',
        imageUrl: formData.imageUrl?.trim() || undefined,
        barcodeMarjane: formData.barcodeMarjane?.trim() || undefined,
        barcodeP2: formData.barcodeP2?.trim() || undefined,
        barcodeInterne: formData.barcodeInterne?.trim() || undefined,
        barcodeMiniSecours: formData.barcodeMiniSecours?.trim() || undefined,
        barcodeSecours: formData.barcodeSecours?.trim() || undefined,
        barcodeP3: formData.barcodeP3?.trim() || undefined,
        quantite: formData.quantite || extractPureUnit(formData.name),
      };

      await updateProduct(cleanedProduct);
      setSelectedProduct(cleanedProduct);

      if (onSaved) {
        onSaved(cleanedProduct);
      }

      triggerHaptic('success');
      showToast(`✅ "${cleanedProduct.name}" mis à jour avec succès !`);
      onClose();
    } catch (err: any) {
      triggerHaptic('warning');
      showToast('❌ Erreur lors de la sauvegarde du produit');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      setIsDeleting(true);
      triggerHaptic('warning');
      await deleteProduct(formData.id);
      setSelectedProduct(null);
      if (onDeleted) {
        onDeleted(formData.id);
      }
      triggerHaptic('success');
      showToast(`🗑️ Article #${formData.id} supprimé.`);
      onClose();
    } catch (err) {
      showToast('❌ Erreur lors de la suppression');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-2xl max-h-[92vh] bg-white dark:bg-slate-900 rounded-[24px] shadow-2xl border border-gray-200 dark:border-slate-800 flex flex-col overflow-hidden text-gray-900 dark:text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 border-b border-gray-100 dark:border-slate-800 bg-gray-50/90 dark:bg-slate-800/80 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-[10px] bg-[#0759A4] flex items-center justify-center text-white font-black text-xs shadow-xs">
              #{formData.id}
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-black text-gray-900 dark:text-white leading-tight">
                Modifier l'article (Admin)
              </h3>
              <p className="text-[11px] text-gray-500 dark:text-slate-400">
                Modification directe avec synchronisation instantanée
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full text-gray-400 hover:text-gray-700 dark:hover:text-slate-200 hover:bg-gray-200 dark:hover:bg-slate-700 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {/* 1. Code court & Unité */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-black text-gray-700 dark:text-slate-300 mb-1">
                Code Article Court (ex: 5040, 2030)
              </label>
              <input
                type="text"
                value={formData.code || ''}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                placeholder="ex: 5040 ou - si inconnu"
                className="w-full px-3 py-2 rounded-[12px] bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-xs font-mono font-bold text-gray-900 dark:text-white focus:ring-2 focus:ring-[#0759A4] outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-black text-gray-700 dark:text-slate-300 mb-1">
                Unité Pure (quantite)
              </label>
              <select
                value={formData.quantite || 'pièce'}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    quantite: e.target.value as 'kg' | 'g' | 'pièce',
                  })
                }
                className="w-full px-3 py-2 rounded-[12px] bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-xs font-bold text-gray-900 dark:text-white focus:ring-2 focus:ring-[#0759A4] outline-none"
              >
                <option value="kg">kg (Kilogramme - balance)</option>
                <option value="g">g (Grammes)</option>
                <option value="pièce">pièce (À l'unité)</option>
              </select>
            </div>
          </div>

          {/* 2. Nom du produit */}
          <div>
            <label className="block text-xs font-black text-gray-700 dark:text-slate-300 mb-1">
              Nom complet du Produit *
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="ex: POMME GOLDEN EXTRA KG"
              className="w-full px-3 py-2 rounded-[12px] bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-xs font-bold text-gray-900 dark:text-white focus:ring-2 focus:ring-[#0759A4] outline-none"
            />
          </div>

          {/* 3. Rayon & Catégorie */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-black text-gray-700 dark:text-slate-300 mb-1">
                Département / Rayon
              </label>
              <select
                value={formData.department}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    department: e.target.value as Department,
                  })
                }
                className="w-full px-3 py-2 rounded-[12px] bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-xs font-bold text-gray-900 dark:text-white focus:ring-2 focus:ring-[#0759A4] outline-none"
              >
                <option value="Fruits et légumes">Fruits et légumes</option>
                <option value="Boucherie et volaille">Boucherie et volaille</option>
                <option value="Fromage et charcuterie">Fromage et charcuterie</option>
                <option value="Boulangerie et pâtisserie">Boulangerie et pâtisserie</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-black text-gray-700 dark:text-slate-300 mb-1">
                Catégorie (ex: Agrumes, Volaille, Pains)
              </label>
              <input
                type="text"
                value={formData.category || ''}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                placeholder="ex: Pommes et Poires"
                className="w-full px-3 py-2 rounded-[12px] bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-xs font-bold text-gray-900 dark:text-white focus:ring-2 focus:ring-[#0759A4] outline-none"
              />
            </div>
          </div>

          {/* 4. Photo du produit & Prévisualisation */}
          <div className="p-3 rounded-[16px] bg-gray-50 dark:bg-slate-800/60 border border-gray-200 dark:border-slate-700 space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-black text-gray-700 dark:text-slate-300">
                URL de l'image (Lien direct web ou CDN)
              </label>
              {formData.imageUrl && (
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, imageUrl: '' })}
                  className="text-[10px] text-red-600 hover:underline font-bold cursor-pointer"
                >
                  Effacer la photo
                </button>
              )}
            </div>

            <div className="flex items-center gap-3">
              <div className="relative w-14 h-14 rounded-[12px] bg-white border border-gray-200 dark:border-slate-700 shrink-0 overflow-hidden flex items-center justify-center p-1 shadow-2xs">
                {formData.imageUrl && !previewImgError ? (
                  <img
                    src={formData.imageUrl}
                    alt="Aperçu"
                    onError={() => setPreviewImgError(true)}
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <ImageIcon className="w-6 h-6 text-gray-300" />
                )}
              </div>

              <input
                type="text"
                value={formData.imageUrl || ''}
                onChange={(e) => {
                  setFormData({ ...formData, imageUrl: e.target.value });
                  setPreviewImgError(false);
                }}
                placeholder="https://... ou nom de fichier"
                className="flex-1 px-3 py-2 rounded-[10px] bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 text-xs font-mono text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-[#0759A4]"
              />
            </div>
          </div>

          {/* 5. Section Codes-Barres */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-black text-gray-900 dark:text-white">
                <BarcodeIcon className="w-4 h-4 text-[#0759A4]" />
                <span>Codes-barres de l'article</span>
              </div>
              <span className="text-[10px] text-gray-400 font-semibold">
                (Laissez vide si le code n'existe pas)
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {/* Marjane Principal */}
              <div>
                <label className="block text-[11px] font-bold text-gray-700 dark:text-slate-300 mb-0.5">
                  1. Marjane Principal (barcodeMarjane)
                </label>
                <input
                  type="text"
                  value={formData.barcodeMarjane || ''}
                  onChange={(e) => setFormData({ ...formData, barcodeMarjane: e.target.value })}
                  placeholder="ex: 2000014000000"
                  className="w-full px-2.5 py-1.5 rounded-[10px] bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-xs font-mono font-semibold"
                />
              </div>

              {/* Marjane 2 */}
              <div>
                <label className="block text-[11px] font-bold text-gray-700 dark:text-slate-300 mb-0.5">
                  2. Marjane 2 (barcodeP2)
                </label>
                <input
                  type="text"
                  value={formData.barcodeP2 || ''}
                  onChange={(e) => setFormData({ ...formData, barcodeP2: e.target.value })}
                  placeholder="Deuxième code Marjane"
                  className="w-full px-2.5 py-1.5 rounded-[10px] bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-xs font-mono font-semibold"
                />
              </div>

              {/* Marjane Interne */}
              <div>
                <label className="block text-[11px] font-bold text-gray-700 dark:text-slate-300 mb-0.5">
                  3. Marjane Interne (barcodeInterne)
                </label>
                <input
                  type="text"
                  value={formData.barcodeInterne || ''}
                  onChange={(e) => setFormData({ ...formData, barcodeInterne: e.target.value })}
                  placeholder="Code interne fixe"
                  className="w-full px-2.5 py-1.5 rounded-[10px] bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-xs font-mono font-semibold"
                />
              </div>

              {/* Marjane Mini */}
              <div>
                <label className="block text-[11px] font-bold text-gray-700 dark:text-slate-300 mb-0.5">
                  4. Marjane Mini (barcodeMiniSecours)
                </label>
                <input
                  type="text"
                  value={formData.barcodeMiniSecours || ''}
                  onChange={(e) => setFormData({ ...formData, barcodeMiniSecours: e.target.value })}
                  placeholder="Code mini secours"
                  className="w-full px-2.5 py-1.5 rounded-[10px] bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-xs font-mono font-semibold"
                />
              </div>

              {/* Marjane Sec */}
              <div>
                <label className="block text-[11px] font-bold text-gray-700 dark:text-slate-300 mb-0.5">
                  5. Marjane Sec (barcodeSecours)
                </label>
                <input
                  type="text"
                  value={formData.barcodeSecours || ''}
                  onChange={(e) => setFormData({ ...formData, barcodeSecours: e.target.value })}
                  placeholder="Code secours 1"
                  className="w-full px-2.5 py-1.5 rounded-[10px] bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-xs font-mono font-semibold"
                />
              </div>

              {/* Marjane Sec 2 */}
              <div>
                <label className="block text-[11px] font-bold text-gray-700 dark:text-slate-300 mb-0.5">
                  6. Marjane Sec 2 (barcodeP3)
                </label>
                <input
                  type="text"
                  value={formData.barcodeP3 || ''}
                  onChange={(e) => setFormData({ ...formData, barcodeP3: e.target.value })}
                  placeholder="Code secours 2"
                  className="w-full px-2.5 py-1.5 rounded-[10px] bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-xs font-mono font-semibold"
                />
              </div>
            </div>
          </div>

          {/* Delete Danger Zone */}
          <div className="pt-2 border-t border-gray-100 dark:border-slate-800">
            {!showDeleteConfirm ? (
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                className="flex items-center gap-1.5 text-xs text-red-600 hover:text-red-700 font-bold transition cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Supprimer cet article définitivement...</span>
              </button>
            ) : (
              <div className="p-3 rounded-[12px] bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 flex items-center justify-between gap-2">
                <span className="text-xs font-bold text-red-700 dark:text-red-300">
                  Confirmer la suppression de #{formData.id} ?
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowDeleteConfirm(false)}
                    className="px-2.5 py-1 rounded-[8px] bg-gray-200 text-gray-700 text-xs font-bold cursor-pointer"
                  >
                    Non
                  </button>
                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={isDeleting}
                    className="px-3 py-1 rounded-[8px] bg-red-600 text-white text-xs font-black cursor-pointer hover:bg-red-700 disabled:opacity-50"
                  >
                    {isDeleting ? 'Suppression...' : 'Oui, Supprimer'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </form>

        {/* Footer Actions */}
        <div className="px-4 sm:px-6 py-3 border-t border-gray-100 dark:border-slate-800 bg-gray-50/90 dark:bg-slate-800/80 flex items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-[12px] bg-gray-200 dark:bg-slate-700 text-gray-800 dark:text-slate-200 text-xs font-bold cursor-pointer hover:bg-gray-300 transition"
          >
            Annuler
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-2 px-5 py-2 rounded-[12px] bg-[#0759A4] hover:bg-blue-700 text-white text-xs font-black shadow-md active:scale-95 transition cursor-pointer disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{isSaving ? 'Enregistrement...' : 'Enregistrer les Modifications'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

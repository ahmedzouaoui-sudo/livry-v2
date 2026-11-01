import React, { useState, useMemo } from 'react';
import { ArrowLeft, Croissant, Apple, Beef, UtensilsCrossed, ChevronRight, Search, CheckCircle2 } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Department } from '../types';
import { DEPARTMENT_CONFIGS, filterProducts } from '../utils/productUtils';
import { ProductCard } from './ProductCard';

export const LibraryScreen: React.FC = () => {
  const { products, setActiveTab, setSelectedProduct } = useApp();
  const [selectedDept, setSelectedDept] = useState<Department | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [deptSearch, setDeptSearch] = useState('');

  const departmentsList: Department[] = [
    'Boulangerie et pâtisserie',
    'Fruits et légumes',
    'Boucherie et volaille',
    'Fromage et charcuterie',
  ];

  // Count products by department
  const countsByDept = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const d of departmentsList) {
      counts[d] = products.filter((p) => p.isEnabled && p.department === d).length;
    }
    return counts;
  }, [products]);

  // Categories in the selected department
  const categoriesInDept = useMemo(() => {
    if (!selectedDept) return [];
    const set = new Set<string>();
    products
      .filter((p) => p.isEnabled && p.department === selectedDept)
      .forEach((p) => {
        if (p.category) set.add(p.category);
      });
    return Array.from(set);
  }, [products, selectedDept]);

  // Filtered products inside selected department
  const deptProducts = useMemo(() => {
    if (!selectedDept) return [];
    return filterProducts(products, deptSearch, selectedDept, selectedCategory);
  }, [products, selectedDept, deptSearch, selectedCategory]);

  const getDeptIcon = (dept: Department, size = 'w-9 h-9') => {
    switch (dept) {
      case 'Boulangerie et pâtisserie':
        return <Croissant className={size} />;
      case 'Fruits et légumes':
        return <Apple className={size} />;
      case 'Boucherie et volaille':
        return <Beef className={size} />;
      case 'Fromage et charcuterie':
        return <UtensilsCrossed className={size} />;
    }
  };

  return (
    <div className="w-full max-w-xl mx-auto px-4 py-4 pb-24">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 mb-4 border-b border-gray-100">
        <button
          type="button"
          onClick={() => {
            if (selectedDept) {
              setSelectedDept(null);
              setSelectedCategory('ALL');
              setDeptSearch('');
            } else {
              setActiveTab('home');
            }
          }}
          className="flex items-center gap-2 text-xs font-bold text-gray-700 hover:text-[#B43167] active:scale-95 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{selectedDept ? 'Tous les Rayons' : 'Accueil'}</span>
        </button>

        <h1 className="text-base font-extrabold text-[#413960]">
          {selectedDept ? DEPARTMENT_CONFIGS[selectedDept].shortName : 'Bibliothèque des Rayons'}
        </h1>

        <div className="w-12" />
      </div>

      {/* Main 4-Department Grid View */}
      {!selectedDept ? (
        <div>
          <p className="text-xs text-gray-500 font-medium mb-4">
            Sélectionnez un rayon pour parcourir les fiches produits et codes-barres enregistrés :
          </p>

          <div className="grid grid-cols-2 gap-3.5">
            {departmentsList.map((dept) => {
              const cfg = DEPARTMENT_CONFIGS[dept];
              const count = countsByDept[dept] || 0;

              return (
                <div
                  key={dept}
                  onClick={() => {
                    setSelectedDept(dept);
                    setSelectedCategory('ALL');
                    setDeptSearch('');
                  }}
                  className="group relative flex flex-col justify-between p-4 rounded-3xl border border-transparent shadow-[0_4px_16px_rgba(0,0,0,0.04)] hover:shadow-lg transition-all duration-200 cursor-pointer active:scale-[0.98] min-h-[160px]"
                  style={{ backgroundColor: cfg.bgColor }}
                >
                  {/* Top: Icon */}
                  <div className="flex items-start justify-between">
                    <div
                      className="w-12 h-12 rounded-2xl bg-white shadow-xs flex items-center justify-center transition-transform group-hover:scale-110"
                      style={{ color: cfg.accentColor }}
                    >
                      {getDeptIcon(dept)}
                    </div>
                  </div>

                  {/* Bottom: Name & Action */}
                  <div className="mt-4">
                    <h3 className="text-sm font-extrabold text-gray-900 leading-tight">
                      {cfg.name}
                    </h3>
                    <div
                      className="flex items-center gap-1 text-[11px] font-bold mt-2 group-hover:translate-x-1 transition-transform"
                      style={{ color: cfg.accentColor }}
                    >
                      <span>Explorer</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* Department Shelf View */
        <div className="space-y-4">
          {/* Department Header Banner */}
          {(() => {
            const cfg = DEPARTMENT_CONFIGS[selectedDept];
            return (
              <div
                className="p-4 rounded-3xl flex items-center justify-between"
                style={{ backgroundColor: cfg.bgColor }}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-11 h-11 rounded-2xl bg-white shadow-xs flex items-center justify-center shrink-0"
                    style={{ color: cfg.accentColor }}
                  >
                    {getDeptIcon(selectedDept, 'w-6 h-6')}
                  </div>
                  <div>
                    <h2 className="text-base font-extrabold text-gray-900 leading-tight">
                      {cfg.name}
                    </h2>
                    <span className="text-xs font-semibold text-gray-600">
                      {deptProducts.length} produit{deptProducts.length > 1 ? 's' : ''} répertorié{deptProducts.length > 1 ? 's' : ''}
                    </span>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Search inside this department */}
          <div className="relative w-full shadow-2xs rounded-2xl bg-white border border-[#E0E0E6]/90">
            <div className="flex items-center h-11 px-3.5">
              <Search className="w-4 h-4 text-gray-400 shrink-0 mr-2" />
              <input
                type="text"
                value={deptSearch}
                onChange={(e) => setDeptSearch(e.target.value)}
                placeholder="Filtrer dans ce rayon..."
                className="w-full h-full bg-transparent border-none outline-none text-xs font-semibold text-gray-900 placeholder-gray-400"
              />
            </div>
          </div>

          {/* Subcategory Chips */}
          {categoriesInDept.length > 1 && (
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
              <button
                type="button"
                onClick={() => setSelectedCategory('ALL')}
                className={`px-3 py-1 rounded-full text-xs font-bold transition shrink-0 ${
                  selectedCategory === 'ALL'
                    ? 'bg-[#413960] text-white shadow-xs'
                    : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                Toutes ({countsByDept[selectedDept]})
              </button>
              {categoriesInDept.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1 rounded-full text-xs font-bold transition shrink-0 ${
                    selectedCategory === cat
                      ? 'bg-[#B43167] text-white shadow-xs'
                      : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          )}

          {/* Products in this department */}
          <div className="space-y-2.5 pt-1">
            {deptProducts.map((p) => (
              <ProductCard
                key={p.id}
                product={p}
                onClick={() => setSelectedProduct(p)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

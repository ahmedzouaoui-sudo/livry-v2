import React from 'react';
import { Database } from 'lucide-react';
import { Department } from '../types';
import { useApp } from '../context/AppContext';
import { triggerHaptic } from '../utils/haptics';

interface BibliothequeScreenProps {
  onBack?: () => void;
  onSelectDepartment: (dept: Department) => void;
}

export const BibliothequeScreen: React.FC<BibliothequeScreenProps> = ({
  onSelectDepartment,
}) => {
  const { role, setActiveTab } = useApp();

  const handleSelect = (dept: Department) => {
    triggerHaptic('light');
    onSelectDepartment(dept);
  };

  return (
    <div className="w-full max-w-[750px] mx-auto px-4 sm:px-6 py-4 sm:py-6 flex flex-col min-h-[calc(100dvh-70px)] justify-between">
      {/* Page Title */}
      <div className="flex items-center justify-center gap-3 mb-5 relative">
        <h1 className="font-extrabold text-gray-900 dark:text-white text-sm sm:text-base text-center truncate tracking-tight">
          Bibliothèque des Rayons
        </h1>

        {role === 'Admin' && (
          <button
            type="button"
            onClick={() => {
              triggerHaptic('light');
              setActiveTab('admin');
            }}
            className="absolute right-0 flex items-center gap-1.5 px-3 py-2 rounded-[13px] bg-blue-50 hover:bg-blue-100 text-[#0759A4] border border-blue-200 text-xs font-black transition-colors active:scale-95 cursor-pointer shadow-2xs select-none"
            title="Ouvrir le panneau Données & Base Supabase"
          >
            <Database className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Données</span>
            <span className="sm:hidden">Data</span>
          </button>
        )}
      </div>

      {/* 2 x 2 Balanced Fluid Grid without numbers */}
      <div className="flex-1 flex flex-col justify-center items-center my-auto py-3 w-full">
        <div className="grid grid-cols-2 gap-4 sm:gap-5 w-full max-w-[400px] sm:max-w-[440px] justify-items-center items-center">
          {/* 1. Boulangerie et pâtisserie */}
          <button
            type="button"
            onClick={() => handleSelect('Boulangerie et pâtisserie')}
            className="w-full aspect-square max-w-[192px] max-h-[192px] bg-[#F9A825]/92 backdrop-blur-sm rounded-[24px] p-4 sm:p-5 flex flex-col items-center justify-center text-center shadow-[0_10px_24px_rgba(249,168,37,0.24)] hover:scale-[1.02] active:scale-95 transition-transform duration-100 cursor-pointer select-none border border-white/45 ring-1 ring-inset ring-white/25 relative overflow-hidden group"
          >
            <div className="w-[66px] h-[66px] sm:w-[78px] sm:h-[78px] flex items-center justify-center shrink-0 mb-2.5">
              <img
                src="/assets/aistudio/boulangerie_5c55e301.png"
                alt="Boulangerie et pâtisserie"
                className="w-full h-full object-contain drop-shadow-xs"
                loading="eager"
                decoding="async"
              />
            </div>
            <span className="text-xs sm:text-sm font-black text-[#FFFFFF] leading-snug line-clamp-2 px-1">
              Boulangerie et pâtisserie
            </span>
          </button>

          {/* 2. Fruits et légumes */}
          <button
            type="button"
            onClick={() => handleSelect('Fruits et légumes')}
            className="w-full aspect-square max-w-[192px] max-h-[192px] bg-[#2E7D32]/92 backdrop-blur-sm rounded-[24px] p-4 sm:p-5 flex flex-col items-center justify-center text-center shadow-[0_10px_24px_rgba(46,125,50,0.24)] hover:scale-[1.02] active:scale-95 transition-transform duration-100 cursor-pointer select-none border border-white/40 ring-1 ring-inset ring-white/25 relative overflow-hidden group"
          >
            <div className="w-[66px] h-[66px] sm:w-[78px] sm:h-[78px] flex items-center justify-center shrink-0 mb-2.5">
              <img
                src="/assets/aistudio/marche_ce5915e1.png"
                alt="Fruits et légumes"
                className="w-full h-full object-contain drop-shadow-xs"
                loading="eager"
                decoding="async"
              />
            </div>
            <span className="text-xs sm:text-sm font-black text-[#FFFFFF] leading-snug line-clamp-2 px-1">
              Fruits et légumes
            </span>
          </button>

          {/* 3. Boucherie et volaille */}
          <button
            type="button"
            onClick={() => handleSelect('Boucherie et volaille')}
            className="w-full aspect-square max-w-[192px] max-h-[192px] bg-[#B93838]/92 backdrop-blur-sm rounded-[24px] p-4 sm:p-5 flex flex-col items-center justify-center text-center shadow-[0_10px_24px_rgba(185,56,56,0.24)] hover:scale-[1.02] active:scale-95 transition-transform duration-100 cursor-pointer select-none border border-white/40 ring-1 ring-inset ring-white/25 relative overflow-hidden group"
          >
            <div className="w-[66px] h-[66px] sm:w-[78px] sm:h-[78px] flex items-center justify-center shrink-0 mb-2.5">
              <img
                src="/assets/aistudio/stand_boucherie_bf941158.png"
                alt="Boucherie et volaille"
                className="w-full h-full object-contain drop-shadow-xs"
                loading="eager"
                decoding="async"
              />
            </div>
            <span className="text-xs sm:text-sm font-black text-[#FFFFFF] leading-snug line-clamp-2 px-1">
              Boucherie et volaille
            </span>
          </button>

          {/* 4. Fromage et charcuterie */}
          <button
            type="button"
            onClick={() => handleSelect('Fromage et charcuterie')}
            className="w-full aspect-square max-w-[192px] max-h-[192px] bg-[#FFF3CD]/90 backdrop-blur-sm rounded-[24px] p-4 sm:p-5 flex flex-col items-center justify-center text-center shadow-[0_10px_24px_rgba(30,25,24,0.12)] hover:scale-[1.02] active:scale-95 transition-transform duration-100 cursor-pointer select-none border-2 border-[#F6D878]/90 ring-1 ring-inset ring-white/60 relative overflow-hidden group"
          >
            <div className="w-[66px] h-[66px] sm:w-[78px] sm:h-[78px] flex items-center justify-center shrink-0 mb-2.5">
              <img
                src="/assets/aistudio/fromage_7269f926.png"
                alt="Fromage et charcuterie"
                className="w-full h-full object-contain drop-shadow-xs"
                loading="eager"
                decoding="async"
              />
            </div>
            <span className="text-xs sm:text-sm font-black text-[#0F172A] leading-snug line-clamp-2 px-1">
              Fromage et charcuterie
            </span>
          </button>
        </div>
      </div>

      <div className="py-3 text-center">
        <span className="text-[11px] text-gray-500 font-semibold">
          Toucher un rayon pour explorer les fiches et codes-barres
        </span>
      </div>
    </div>
  );
};

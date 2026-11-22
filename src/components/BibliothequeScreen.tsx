import React from 'react';
import { ArrowLeft, Database } from 'lucide-react';
import { Department } from '../types';
import { useApp } from '../context/AppContext';
import { triggerHaptic } from '../utils/haptics';

interface BibliothequeScreenProps {
  onBack: () => void;
  onSelectDepartment: (dept: Department) => void;
}

export const BibliothequeScreen: React.FC<BibliothequeScreenProps> = ({
  onBack,
  onSelectDepartment,
}) => {
  const { role, setActiveTab } = useApp();

  const handleSelect = (dept: Department) => {
    triggerHaptic('light');
    onSelectDepartment(dept);
  };

  return (
    <div className="w-full max-w-[750px] mx-auto px-3.5 sm:px-6 py-3 sm:py-5 flex flex-col min-h-[calc(100dvh-70px)] justify-between">
      {/* Back button at the top */}
      <div className="flex items-center justify-between gap-2 mb-3">
        <button
          type="button"
          onClick={() => {
            triggerHaptic('light');
            onBack();
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-[12px] text-gray-800 dark:text-slate-100 glass-surface hover:bg-white/90 dark:hover:bg-slate-800/80 active:scale-95 transition font-bold text-xs sm:text-sm cursor-pointer select-none"
          aria-label="Retour à l'accueil"
        >
          <ArrowLeft className="w-4 h-4 text-[#0759A4] dark:text-blue-400" />
          <span>Retour</span>
        </button>

        <h1 className="font-extrabold text-gray-900 dark:text-white text-sm sm:text-base text-center truncate tracking-tight">
          Bibliothèque des Rayons
        </h1>

        {role === 'Admin' ? (
          <button
            type="button"
            onClick={() => {
              triggerHaptic('light');
              setActiveTab('admin');
            }}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-[12px] bg-blue-50/80 dark:bg-blue-950/60 backdrop-blur-md hover:bg-blue-100/90 dark:hover:bg-blue-900/70 text-[#0759A4] dark:text-blue-300 border border-blue-200/80 dark:border-blue-800/70 text-xs font-black transition active:scale-95 cursor-pointer shadow-2xs select-none"
            title="Ouvrir le panneau Données & Base Supabase"
          >
            <Database className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Données</span>
            <span className="sm:hidden">Data</span>
          </button>
        ) : (
          <div className="w-10 sm:w-16" />
        )}
      </div>

      {/* 2 x 2 Balanced Fluid Grid without numbers */}
      <div className="flex-1 flex flex-col justify-center items-center my-auto py-2 w-full">
        <div className="grid grid-cols-2 gap-3.5 sm:gap-5 w-full max-w-[390px] sm:max-w-[420px] justify-items-center items-center">
          {/* 1. Boulangerie et pâtisserie */}
          <button
            type="button"
            onClick={() => handleSelect('Boulangerie et pâtisserie')}
            className="w-full aspect-square max-w-[185px] max-h-[185px] bg-[#F9A825]/92 backdrop-blur-md rounded-[24px] p-3 sm:p-4 flex flex-col items-center justify-center text-center shadow-[0_12px_28px_rgba(249,168,37,0.28)] hover:scale-[1.02] active:scale-95 transition-all cursor-pointer select-none border border-white/40 ring-1 ring-inset ring-white/30 relative overflow-hidden group"
          >
            <div className="w-[66px] h-[66px] sm:w-[78px] sm:h-[78px] flex items-center justify-center shrink-0 mb-2 group-hover:scale-108 transition-transform">
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
            className="w-full aspect-square max-w-[185px] max-h-[185px] bg-[#2E7D32]/92 backdrop-blur-md rounded-[24px] p-3 sm:p-4 flex flex-col items-center justify-center text-center shadow-[0_12px_28px_rgba(46,125,50,0.3)] hover:scale-[1.02] active:scale-95 transition-all cursor-pointer select-none border border-white/35 ring-1 ring-inset ring-white/25 relative overflow-hidden group"
          >
            <div className="w-[66px] h-[66px] sm:w-[78px] sm:h-[78px] flex items-center justify-center shrink-0 mb-2 group-hover:scale-108 transition-transform">
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
            className="w-full aspect-square max-w-[185px] max-h-[185px] bg-[#B93838]/92 backdrop-blur-md rounded-[24px] p-3 sm:p-4 flex flex-col items-center justify-center text-center shadow-[0_12px_28px_rgba(185,56,56,0.28)] hover:scale-[1.02] active:scale-95 transition-all cursor-pointer select-none border border-white/35 ring-1 ring-inset ring-white/25 relative overflow-hidden group"
          >
            <div className="w-[66px] h-[66px] sm:w-[78px] sm:h-[78px] flex items-center justify-center shrink-0 mb-2 group-hover:scale-108 transition-transform">
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
            className="w-full aspect-square max-w-[185px] max-h-[185px] bg-[#FFF3CD]/90 backdrop-blur-md rounded-[24px] p-3 sm:p-4 flex flex-col items-center justify-center text-center shadow-[0_12px_28px_rgba(30,25,24,0.12)] hover:scale-[1.02] active:scale-95 transition-all cursor-pointer select-none border-2 border-[#F6D878]/90 ring-1 ring-inset ring-white/60 relative overflow-hidden group"
          >
            <div className="w-[66px] h-[66px] sm:w-[78px] sm:h-[78px] flex items-center justify-center shrink-0 mb-2 group-hover:scale-108 transition-transform">
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

      <div className="py-2 text-center">
        <span className="text-[11px] text-gray-500 dark:text-slate-400 font-semibold">
          Toucher un rayon pour explorer les fiches et codes-barres
        </span>
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import { RefreshCw, AlertTriangle, Lock } from 'lucide-react';
import { CURRENT_APP_BUILD_ID, forceHardRefreshApp } from '../services/versionGuardService';

interface ForceUpdateOverlayProps {
  remoteBuildId?: string;
}

export const ForceUpdateOverlay: React.FC<ForceUpdateOverlayProps> = ({ remoteBuildId }) => {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    await forceHardRefreshApp();
  };

  return (
    <div
      className="fixed inset-0 z-[9999] bg-slate-950/95 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 select-none"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="force-update-title"
    >
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-[28px] shadow-2xl border-2 border-[#0759A4]/30 dark:border-blue-500/40 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Top Banner */}
        <div className="bg-gradient-to-r from-[#0759A4] via-[#0B6BC4] to-[#0759A4] px-6 py-5 text-white flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-[16px] bg-white p-1.5 shadow-md shrink-0 flex items-center justify-center">
            <img
              src="/assets/aistudio/icon_03400f86.png"
              alt="Finder Livry"
              className="w-full h-full object-contain"
            />
          </div>
          <div className="min-w-0 flex-1">
            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-amber-400/20 border border-amber-300/40 text-amber-200 text-[10px] font-black uppercase tracking-wider mb-1">
              <Lock className="w-3 h-3" />
              <span>Mise à jour obligatoire</span>
            </div>
            <h1 id="force-update-title" className="text-base sm:text-lg font-black leading-tight">
              Nouvelle version disponible
            </h1>
          </div>
        </div>

        {/* Body */}
        <div className="p-5 sm:p-6 space-y-4">
          <div className="p-3.5 rounded-[16px] bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800/80 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-1 text-left">
              <p className="text-xs font-extrabold text-amber-950 dark:text-amber-100 leading-relaxed">
                Cette version est obsolète. L&apos;application est bloquée pour éviter toute erreur de codes-barres.
              </p>
              <p className="text-xs font-bold text-amber-800 dark:text-amber-300 leading-relaxed">
                Had l&apos;version qdima! Berek 3la <span className="underline">Actualiser</span> bach t&apos;tle3 l&apos;version jdida w tkemmel l&apos;khedma.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between text-[11px] font-mono text-gray-500 dark:text-slate-400 bg-gray-50 dark:bg-slate-800/70 px-3 py-2 rounded-[12px] border border-gray-200 dark:border-slate-700">
            <span>Actuelle : {CURRENT_APP_BUILD_ID.slice(0, 16)}</span>
            {remoteBuildId && (
              <span className="text-emerald-700 dark:text-emerald-400 font-bold">
                Nouvelle : {remoteBuildId.slice(0, 16)}
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="w-full py-3.5 px-5 rounded-[16px] bg-[#0759A4] hover:bg-blue-700 active:scale-[0.98] disabled:opacity-75 text-white font-black text-sm shadow-lg shadow-blue-900/20 flex items-center justify-center gap-2.5 transition cursor-pointer"
          >
            <RefreshCw className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>
              {isRefreshing ? 'Chargement de la nouvelle version...' : 'Actualiser la page maintenant'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};

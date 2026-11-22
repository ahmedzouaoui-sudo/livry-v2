import React, { useState } from 'react';
import { Download, Share, PlusSquare, X } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  // If already running standalone or installed
  if (isInstalled) {
    return null;
  }

  if (isInstallable) {
    return (
      <button
        type="button"
        onClick={install}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-[11px] bg-[#0759A4] hover:bg-blue-700 text-white text-xs font-bold shadow-xs active:scale-95 transition cursor-pointer whitespace-nowrap"
        title="Installer Finder Livry sur votre écran d'accueil"
      >
        <Download className="w-3.5 h-3.5" />
        <span>Installer</span>
      </button>
    );
  }

  if (isIOS) {
    return (
      <>
        <button
          type="button"
          onClick={() => setShowIOSGuide(true)}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-[11px] glass-pill text-gray-800 dark:text-slate-100 text-xs font-semibold hover:bg-white/90 dark:hover:bg-slate-700 active:scale-95 transition cursor-pointer whitespace-nowrap"
          title="Installer sur iPhone / iPad"
        >
          <Download className="w-3.5 h-3.5 text-[#0759A4] dark:text-blue-400" />
          <span>Installer</span>
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4">
            <div className="w-full max-w-sm rounded-[22px] bg-white/88 dark:bg-[#0E1526]/88 backdrop-blur-2xl p-5 shadow-2xl border border-white/75 dark:border-white/15 text-gray-900 dark:text-slate-100">
              <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-slate-800">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-[10px] overflow-hidden bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 p-1">
                    <img src="/assets/aistudio/icon_03400f86.png" alt="Finder Livry" className="w-full h-full object-contain" />
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold text-gray-900 dark:text-white">Installer Finder Livry</h3>
                    <p className="text-[11px] text-gray-500 dark:text-slate-400">Pour iOS / Safari</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowIOSGuide(false)}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-800"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="my-4 space-y-2.5 text-xs text-gray-700 dark:text-slate-300">
                <div className="flex items-start gap-2.5 bg-gray-50 dark:bg-slate-800/80 p-3 rounded-[12px] border border-gray-200 dark:border-slate-700">
                  <Share className="w-4 h-4 text-[#0759A4] dark:text-blue-400 shrink-0 mt-0.5" />
                  <span>1. Appuyez sur le bouton <strong>Partager</strong> en bas de Safari.</span>
                </div>
                <div className="flex items-start gap-2.5 bg-gray-50 dark:bg-slate-800/80 p-3 rounded-[12px] border border-gray-200 dark:border-slate-700">
                  <PlusSquare className="w-4 h-4 text-[#0759A4] dark:text-blue-400 shrink-0 mt-0.5" />
                  <span>2. Faites défiler et choisissez <strong>Sur l&apos;écran d&apos;accueil</strong>.</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowIOSGuide(false)}
                className="w-full py-2.5 rounded-[12px] bg-[#0759A4] hover:bg-blue-700 text-white text-xs font-bold transition cursor-pointer"
              >
                Compris
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};

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
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-[#E23F5A] to-[#B43167] text-white text-xs font-bold shadow-sm hover:opacity-95 active:scale-95 transition"
        title="Installer Finder Livry sur votre écran d'accueil"
      >
        <Download className="w-3.5 h-3.5" />
        <span>Installer PWA</span>
      </button>
    );
  }

  if (isIOS) {
    return (
      <>
        <button
          type="button"
          onClick={() => setShowIOSGuide(true)}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-gray-200 bg-white text-gray-700 text-xs font-semibold hover:bg-gray-50 active:scale-95 transition"
          title="Installer sur iPhone / iPad"
        >
          <Download className="w-3.5 h-3.5 text-[#B43167]" />
          <span>Installer</span>
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
            <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl border border-gray-100">
              <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg overflow-hidden bg-white border border-gray-100 p-0.5">
                    <img src="/assets/aistudio/icon_03400f86.png" alt="Finder Livry" className="w-full h-full object-contain" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-[#413960]">Installer Finder Livry</h3>
                    <p className="text-[11px] text-gray-500">Pour iOS / Safari</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowIOSGuide(false)}
                  className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="my-4 space-y-3 text-xs text-gray-700">
                <div className="flex items-start gap-2.5 bg-gray-50 p-2.5 rounded-xl">
                  <Share className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                  <span>1. Appuyez sur le bouton <strong>Partager</strong> en bas de Safari.</span>
                </div>
                <div className="flex items-start gap-2.5 bg-gray-50 p-2.5 rounded-xl">
                  <PlusSquare className="w-4 h-4 text-[#B43167] shrink-0 mt-0.5" />
                  <span>2. Faites défiler et choisissez <strong>Sur l'écran d'accueil</strong>.</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowIOSGuide(false)}
                className="w-full py-2.5 rounded-xl bg-[#413960] text-white text-xs font-bold hover:bg-[#2e2844] transition"
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

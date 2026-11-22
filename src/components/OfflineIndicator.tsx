import React, { useState } from 'react';
import { WifiOff, RefreshCw, AlertTriangle } from 'lucide-react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { triggerHaptic } from '../utils/haptics';

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();
  const [isRetrying, setIsRetrying] = useState(false);

  if (isOnline) return null;

  const handleRetry = () => {
    triggerHaptic('medium');
    setIsRetrying(true);
    setTimeout(() => {
      setIsRetrying(false);
      if (navigator.onLine) {
        window.location.reload();
      }
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-100 bg-slate-950/88 backdrop-blur-2xl flex flex-col items-center justify-center p-5 text-center text-white select-none animate-in fade-in duration-200">
      <div className="w-full max-w-sm bg-slate-900/80 backdrop-blur-xl border border-white/15 rounded-[24px] p-6 sm:p-7 shadow-2xl flex flex-col items-center space-y-4">
        <div className="w-16 h-16 rounded-[18px] bg-red-500/15 border border-red-500/30 flex items-center justify-center text-red-400">
          <WifiOff className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <h2 className="text-lg font-black text-white">Connexion Internet Requise</h2>
          <p className="text-xs text-slate-300 leading-relaxed font-medium">
            L&apos;application Livry Finder nécessite une connexion Internet active pour fonctionner et synchroniser les données des magasins et préparateurs.
          </p>
        </div>

        <div className="w-full p-3 rounded-[12px] bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[11px] font-semibold flex items-center gap-2 text-left">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>Veuillez activer le Wi-Fi ou vos données mobiles 4G/5G.</span>
        </div>

        <button
          type="button"
          onClick={handleRetry}
          disabled={isRetrying}
          className="w-full py-3 px-4 rounded-[14px] bg-[#0759A4] hover:bg-blue-700 active:scale-[0.98] text-white font-black text-xs flex items-center justify-center gap-2 shadow-lg transition cursor-pointer select-none"
        >
          <RefreshCw className={`w-4 h-4 ${isRetrying ? 'animate-spin' : ''}`} />
          <span>{isRetrying ? 'Vérification en cours...' : 'Vérifier la connexion'}</span>
        </button>
      </div>
    </div>
  );
};

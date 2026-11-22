import React from 'react';
import { ThumbsUp, ThumbsDown, CheckCircle2, AlertTriangle, ShieldCheck } from 'lucide-react';
import { BarcodeVariant } from '../types';
import { BarcodeRenderer } from './BarcodeRenderer';
import { useApp } from '../context/AppContext';
import { triggerHaptic } from '../utils/haptics';

interface BarcodeCardProps {
  variant: BarcodeVariant;
  onCopySuccess?: (code: string) => void;
}

export const BarcodeCard: React.FC<BarcodeCardProps> = ({ variant, onCopySuccess }) => {
  const { voteBarcode } = useApp();

  const likes = variant.likes || 0;
  const dislikes = variant.dislikes || 0;
  const userVote = variant.userVote;
  const isApproved = variant.status === 'Valide' || (variant.isCommunityApproved ?? false) || likes >= 15;
  const canVote = variant.canVote ?? false;

  const handleVote = (type: 'like' | 'dislike') => {
    triggerHaptic(type === 'like' ? 'medium' : 'warning');
    voteBarcode(variant.code, type);
  };

  const likesNeeded = Math.max(0, 15 - likes);
  const dislikesRemaining = Math.max(0, 15 - dislikes);

  return (
    <div className="glass-surface rounded-2xl p-3 space-y-2.5 transition-colors">
      {/* Top Banner: Statut + Little Marjane Icon + Thumbs Like / Dislike buttons */}
      <div className="flex items-center justify-between gap-2 pb-2 border-b border-gray-100 dark:border-slate-800 flex-wrap">
        {/* Left: Status badge */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {(() => {
            const isMarjaneInterneOrMini =
              variant.type === 'marjane Interne' || variant.type === 'marjane mini';

            if (isMarjaneInterneOrMini) {
              return (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-black shadow-2xs transition-all bg-blue-50 dark:bg-blue-950/60 text-[#0759A4] dark:text-blue-300 ring-1 ring-blue-200 dark:ring-blue-800">
                  <div className="w-4 h-4 rounded-full bg-[#0759A4] flex items-center justify-center p-0.5 shrink-0">
                    <img
                      src="/assets/aistudio/psd_2219503b.png"
                      alt="Marjane"
                      className="w-3 h-3 object-contain"
                      loading="eager"
                    />
                  </div>
                  <span>Marjane</span>
                </span>
              );
            }

            if (isApproved) {
              return (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-black shadow-2xs transition-all bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 ring-1 ring-emerald-200 dark:ring-emerald-800">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>Valide</span>
                </span>
              );
            }

            return (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-black shadow-2xs transition-all bg-orange-50 dark:bg-amber-950/60 text-orange-700 dark:text-amber-400 ring-1 ring-orange-200 dark:ring-amber-800">
                <CheckCircle2 className="w-3.5 h-3.5 text-orange-600 dark:text-amber-400" />
                <span>Possible</span>
              </span>
            );
          })()}

          {likes >= 15 && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-extrabold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 tabular-nums">
              <ShieldCheck className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
              Certifié Marjane (+{likes})
            </span>
          )}
        </div>

        {/* Right: Like and Dislike buttons (ONLY on marjane 2, marjane sec, marjane sec 2) */}
        {canVote && (
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => handleVote('like')}
              title="Valider ce code (15 votes positifs convertissent le code en Marjane Valid)"
              aria-label="Voter pour ce code"
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-black transition-all cursor-pointer select-none active:scale-95 border min-h-[32px] tabular-nums ${
                userVote === 'like'
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                  : 'bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60'
              }`}
            >
              <ThumbsUp className={`w-3.5 h-3.5 ${userVote === 'like' ? 'fill-white' : ''}`} />
              <span className="font-mono">{likes}</span>
            </button>

            <button
              type="button"
              onClick={() => handleVote('dislike')}
              title="Signaler ce code erroné (15 signalements suppriment le code de l'app)"
              aria-label="Signaler ce code comme incorrect"
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-black transition-all cursor-pointer select-none active:scale-95 border min-h-[32px] tabular-nums ${
                userVote === 'dislike'
                  ? 'bg-red-600 text-white border-red-600 shadow-xs'
                  : 'bg-red-50 dark:bg-red-950/50 hover:bg-red-100 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800/60'
              }`}
            >
              <ThumbsDown className={`w-3.5 h-3.5 ${userVote === 'dislike' ? 'fill-white' : ''}`} />
              <span className="font-mono">{dislikes}</span>
            </button>
          </div>
        )}
      </div>

      {/* Barcode Graphic */}
      <BarcodeRenderer
        code={variant.code}
        format={variant.format}
        onCopy={() => onCopySuccess && onCopySuccess(variant.code)}
      />

      {/* Community Progress / Info Footer */}
      <div className="pt-1.5 border-t border-gray-100 dark:border-slate-800 flex items-center justify-between text-[10px] text-gray-500 dark:text-slate-400 font-semibold gap-2 flex-wrap">
        {!isApproved && likes < 15 ? (
          <span className="text-amber-700 dark:text-amber-300 flex items-center gap-1 tabular-nums">
            <span>En cours d'approbation :</span>
            <span className="font-bold text-emerald-700 dark:text-emerald-400">
              {likesNeeded} like{likesNeeded > 1 ? 's' : ''} restant{likesNeeded > 1 ? 's' : ''} pour Valide
            </span>
          </span>
        ) : (
          <span className="text-emerald-700 dark:text-emerald-400 font-bold flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
            Code certifié conforme pour le scan
          </span>
        )}

        {dislikes > 0 && (
          <span className="text-red-600 dark:text-red-400 flex items-center gap-1 tabular-nums">
            <AlertTriangle className="w-3 h-3 text-red-500" />
            <span>{dislikesRemaining} signalement{dislikesRemaining > 1 ? 's' : ''} avant suppression</span>
          </span>
        )}
      </div>
    </div>
  );
};

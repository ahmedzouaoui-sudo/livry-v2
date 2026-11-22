import React from 'react';
import { Minus, Plus } from 'lucide-react';
import { ProductUnitInfo } from '../utils/productWeight';
import { triggerHaptic } from '../utils/haptics';

interface QuantityCalculatorProps {
  unitInfo?: ProductUnitInfo;
  multiplier: number;
  onMultiplierChange: (val: number) => void;
  onReset?: () => void;
}

export const QuantityCalculator: React.FC<QuantityCalculatorProps> = ({
  multiplier,
  onMultiplierChange,
}) => {
  const handleStep = (delta: number) => {
    triggerHaptic('light');
    const next = Math.max(1, Math.min(99, multiplier + delta));
    onMultiplierChange(next);
  };

  return (
    <div className="w-full my-1 flex items-center justify-center">
      {/* Stepper with ONLY - digit + (widen container) */}
      <div className="flex items-center justify-between gap-4 bg-white/65 dark:bg-slate-800/65 backdrop-blur-md p-2 sm:p-3 rounded-2xl border border-white/75 dark:border-white/10 shadow-2xs w-full max-w-[460px]">
        <button
          type="button"
          onClick={() => handleStep(-1)}
          disabled={multiplier <= 1}
          className="w-13 h-13 sm:w-15 sm:h-15 rounded-xl flex items-center justify-center bg-white dark:bg-slate-700 hover:bg-gray-50 dark:hover:bg-slate-600 text-gray-800 dark:text-white border border-gray-200 dark:border-slate-600 active:scale-90 disabled:opacity-25 transition shadow-xs cursor-pointer select-none shrink-0"
          aria-label="Diminuer"
        >
          <Minus className="w-6 h-6 sm:w-7 sm:h-7" />
        </button>

        <div className="flex flex-col items-center justify-center flex-1 select-none text-center">
          <span className="text-3xl sm:text-4xl font-black text-gray-900 dark:text-white tracking-tight tabular-nums">
            {multiplier}
          </span>
          <span className="text-[11px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">
            Quantité / Poids (kg)
          </span>
        </div>

        <button
          type="button"
          onClick={() => handleStep(1)}
          disabled={multiplier >= 99}
          className="w-13 h-13 sm:w-15 sm:h-15 rounded-xl flex items-center justify-center bg-[#0759A4] hover:bg-blue-700 text-white active:scale-90 disabled:opacity-25 transition shadow-xs cursor-pointer select-none shrink-0"
          aria-label="Augmenter"
        >
          <Plus className="w-6 h-6 sm:w-7 sm:h-7" />
        </button>
      </div>
    </div>
  );
};

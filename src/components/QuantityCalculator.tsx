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
      <div className="flex items-center justify-between gap-4 bg-gray-50 dark:bg-slate-800/80 p-2 sm:p-3 rounded-[20px] border border-[#E0E0E6] dark:border-slate-700 shadow-2xs w-full max-w-[460px]">
        <button
          type="button"
          onClick={() => handleStep(-1)}
          disabled={multiplier <= 1}
          className="w-13 h-13 sm:w-15 sm:h-15 rounded-[16px] flex items-center justify-center text-white active:scale-90 disabled:opacity-25 transition shadow-xs cursor-pointer select-none shrink-0"
          style={{ backgroundColor: '#1E293B' }}
          aria-label="Diminuer"
        >
          <Minus className="w-6 h-6 sm:w-7 sm:h-7" />
        </button>

        <div className="flex flex-col items-center justify-center flex-1 select-none text-center">
          <span className="text-3xl sm:text-4xl font-black text-[#171717] dark:text-white tracking-tight tabular-nums">
            {multiplier}
          </span>
          <span className="text-[11px] font-bold text-gray-400 dark:text-slate-400 uppercase tracking-wider">
            Quantité / Poids (kg)
          </span>
        </div>

        <button
          type="button"
          onClick={() => handleStep(1)}
          disabled={multiplier >= 99}
          className="w-13 h-13 sm:w-15 sm:h-15 rounded-[16px] flex items-center justify-center text-white active:scale-90 disabled:opacity-25 transition shadow-xs cursor-pointer select-none shrink-0"
          style={{ backgroundColor: '#0759A4' }}
          aria-label="Augmenter"
        >
          <Plus className="w-6 h-6 sm:w-7 sm:h-7" />
        </button>
      </div>
    </div>
  );
};

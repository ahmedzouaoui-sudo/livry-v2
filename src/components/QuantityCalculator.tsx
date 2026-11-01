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
    <div className="w-full my-1.5 flex items-center justify-center">
      {/* Stepper with ONLY - digit + */}
      <div className="flex items-center justify-between gap-3 bg-white p-2 sm:p-2.5 rounded-[18px] border border-[#E0E0E6] shadow-2xs w-full max-w-[280px]">
        <button
          type="button"
          onClick={() => handleStep(-1)}
          disabled={multiplier <= 1}
          className="w-11 h-11 sm:w-12 sm:h-12 rounded-[14px] flex items-center justify-center text-white active:scale-90 disabled:opacity-25 transition shadow-xs cursor-pointer select-none shrink-0"
          style={{ backgroundColor: '#1E293B' }}
          aria-label="Diminuer"
        >
          <Minus className="w-5 h-5 sm:w-6 sm:h-6" />
        </button>

        <div className="flex items-center justify-center flex-1 select-none text-center">
          <span className="text-2xl sm:text-3xl font-black text-[#171717] tracking-tight tabular-nums">
            {multiplier}
          </span>
        </div>

        <button
          type="button"
          onClick={() => handleStep(1)}
          disabled={multiplier >= 99}
          className="w-11 h-11 sm:w-12 sm:h-12 rounded-[14px] flex items-center justify-center text-white active:scale-90 disabled:opacity-25 transition shadow-xs cursor-pointer select-none shrink-0"
          style={{ backgroundColor: '#0759A4' }}
          aria-label="Augmenter"
        >
          <Plus className="w-5 h-5 sm:w-6 sm:h-6" />
        </button>
      </div>
    </div>
  );
};

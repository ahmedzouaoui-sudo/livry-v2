import React, { useRef, useState } from 'react';
import { Copy, Check, Maximize2, Minimize2, Smartphone, ScanLine } from 'lucide-react';
import { encodeEan13, encodeEan8, formatBarcodeDigits } from '../utils/barcode';
import { triggerHaptic } from '../utils/haptics';
import { copyTextToClipboard } from '../utils/clipboard';

interface BarcodeRendererProps {
  code: string;
  format?: 'EAN-13' | 'EAN-8';
  height?: number;
  barWidth?: number;
  showText?: boolean;
  onCopy?: () => void;
  className?: string;
}

export const BarcodeRenderer: React.FC<BarcodeRendererProps> = ({
  code,
  format = code.length <= 8 ? 'EAN-8' : 'EAN-13',
  height = 95,
  barWidth = 2.4,
  showText = true,
  onCopy,
  className = '',
}) => {
  const [copied, setCopied] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Encode
  const isEan8 = format === 'EAN-8' || code.length === 8;
  const ean13Data = !isEan8 ? encodeEan13(code) : null;
  const ean8Data = isEan8 ? encodeEan8(code) : null;
  const modules = ean8Data ? ean8Data.modules : ean13Data!.modules;

  const quietZoneModules = 10;
  const totalModules = modules.length + quietZoneModules * 2;
  const svgWidth = totalModules * barWidth;
  const guardExtraHeight = 12;
  const standardBarHeight = height;
  const guardBarHeight = standardBarHeight + guardExtraHeight;
  const totalSvgHeight = guardBarHeight + (showText ? 28 : 6);

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    triggerHaptic('success');
    const ok = await copyTextToClipboard(code);
    if (ok) {
      setCopied(true);
      if (onCopy) onCopy();
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const toggleFullscreen = (e: React.MouseEvent) => {
    e.stopPropagation();
    triggerHaptic('medium');
    setIsFullscreen(!isFullscreen);
  };

  const formattedDigits = formatBarcodeDigits(code);

  const barcodeContent = (
    <div
      ref={containerRef}
      className={`relative flex flex-col items-center bg-white p-3 sm:p-4 rounded-[16px] border border-gray-200 shadow-inner select-none ${
        isFullscreen
          ? 'fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-white/98 backdrop-blur-md pb-safe'
          : ''
      } ${className}`}
    >
      {/* Top action buttons (right-aligned, no title) */}
      <div className="w-full flex justify-end items-center mb-1 px-0.5">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={toggleFullscreen}
            className="flex items-center gap-1 p-2 rounded-[10px] text-gray-500 hover:text-gray-900 hover:bg-gray-100 active:scale-95 transition cursor-pointer min-h-[36px]"
            title={isFullscreen ? 'Quitter plein écran' : 'Scanner plein écran (Caisse)'}
            aria-label="Plein écran"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            <span className="text-[11px] font-bold text-gray-500 hidden xs:inline">
              {isFullscreen ? 'Réduire' : 'Plein écran'}
            </span>
          </button>

          <button
            type="button"
            onClick={handleCopy}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[10px] text-xs font-bold transition active:scale-95 cursor-pointer min-h-[36px] ${
              copied
                ? 'bg-emerald-100 text-emerald-800'
                : 'bg-gray-100 hover:bg-gray-200 text-gray-800'
            }`}
            title="Copier le code-barres"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span>Copié !</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-gray-500" />
                <span>Copier</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* SVG Barcode Graphic - Fluid Responsive ViewBox */}
      <div className="w-full max-w-[340px] flex justify-center py-2 bg-white rounded-lg select-none overflow-hidden">
        <svg
          viewBox={`0 0 ${svgWidth} ${totalSvgHeight}`}
          className="w-full h-auto max-h-[140px] shape-rendering-crispEdges transition-transform"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* White Background for Quiet Zones */}
          <rect x="0" y="0" width={svgWidth} height={totalSvgHeight} fill="#FFFFFF" />

          {/* First Digit Outside for EAN-13 */}
          {!isEan8 && showText && ean13Data && (
            <text
              x={quietZoneModules * barWidth - 8}
              y={standardBarHeight + 20}
              fontSize="16"
              fontWeight="bold"
              fontFamily="monospace"
              fill="#111827"
              textAnchor="end"
            >
              {ean13Data.firstDigit}
            </text>
          )}

          {/* Module Bars */}
          {modules.map((m, idx) => {
            if (m.bit === '0') return null;
            const x = (quietZoneModules + idx) * barWidth;
            const barH = m.isGuard ? guardBarHeight : standardBarHeight;
            return (
              <rect
                key={idx}
                x={x}
                y={6}
                width={barWidth}
                height={barH}
                fill="#000000"
              />
            );
          })}

          {/* Bottom Human-Readable Text */}
          {showText && (
            <>
              {isEan8 && ean8Data ? (
                <>
                  <text
                    x={(quietZoneModules + 16) * barWidth}
                    y={standardBarHeight + 20}
                    fontSize="15"
                    fontWeight="bold"
                    fontFamily="monospace"
                    fill="#111827"
                    textAnchor="middle"
                  >
                    {ean8Data.leftText}
                  </text>
                  <text
                    x={(quietZoneModules + 48) * barWidth}
                    y={standardBarHeight + 20}
                    fontSize="15"
                    fontWeight="bold"
                    fontFamily="monospace"
                    fill="#111827"
                    textAnchor="middle"
                  >
                    {ean8Data.rightText}
                  </text>
                </>
              ) : ean13Data ? (
                <>
                  <text
                    x={(quietZoneModules + 24) * barWidth}
                    y={standardBarHeight + 20}
                    fontSize="15"
                    fontWeight="bold"
                    fontFamily="monospace"
                    fill="#111827"
                    textAnchor="middle"
                  >
                    {ean13Data.leftText}
                  </text>
                  <text
                    x={(quietZoneModules + 70) * barWidth}
                    y={standardBarHeight + 20}
                    fontSize="15"
                    fontWeight="bold"
                    fontFamily="monospace"
                    fill="#111827"
                    textAnchor="middle"
                  >
                    {ean13Data.rightText}
                  </text>
                </>
              ) : null}
            </>
          )}
        </svg>
      </div>

      {/* Formatted Full Monospace Code */}
      <div className="mt-2 text-center w-full">
        <span className="font-mono text-sm sm:text-base font-black tracking-widest text-gray-900 bg-gray-50 px-3 py-1 rounded-[10px] border border-gray-200 inline-block tabular-nums">
          {formattedDigits}
        </span>
      </div>

      {isFullscreen && (
        <div className="mt-5 flex flex-col items-center gap-2.5 max-w-md w-full text-center">
          <div className="flex flex-col items-center justify-center gap-1.5 w-full">
            <button
              type="button"
              onClick={handleCopy}
              className="animate-soft-blink inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-full bg-sky-100/90 hover:bg-sky-200/90 backdrop-blur-sm text-sky-900 border border-sky-300/80 shadow-2xs text-[11px] sm:text-xs font-extrabold tracking-tight cursor-pointer select-none active:scale-95 transition-colors max-w-full"
            >
              <span className="w-2 h-2 rounded-full bg-sky-500 shrink-0" aria-hidden="true" />
              {copied ? (
                <Check className="w-3.5 h-3.5 text-sky-600 shrink-0" />
              ) : (
                <Copy className="w-3.5 h-3.5 text-sky-600 shrink-0" />
              )}
              <span className="truncate">
                {copied ? 'Code-barres copié !' : 'Copie codebarre bach ikhdem 100%'}
              </span>
            </button>

            <button
              type="button"
              onClick={handleCopy}
              className="animate-soft-blink inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-full bg-purple-100/90 hover:bg-purple-200/90 backdrop-blur-sm text-purple-900 border border-purple-300/80 shadow-2xs text-[11px] sm:text-xs font-extrabold tracking-tight cursor-pointer select-none active:scale-95 transition-colors max-w-full"
            >
              <span className="w-2 h-2 rounded-full bg-purple-500 shrink-0" aria-hidden="true" />
              <ScanLine className="w-3.5 h-3.5 text-purple-600 shrink-0" />
              <span className="truncate">Ila scanniti o mazach copie codebarre</span>
            </button>
          </div>

          <div className="flex items-center gap-2 text-xs font-bold text-amber-900 bg-amber-50 px-4 py-2.5 rounded-[14px] border border-amber-200/90 shadow-2xs w-full justify-center">
            <Smartphone className="w-4 h-4 text-amber-600 shrink-0" />
            <span>Mettez la luminosité de votre téléphone au maximum pour faciliter le bip en caisse</span>
          </div>
          <button
            type="button"
            onClick={toggleFullscreen}
            className="w-full py-3 bg-[#0759A4] hover:bg-blue-700 text-white text-xs sm:text-sm font-bold rounded-[14px] shadow-md active:scale-95 transition cursor-pointer"
          >
            Fermer le plein écran
          </button>
        </div>
      )}
    </div>
  );

  return barcodeContent;
};

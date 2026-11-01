import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { X, Flashlight, RefreshCw, Camera, AlertCircle } from 'lucide-react';
import { triggerHaptic } from '../utils/haptics';

interface BarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanSuccess: (decodedBarcode: string) => void;
}

export const BarcodeScannerModal: React.FC<BarcodeScannerModalProps> = ({
  isOpen,
  onClose,
  onScanSuccess,
}) => {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [torchOn, setTorchOn] = useState(false);
  const [hasTorch, setHasTorch] = useState(false);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerId = 'interactive-barcode-scanner-viewport';
  const hasScannedRef = useRef(false);

  // Play a pleasant supermarket scanner beep
  const playBeep = useCallback(() => {
    try {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtxClass) {
        const audioCtx = new AudioCtxClass();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1760, audioCtx.currentTime); // A6 beep
        gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.12);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.12);
      }
    } catch {
      // AudioContext unavailable or blocked
    }
  }, []);

  const stopScanner = useCallback(async () => {
    if (scannerRef.current) {
      try {
        if (scannerRef.current.isScanning) {
          await scannerRef.current.stop();
        }
        await scannerRef.current.clear();
      } catch (err) {
        console.warn('Error stopping scanner:', err);
      } finally {
        scannerRef.current = null;
      }
    }
  }, []);

  const startScanner = useCallback(async () => {
    setIsInitializing(true);
    setErrorMessage(null);
    hasScannedRef.current = false;

    await stopScanner();

    try {
      const formatsToSupport = [
        Html5QrcodeSupportedFormats.EAN_13,
        Html5QrcodeSupportedFormats.EAN_8,
        Html5QrcodeSupportedFormats.CODE_128,
        Html5QrcodeSupportedFormats.UPC_A,
        Html5QrcodeSupportedFormats.UPC_E,
        Html5QrcodeSupportedFormats.CODE_39,
      ];

      const html5QrCode = new Html5Qrcode(containerId, {
        formatsToSupport,
        verbose: false,
      });
      scannerRef.current = html5QrCode;

      const config = {
        fps: 15,
        qrbox: { width: 280, height: 160 },
        aspectRatio: 1.0,
      };

      await html5QrCode.start(
        { facingMode },
        config,
        (decodedText: string) => {
          if (hasScannedRef.current) return;
          hasScannedRef.current = true;

          triggerHaptic('success');
          playBeep();

          // Extract digits if applicable or keep raw barcode text
          const cleanCode = decodedText.trim();
          onScanSuccess(cleanCode);
          onClose();
        },
        () => {
          // Ignore per-frame non-detection
        }
      );

      // Check torch capability
      try {
        const capabilities = html5QrCode.getRunningTrackCapabilities();
        if (capabilities && (capabilities as any).torch) {
          setHasTorch(true);
        } else {
          setHasTorch(false);
        }
      } catch {
        setHasTorch(false);
      }

      setIsInitializing(false);
    } catch (err: any) {
      console.error('Camera init error:', err);
      setIsInitializing(false);
      setErrorMessage(
        err?.message?.includes('Permission')
          ? 'Autorisation caméra refusée. Veuillez autoriser la caméra dans les paramètres.'
          : 'Impossible de démarrer la caméra. Vous pouvez saisir le code-barres manuellement.'
      );
    }
  }, [facingMode, onScanSuccess, onClose, playBeep, stopScanner]);

  useEffect(() => {
    if (isOpen) {
      // Delay slightly for container element to mount in DOM
      const timer = setTimeout(() => {
        startScanner();
      }, 150);
      return () => {
        clearTimeout(timer);
        stopScanner();
      };
    } else {
      stopScanner();
    }
  }, [isOpen, startScanner, stopScanner]);

  const toggleTorch = async () => {
    if (!scannerRef.current || !hasTorch) return;
    try {
      const nextState = !torchOn;
      await scannerRef.current.applyVideoConstraints({
        advanced: [{ torch: nextState } as any],
      });
      setTorchOn(nextState);
      triggerHaptic('light');
    } catch (err) {
      console.warn('Torch toggle error:', err);
    }
  };

  const flipCamera = () => {
    triggerHaptic('light');
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-[480px] bg-[#121216] border border-white/10 rounded-[24px] overflow-hidden shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-[#1A1A22] border-b border-white/10">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-[#0759A4]/30 border border-[#0759A4]/40 flex items-center justify-center text-[#3B82F6]">
              <Camera className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white leading-tight">
                Scanner le code-barres
              </h3>
              <p className="text-[10px] text-gray-400">
                Pointez la caméra vers le code-barres
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              triggerHaptic('light');
              onClose();
            }}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 text-gray-300 hover:text-white flex items-center justify-center cursor-pointer transition"
            aria-label="Fermer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Viewport Area */}
        <div className="relative w-full aspect-square max-h-[360px] bg-black overflow-hidden flex items-center justify-center">
          <div id={containerId} className="w-full h-full object-cover" />

          {/* Target Reticle Overlay */}
          {!errorMessage && (
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <div className="relative w-[280px] h-[150px] border-2 border-[#0759A4]/80 rounded-[16px] shadow-[0_0_0_9999px_rgba(0,0,0,0.45)]">
                {/* Corner Accents */}
                <span className="absolute -top-1 -left-1 w-4 h-4 border-t-3 border-l-3 border-emerald-400 rounded-tl-sm" />
                <span className="absolute -top-1 -right-1 w-4 h-4 border-t-3 border-r-3 border-emerald-400 rounded-tr-sm" />
                <span className="absolute -bottom-1 -left-1 w-4 h-4 border-b-3 border-l-3 border-emerald-400 rounded-bl-sm" />
                <span className="absolute -bottom-1 -right-1 w-4 h-4 border-b-3 border-r-3 border-emerald-400 rounded-br-sm" />

                {/* Animated Scan Line */}
                <div className="absolute inset-x-2 h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_8px_#34d399] animate-pulse top-1/2 -translate-y-1/2" />
              </div>
              <p className="text-white text-xs font-bold drop-shadow mt-3 bg-black/60 px-3 py-1 rounded-full">
                Placez le code-barres dans le cadre
              </p>
            </div>
          )}

          {/* Loading Indicator */}
          {isInitializing && !errorMessage && (
            <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center gap-2 z-10">
              <RefreshCw className="w-7 h-7 text-white animate-spin" />
              <span className="text-xs text-white/80 font-medium">
                Démarrage de la caméra...
              </span>
            </div>
          )}

          {/* Error Message */}
          {errorMessage && (
            <div className="absolute inset-0 bg-[#121216]/95 p-6 flex flex-col items-center justify-center text-center gap-3 z-10">
              <AlertCircle className="w-10 h-10 text-rose-400" />
              <p className="text-xs text-gray-200 font-medium max-w-[280px]">
                {errorMessage}
              </p>
              <button
                type="button"
                onClick={() => onClose()}
                className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition"
              >
                Passer à la saisie manuelle
              </button>
            </div>
          )}
        </div>

        {/* Bottom Toolbar Controls */}
        <div className="flex items-center justify-between px-4 py-3 bg-[#1A1A22] border-t border-white/10">
          <button
            type="button"
            onClick={flipCamera}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 text-white text-xs font-medium cursor-pointer transition"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Changer caméra</span>
          </button>

          {hasTorch && (
            <button
              type="button"
              onClick={toggleTorch}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium cursor-pointer transition active:scale-95 ${
                torchOn
                  ? 'bg-amber-400 text-black font-bold'
                  : 'bg-white/10 hover:bg-white/20 text-white'
              }`}
            >
              <Flashlight className="w-3.5 h-3.5" />
              <span>{torchOn ? 'Lampe allumée' : 'Lampe torche'}</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              triggerHaptic('light');
              onClose();
            }}
            className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 text-gray-300 text-xs font-medium cursor-pointer transition"
          >
            Annuler
          </button>
        </div>
      </div>
    </div>
  );
};

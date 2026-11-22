import React from 'react';
import { Product } from '../types';

export type VerificationStatus = 'none' | 'broken' | '50' | '100';

export function getProductVerificationStatus(
  product?: Pick<Product, 'verificationStatus' | 'isVerified100'> | null
): VerificationStatus {
  if (!product) return 'none';
  if (product.verificationStatus === '100') return '100';
  if (product.verificationStatus === '50') return '50';
  if (product.verificationStatus === 'broken') return 'broken';
  if (product.verificationStatus === 'none') return 'none';
  return product.isVerified100 ? '100' : 'none';
}

interface VerifiedIconImgProps {
  className?: string;
  title?: string;
  withLightHalo?: boolean;
}

/**
 * Shared 12-lobe scalloped verified seal path (exact same geometry across Blue 100%, Orange 50%, and Red Makhdamch).
 */
const SCALLOP_SEAL_PATH =
  'M 95.70 50.00 C 95.70 52.18 93.27 54.71 91.29 56.54 C 89.30 58.37 84.44 58.90 83.76 60.97 C 83.09 63.04 86.71 66.33 87.24 68.98 C 87.78 71.63 88.25 75.10 86.97 76.86 C 85.69 78.63 82.24 79.25 79.56 79.56 C 76.87 79.87 72.63 77.44 70.87 78.72 C 69.10 80.00 70.10 84.79 68.98 87.24 C 67.85 89.70 66.20 92.79 64.12 93.46 C 62.05 94.14 58.89 92.61 56.54 91.29 C 54.19 89.96 52.18 85.50 50.00 85.50 C 47.82 85.50 45.81 89.96 43.46 91.29 C 41.11 92.61 37.95 94.14 35.88 93.46 C 33.80 92.79 32.15 89.70 31.02 87.24 C 29.90 84.79 30.90 80.00 29.13 78.72 C 27.37 77.44 23.13 79.87 20.44 79.56 C 17.76 79.25 14.31 78.63 13.03 76.86 C 11.75 75.10 12.22 71.63 12.76 68.98 C 13.29 66.33 16.91 63.04 16.24 60.97 C 15.56 58.90 10.70 58.37 8.71 56.54 C 6.73 54.71 4.30 52.18 4.30 50.00 C 4.30 47.82 6.73 45.29 8.71 43.46 C 10.70 41.63 15.56 41.10 16.24 39.03 C 16.91 36.96 13.29 33.67 12.76 31.02 C 12.22 28.37 11.75 24.90 13.03 23.14 C 14.31 21.37 17.76 20.75 20.44 20.44 C 23.13 20.13 27.37 22.56 29.13 21.28 C 30.90 20.00 29.90 15.21 31.02 12.76 C 32.15 10.30 33.80 7.21 35.88 6.54 C 37.95 5.86 41.11 7.39 43.46 8.71 C 45.81 10.04 47.82 14.50 50.00 14.50 C 52.18 14.50 54.19 10.04 56.54 8.71 C 58.89 7.39 62.05 5.86 64.12 6.54 C 66.20 7.21 67.85 10.30 68.98 12.76 C 70.10 15.21 69.10 20.00 70.87 21.28 C 72.63 22.56 76.87 20.13 79.56 20.44 C 82.24 20.75 85.69 21.37 86.97 23.14 C 88.25 24.90 87.78 28.37 87.24 31.02 C 86.71 33.67 83.09 36.96 83.76 39.03 C 84.44 41.10 89.30 41.63 91.29 43.46 C 93.27 45.29 95.70 47.82 95.70 50.00 Z';

const haloClass = (withLightHalo: boolean) =>
  withLightHalo
    ? '[filter:drop-shadow(0_0_1.5px_rgba(255,255,255,0.95))_drop-shadow(0_1px_2px_rgba(0,0,0,0.28))]'
    : 'drop-shadow-xs';

export const VerifiedIconImg: React.FC<VerifiedIconImgProps> = ({
  className = 'w-4 h-4',
  title = 'Code-barres vérifié 100% khdam',
  withLightHalo = false,
}) => (
  <svg
    viewBox="0 0 100 100"
    role="img"
    aria-label="100% Khdam"
    className={`inline-block shrink-0 align-middle select-none ${haloClass(withLightHalo)} ${className}`}
  >
    <title>{title}</title>
    <path d={SCALLOP_SEAL_PATH} fill="#2B87FF" />
    <path
      d="M 32.5 52.5 L 44.5 64.5 L 68.5 38.5"
      fill="none"
      stroke="#FAF9F0"
      strokeWidth="11"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export const Verified50IconImg: React.FC<VerifiedIconImgProps> = ({
  className = 'w-4 h-4',
  title = 'Code-barres 50% khdam',
  withLightHalo = false,
}) => (
  <svg
    viewBox="0 0 100 100"
    role="img"
    aria-label="50% Khdam"
    className={`inline-block shrink-0 align-middle select-none ${haloClass(withLightHalo)} ${className}`}
  >
    <title>{title}</title>
    <path d={SCALLOP_SEAL_PATH} fill="#F97316" />
    <path
      d="M 32.5 52.5 L 44.5 64.5 L 68.5 38.5"
      fill="none"
      stroke="#FAF9F0"
      strokeWidth="11"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export const VerifiedBrokenIconImg: React.FC<VerifiedIconImgProps> = ({
  className = 'w-4 h-4',
  title = 'Makhdamch daba (Code-barres en panne)',
  withLightHalo = false,
}) => (
  <svg
    viewBox="0 0 100 100"
    role="img"
    aria-label="Makhdamch daba"
    className={`inline-block shrink-0 align-middle select-none ${haloClass(withLightHalo)} ${className}`}
  >
    <title>{title}</title>
    <path d={SCALLOP_SEAL_PATH} fill="#EF4444" />
    <path
      d="M 36 36 L 64 64 M 64 36 L 36 64"
      fill="none"
      stroke="#FAF9F0"
      strokeWidth="11"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

interface Verified100BadgeProps {
  variant?: 'card' | 'detail' | 'compact';
  status?: VerificationStatus;
}

export const Verified100Badge: React.FC<Verified100BadgeProps> = ({
  variant = 'card',
  status = '100',
}) => {
  if (status === 'none') return null;

  if (status === 'broken') {
    if (variant === 'detail') {
      return (
        <span
          className="inline-flex items-center gap-1.5 shrink-0 align-middle"
          title="Makhdamch daba (Ne fonctionne pas actuellement)"
        >
          <VerifiedBrokenIconImg className="w-6 h-6" title="Makhdamch daba" />
          <span className="px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-950/80 text-red-700 dark:text-red-300 border border-red-300 dark:border-red-700 text-[10px] font-black leading-none">
            Makhdamch daba
          </span>
        </span>
      );
    }

    return (
      <VerifiedBrokenIconImg
        className={variant === 'compact' ? 'w-4 h-4' : 'w-[18px] h-[18px]'}
        title="Makhdamch daba"
        withLightHalo
      />
    );
  }

  if (status === '50') {
    if (variant === 'detail') {
      return (
        <span className="inline-flex items-center gap-1.5 shrink-0 align-middle" title="Code-barres 50% khdam">
          <Verified50IconImg className="w-6 h-6" title="Code-barres 50% khdam" />
          <span className="px-2 py-0.5 rounded-full bg-orange-100 dark:bg-orange-950/80 text-orange-700 dark:text-orange-300 border border-orange-300 dark:border-orange-700 text-[10px] font-black leading-none">
            50%
          </span>
        </span>
      );
    }

    return (
      <Verified50IconImg
        className={variant === 'compact' ? 'w-4 h-4' : 'w-[18px] h-[18px]'}
        title="Code-barres 50% khdam"
        withLightHalo
      />
    );
  }

  if (variant === 'detail') {
    return (
      <span
        className="inline-flex items-center gap-1.5 shrink-0 align-middle"
        title="Code-barres vérifié et testé 100% khdam"
      >
        <VerifiedIconImg className="w-6 h-6" title="Code-barres vérifié et testé 100% khdam" />
        <span className="px-2 py-0.5 rounded-full bg-sky-100 dark:bg-sky-950/80 text-sky-700 dark:text-sky-300 border border-sky-300 dark:border-sky-700 text-[10px] font-black leading-none">
          100%
        </span>
      </span>
    );
  }

  return (
    <VerifiedIconImg
      className={variant === 'compact' ? 'w-4 h-4' : 'w-[18px] h-[18px]'}
      title="Code-barres vérifié 100% khdam"
      withLightHalo
    />
  );
};

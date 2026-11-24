/**
 * Compresses an uploaded image File into a lightweight raster JPEG data URI
 * safe for sanitizeImageUrl and cloud storage.
 */
export function compressImageFileToDataUrl(
  file: File,
  maxWidth = 900,
  quality = 0.78
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Impossible de lire le fichier image'));
    reader.onload = (event) => {
      const src = event.target?.result;
      if (typeof src !== 'string') {
        reject(new Error('Format image invalide'));
        return;
      }
      const img = new Image();
      img.onerror = () => reject(new Error('Image corrompue ou non supportée'));
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width || maxWidth;
        let height = img.height || maxWidth;
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Contexte graphique indisponible'));
          return;
        }
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.src = src;
    };
    reader.readAsDataURL(file);
  });
}

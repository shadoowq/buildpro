/**
 * Client-side image compression for localStorage-backed uploads.
 * Base64 inflates files by ~33% and the whole app shares a ~5MB quota,
 * so photos are downscaled and re-encoded before they are ever stored.
 */

export const IMAGE_MAX_DIMENSION = 1200;
export const IMAGE_JPEG_QUALITY = 0.8;

/** Downscales to IMAGE_MAX_DIMENSION on the long edge and re-encodes as JPEG. Rejects if the file can't be decoded. */
export function compressImageToDataUrl(file: File, maxDim = IMAGE_MAX_DIMENSION, quality = IMAGE_JPEG_QUALITY): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      try {
        const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
        const w = Math.max(1, Math.round(img.width * scale));
        const h = Math.max(1, Math.round(img.height * scale));
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) { reject(new Error('no-canvas')); return; }
        // JPEG has no alpha channel — paint white behind transparent PNGs instead of black
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, w, h);
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/jpeg', quality));
      } catch (e) { reject(e); }
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('decode-failed')); };
    img.src = url;
  });
}

/** Fallback: raw base64 read, used only when compression fails. */
export function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

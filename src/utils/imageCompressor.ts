/**
 * Utility to compress data URL images (e.g. from file inputs or canvas)
 * to prevent localStorage QuotaExceededError while retaining clear visual quality.
 */
export function compressImageDataUrl(
  dataUrl: string,
  maxWidth = 800,
  maxHeight = 800,
  quality = 0.7
): Promise<string> {
  return new Promise((resolve) => {
    // If it's already a web URL or empty/short data URL, return as is
    if (!dataUrl || !dataUrl.startsWith('data:image/') || dataUrl.length < 40000) {
      resolve(dataUrl);
      return;
    }

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      let width = img.width;
      let height = img.height;

      if (width > maxWidth || height > maxHeight) {
        if (width > height) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        } else {
          width = Math.round((width * maxHeight) / height);
          height = maxHeight;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(dataUrl);
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);
      // Export as JPEG with reasonable compression
      const compressed = canvas.toDataURL('image/jpeg', quality);
      resolve(compressed.length < dataUrl.length ? compressed : dataUrl);
    };

    img.onerror = () => {
      resolve(dataUrl);
    };

    img.src = dataUrl;
  });
}

export function compressImageFile(
  file: File,
  maxWidth = 800,
  maxHeight = 800,
  quality = 0.7
): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      const rawResult = e.target?.result as string;
      if (!rawResult) {
        resolve('');
        return;
      }
      const compressed = await compressImageDataUrl(rawResult, maxWidth, maxHeight, quality);
      resolve(compressed);
    };
    reader.onerror = () => resolve('');
    reader.readAsDataURL(file);
  });
}

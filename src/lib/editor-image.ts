import { blobToDataUrl } from './stage-drafts';

export const MAX_IMAGE_BYTES = 15 * 1024 * 1024;
export const MAX_IMAGE_EDGE = 1600;

export function fitImageDimensions(width: number, height: number, edge = MAX_IMAGE_EDGE) {
  if (width <= 0 || height <= 0) throw new Error('La imagen no tiene dimensiones válidas.');
  const scale = Math.min(1, edge / Math.max(width, height));
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
}

export async function prepareEditorImage(file: File): Promise<string> {
  if (!file.type.startsWith('image/')) throw new Error('Elegí una imagen JPG, PNG, WebP o una foto compatible.');
  if (file.size > MAX_IMAGE_BYTES) throw new Error('La imagen supera los 15 MB. Elegí una versión más pequeña.');
  const url = URL.createObjectURL(file);
  try {
    // Modern browsers apply the photo's EXIF orientation when decoding an img.
    const image = new Image();
    image.src = url;
    try { await image.decode(); } catch {
      throw new Error('El navegador no pudo abrir esa foto. Probá con una imagen JPG, PNG o WebP.');
    }
    const dimensions = fitImageDimensions(image.naturalWidth, image.naturalHeight);
    const canvas = document.createElement('canvas');
    canvas.width = dimensions.width;
    canvas.height = dimensions.height;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('No pudimos preparar la imagen en este dispositivo.');
    context.drawImage(image, 0, 0, dimensions.width, dimensions.height);
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((result) => result ? resolve(result) : reject(new Error('No se pudo preparar la foto.')), 'image/webp', 0.86);
    });
    return blobToDataUrl(blob);
  } finally {
    URL.revokeObjectURL(url);
  }
}

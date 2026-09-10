/**
 * Fotos adjuntas a una reseña — lado cliente.
 *
 * El formulario /review/{token} deja adjuntar hasta MAX_PHOTOS fotos por
 * producto. Antes de subir, cada foto se reduce en el navegador a
 * MAX_EDGE px de lado mayor y se re-encoda como JPEG: una foto de celular
 * (4000px, 3-6 MB, con EXIF/GPS) pasa a ~200-400 KB sin metadata. Así la
 * subida es rápida en 4G, entra cómoda en el límite de 4,5 MB de las
 * funciones de Vercel, y nunca mandamos la ubicación del cliente.
 *
 * Lo que sí decide el servidor (plugin hypestyle-reviews, HS_Reviews_Photos):
 * que el archivo sea una imagen real, el tope de 3 por reseña, y que la
 * foto pertenezca al mismo token que la reseña. Acá solo se evita mandar
 * cosas que van a ser rechazadas.
 */

export const MAX_PHOTOS = 3;
export const MAX_EDGE = 1600;
export const JPEG_QUALITY = 0.85;
/** Tope duro antes de intentar reducir: un archivo así no es una foto normal. */
export const MAX_INPUT_BYTES = 25 * 1024 * 1024;
/** Tope después de reducir — coincide con el proxy app/api/reviews/[token]/photos. */
export const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;

export const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic', 'image/heif'];

export type PhotoValidation = { ok: boolean; reason?: string };

/**
 * Chequeo previo, sin tocar el archivo. `type` puede venir vacío en algunos
 * Android para HEIC — ahí se deja pasar y decide el decodificador.
 */
export function validatePhotoFile(file: { type: string; size: number; name?: string }, currentCount: number): PhotoValidation {
  if (currentCount >= MAX_PHOTOS) {
    return { ok: false, reason: `Podés subir hasta ${MAX_PHOTOS} fotos por producto.` };
  }
  if (file.size <= 0) {
    return { ok: false, reason: 'El archivo está vacío.' };
  }
  if (file.size > MAX_INPUT_BYTES) {
    return { ok: false, reason: 'La foto es demasiado pesada.' };
  }
  const type = (file.type || '').toLowerCase();
  if (type && !type.startsWith('image/')) {
    return { ok: false, reason: 'Solo se pueden subir fotos.' };
  }
  if (type && !ACCEPTED_TYPES.includes(type)) {
    return { ok: false, reason: 'Formato no soportado. Probá con JPG, PNG o WEBP.' };
  }
  return { ok: true };
}

/**
 * Tamaño de salida para que el lado mayor no pase de `maxEdge`, sin agrandar.
 */
export function fitWithin(width: number, height: number, maxEdge: number = MAX_EDGE): { width: number; height: number } {
  if (width <= 0 || height <= 0) return { width: 0, height: 0 };
  const longest = Math.max(width, height);
  if (longest <= maxEdge) return { width, height };
  const scale = maxEdge / longest;
  return { width: Math.round(width * scale), height: Math.round(height * scale) };
}

/**
 * Reduce y re-encoda en el navegador. Si el navegador no puede decodificar
 * el archivo (HEIC en Chrome, por ejemplo), rechaza con un mensaje para el
 * usuario en vez de subir algo que el servidor va a tirar igual.
 */
export async function downscaleForUpload(file: File): Promise<File> {
  const bitmap = await decodeImage(file);
  try {
    const { width, height } = fitWithin(bitmap.width, bitmap.height);
    if (width === 0 || height === 0) {
      throw new Error('No pudimos leer esa foto.');
    }

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('No pudimos procesar la foto en este navegador.');
    // Fondo blanco: un PNG con transparencia no puede quedar negro al pasar a JPEG.
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(bitmap, 0, 0, width, height);

    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', JPEG_QUALITY));
    if (!blob) throw new Error('No pudimos procesar la foto.');
    if (blob.size > MAX_UPLOAD_BYTES) throw new Error('La foto sigue siendo demasiado pesada.');

    const base = (file.name || 'foto').replace(/\.[^.]+$/, '') || 'foto';
    return new File([blob], `${base}.jpg`, { type: 'image/jpeg' });
  } finally {
    if ('close' in bitmap && typeof (bitmap as ImageBitmap).close === 'function') (bitmap as ImageBitmap).close();
  }
}

async function decodeImage(file: File): Promise<ImageBitmap | HTMLImageElement> {
  // createImageBitmap respeta la orientación EXIF en los navegadores actuales;
  // el fallback con <img> también (CSS image-orientation: from-image por default).
  if (typeof createImageBitmap === 'function') {
    try {
      return await createImageBitmap(file);
    } catch {
      /* cae al fallback */
    }
  }
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('No pudimos leer esa foto. Probá con JPG o PNG.')); };
    img.src = url;
  });
}

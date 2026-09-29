import { ApiError } from './errors';
import { MAX_AUDIO_BYTES, MAX_IMAGE_BYTES, MAX_TEXT_LENGTH } from './validation';

export type MediaKind = 'image' | 'audio';
const imageTypes = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif']);
const audioTypes = new Set(['audio/webm', 'audio/ogg', 'audio/mp4', 'audio/mpeg', 'audio/wav', 'audio/x-wav', 'audio/aac']);

export function mediaUrl(id: string, kind: MediaKind, updatedAt: Date | string) {
  return `/api/stages/${encodeURIComponent(id)}/media/${kind}?v=${encodeURIComponent(new Date(updatedAt).toISOString())}`;
}

function base64Bytes(value: string) {
  const normalized = value.replace(/\s/g, '');
  if (!normalized || normalized.length % 4 === 1 || !/^[A-Za-z0-9+/]*={0,2}$/.test(normalized)) {
    throw new ApiError(415, 'El archivo no tiene un formato válido.', 'INVALID_MEDIA');
  }
  return Buffer.from(normalized, 'base64');
}

function sniff(bytes: Buffer): string | null {
  if (bytes.length < 4) return null;
  if (bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) return 'image/png';
  if (bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255) return 'image/jpeg';
  if (bytes.subarray(0, 3).toString() === 'GIF') return 'image/gif';
  if (bytes.subarray(0, 4).toString() === 'RIFF' && bytes.subarray(8, 12).toString() === 'WEBP') return 'image/webp';
  if (bytes.subarray(0, 4).toString() === 'RIFF' && bytes.subarray(8, 12).toString() === 'WAVE') return 'audio/wav';
  if (bytes.subarray(0, 4).toString() === 'OggS') return 'audio/ogg';
  if (bytes.subarray(0, 4).equals(Buffer.from([26, 69, 223, 163]))) return 'audio/webm';
  if (bytes.subarray(4, 8).toString() === 'ftyp') return /avif|avis/.test(bytes.subarray(8, 32).toString()) ? 'image/avif' : 'audio/mp4';
  if (bytes.subarray(0, 3).toString() === 'ID3' || (bytes[0] === 255 && (bytes[1] & 224) === 224)) return 'audio/mpeg';
  return null;
}

export function decodeMedia(value: string, kind: MediaKind, allowDemoSvg = false, validateUpload = false) {
  const data = /^data:([^;,]+)(?:;[^,]*)?;base64,([\s\S]+)$/i.exec(value);
  const bytes = base64Bytes(data ? data[2] : value);
  const declared = data?.[1].toLowerCase();
  const detected = sniff(bytes);
  const demoSvg = allowDemoSvg && kind === 'image' && declared === 'image/svg+xml';
  const contentType = demoSvg ? 'image/svg+xml' : detected || declared;
  const allowed = kind === 'image' ? imageTypes : audioTypes;
  if (!contentType || (!demoSvg && !allowed.has(contentType)) || (validateUpload && !detected)) {
    throw new ApiError(415, 'Ese formato no está disponible. Usá una imagen PNG, JPG o WebP, o una grabación compatible.', 'INVALID_MEDIA');
  }
  // Existing recordings may carry a historical or missing MIME type; detected bytes take priority.
  if (validateUpload && declared && !allowed.has(declared)) throw new ApiError(415, 'Ese formato no está permitido.', 'INVALID_MEDIA');
  return { bytes, contentType };
}

export function contentPatch(body: Record<string, unknown>, stage: { id: string; text: string | null; imageUrl: string | null; audioData: string | null }) {
  const patch: { text?: string | null; imageUrl?: string | null; audioData?: string | null } = {};
  if ('text' in body) {
    if (body.text !== null && (typeof body.text !== 'string' || body.text.length > MAX_TEXT_LENGTH)) {
      throw new ApiError(400, `El texto debe tener hasta ${MAX_TEXT_LENGTH.toLocaleString('es-AR')} caracteres.`, 'INVALID_TEXT');
    }
    patch.text = body.text as string | null;
  }
  for (const [field, kind, limit] of [['imageUrl', 'image', MAX_IMAGE_BYTES], ['audioData', 'audio', MAX_AUDIO_BYTES]] as const) {
    if (!(field in body)) continue;
    const value = body[field];
    if (value === null) { patch[field] = null; continue; }
    if (typeof value !== 'string') throw new ApiError(400, 'El archivo no tiene un formato válido.', 'INVALID_MEDIA');
    // A URL returned by this API means retain the stored legacy data. Never store our endpoint as the file itself.
    if (value.split('?')[0] === `/api/stages/${encodeURIComponent(stage.id)}/media/${kind}`) {
      if (!stage[field]) throw new ApiError(409, 'El archivo ya no está disponible. Volvé a abrir el capítulo.', 'MEDIA_CONFLICT');
      continue;
    }
    if (!value.startsWith('data:') || value.length > Math.ceil(limit * 4 / 3) + 256) {
      throw new ApiError(value.length > Math.ceil(limit * 4 / 3) + 256 ? 413 : 400, 'Subí un archivo válido dentro del tamaño permitido.', 'INVALID_MEDIA');
    }
    const decoded = decodeMedia(value, kind, false, true);
    if (decoded.bytes.length > limit) throw new ApiError(413, `El archivo supera el límite de ${limit / 1024 / 1024} MB.`, 'CONTENT_TOO_LARGE');
    patch[field] = value;
  }
  return patch;
}

export function parseRange(header: string | null, size: number) {
  if (!header) return null;
  const match = /^bytes=(\d*)-(\d*)$/.exec(header);
  if (!match || (!match[1] && !match[2])) throw new ApiError(416, 'Rango de audio no válido.', 'INVALID_RANGE');
  let start: number;
  let end: number;
  if (!match[1]) {
    const suffix = Number(match[2]);
    if (!Number.isSafeInteger(suffix) || suffix <= 0) throw new ApiError(416, 'Rango de audio no válido.', 'INVALID_RANGE');
    start = Math.max(0, size - suffix); end = size - 1;
  } else {
    start = Number(match[1]); end = match[2] ? Math.min(Number(match[2]), size - 1) : size - 1;
  }
  if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start < 0 || start >= size || end < start) throw new ApiError(416, 'Rango de audio no válido.', 'INVALID_RANGE');
  return { start, end };
}

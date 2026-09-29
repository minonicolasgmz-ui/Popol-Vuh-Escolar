import { ApiError } from './errors';

export const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
export const MAX_AUDIO_BYTES = 20 * 1024 * 1024;
export const MAX_TEXT_LENGTH = 100_000;
export const MAX_BODY_BYTES = Math.ceil((MAX_IMAGE_BYTES + MAX_AUDIO_BYTES) * 4 / 3) + 512_000;

export function checkOrigin(request: Request) {
  const origin = request.headers.get('origin');
  let foreignOrigin = false;
  if (origin) {
    try {
      const supplied = new URL(origin);
      // Next can normalize request.url to localhost while the browser uses 127.0.0.1.
      // Host is the browser's actual destination (forbidden for page JS to override).
      // Do not trust arbitrary X-Forwarded-Host values for this comparison.
      const destinationHost = request.headers.get('host') || new URL(request.url).host;
      foreignOrigin = supplied.origin !== origin || supplied.host.toLowerCase() !== destinationHost.toLowerCase()
        || !['http:', 'https:'].includes(supplied.protocol)
        || (process.env.NODE_ENV === 'production' && supplied.protocol !== 'https:');
    } catch { foreignOrigin = true; }
  }
  if (request.headers.get('sec-fetch-site') === 'cross-site' || foreignOrigin) {
    throw new ApiError(403, 'Esta solicitud no está permitida.', 'INVALID_ORIGIN');
  }
}

export async function readJson(request: Request, maxBytes = MAX_BODY_BYTES): Promise<Record<string, unknown>> {
  checkOrigin(request);
  if (!request.headers.get('content-type')?.toLowerCase().startsWith('application/json')) {
    throw new ApiError(415, 'Enviá la solicitud en formato JSON.', 'INVALID_CONTENT_TYPE');
  }
  const declaredLength = Number(request.headers.get('content-length'));
  if (declaredLength > maxBytes) throw new ApiError(413, 'El contenido es demasiado grande.', 'CONTENT_TOO_LARGE');
  if (!request.body) throw new ApiError(400, 'Faltan los datos de la solicitud.', 'INVALID_BODY');
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > maxBytes) {
      await reader.cancel();
      throw new ApiError(413, 'El contenido es demasiado grande.', 'CONTENT_TOO_LARGE');
    }
    chunks.push(value);
  }
  try {
    const body: unknown = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error();
    return body as Record<string, unknown>;
  } catch {
    throw new ApiError(400, 'La solicitud no tiene un formato válido.', 'INVALID_BODY');
  }
}

export function studentName(value: unknown) {
  if (typeof value !== 'string') throw new ApiError(400, 'Escribí los dos nombres.', 'INVALID_NAME');
  const name = value.trim().replace(/\s+/g, ' ');
  if (name.length < 1 || name.length > 80 || /[\u0000-\u001f\u007f]/.test(name)) {
    throw new ApiError(400, 'Cada nombre debe tener entre 1 y 80 caracteres.', 'INVALID_NAME');
  }
  return name;
}

export function expectedVersion(body: Record<string, unknown>) {
  if (typeof body.expectedUpdatedAt !== 'string' || !Number.isFinite(Date.parse(body.expectedUpdatedAt))) {
    throw new ApiError(400, 'Falta la versión del capítulo. Volvé a abrirlo antes de guardar.', 'VERSION_REQUIRED');
  }
  return new Date(body.expectedUpdatedAt);
}

export function assertVersion(actual: Date, expected: Date) {
  if (actual.getTime() !== expected.getTime()) {
    throw new ApiError(409, 'El capítulo cambió desde que lo abriste. Conservá tu borrador y revisá la versión guardada.', 'VERSION_CONFLICT');
  }
}

export function validId(value: string) {
  if (!/^[a-zA-Z0-9_-]{1,100}$/.test(value)) throw new ApiError(404, 'Capítulo no encontrado.', 'NOT_FOUND');
  return value;
}

import { createHash } from 'node:crypto';
import { NextRequest } from 'next/server';
import { requireSession } from '@/lib/server/auth';
import { isDemo } from '@/lib/server/config';
import { ApiError, apiError } from '@/lib/server/errors';
import { decodeMedia, parseRange } from '@/lib/server/media';
import { getMedia } from '@/lib/server/repository';
import { validId } from '@/lib/server/validation';

export const runtime = 'nodejs';
type Context = { params: Promise<{ id: string; kind: string }> };
async function serve(request: NextRequest, { params }: Context, head = false) {
  try {
    requireSession(request);
    const { id, kind } = await params;
    validId(id);
    if (kind !== 'image' && kind !== 'audio') throw new ApiError(404, 'Archivo no encontrado.', 'NOT_FOUND');
    const { value, updatedAt } = await getMedia(id, kind);
    if (!value) throw new ApiError(404, 'Todavía no hay un archivo para este capítulo.', 'NOT_FOUND');
    // Legacy HTTPS references stay readable without server-side network requests.
    if (value.startsWith('https://')) return new Response(null, { status: 307, headers: { Location: value, 'Cache-Control': 'private, no-store', 'Referrer-Policy': 'no-referrer' } });
    const { bytes, contentType } = decodeMedia(value, kind, isDemo());
    const etag = `"${createHash('sha256').update(`${id}:${kind}:${updatedAt.toISOString()}:${bytes.length}`).digest('hex').slice(0, 32)}"`;
    const headers: Record<string, string> = { 'Content-Type': contentType, 'X-Content-Type-Options': 'nosniff', 'Cache-Control': 'private, no-cache', Vary: 'Cookie', ETag: etag, 'Last-Modified': updatedAt.toUTCString(), 'Content-Security-Policy': "default-src 'none'; sandbox", 'Referrer-Policy': 'no-referrer' };
    if (request.headers.get('if-none-match') === etag) return new Response(null, { status: 304, headers });
    let range: ReturnType<typeof parseRange> = null;
    if (kind === 'audio') {
      headers['Accept-Ranges'] = 'bytes';
      const ifRange = request.headers.get('if-range');
      try { range = parseRange(!ifRange || ifRange === etag || ifRange === updatedAt.toUTCString() ? request.headers.get('range') : null, bytes.length); }
      catch (error) {
        if (error instanceof ApiError && error.status === 416) return new Response(null, { status: 416, headers: { ...headers, 'Content-Range': `bytes */${bytes.length}` } });
        throw error;
      }
    }
    const body = range ? bytes.subarray(range.start, range.end + 1) : bytes;
    headers['Content-Length'] = String(body.length);
    if (range) headers['Content-Range'] = `bytes ${range.start}-${range.end}/${bytes.length}`;
    return new Response(head ? null : new Uint8Array(body), { status: range ? 206 : 200, headers });
  } catch (error) { return apiError(error); }
}

export const GET = (request: NextRequest, context: Context) => serve(request, context);
export const HEAD = (request: NextRequest, context: Context) => serve(request, context, true);

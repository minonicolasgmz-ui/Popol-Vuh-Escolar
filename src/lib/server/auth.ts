import { createHmac, randomBytes, timingSafeEqual, createHash } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { ApiError } from './errors';
import { isDemo } from './config';

const COOKIE_NAME = 'popol_vuh_session';
type SessionPayload = { role: 'group' | 'admin'; groupId?: string; exp: number; demo: boolean };
const authGlobal = globalThis as typeof globalThis & { popolDemoSecret?: string; popolRateLimits?: Map<string, { count: number; expires: number }> };

function secret() {
  if (isDemo()) return authGlobal.popolDemoSecret ??= randomBytes(48).toString('hex');
  const value = process.env.SESSION_SECRET;
  if (!value || value.length < 32 || value.startsWith('REPLACE_')) throw new ApiError(503, 'La sesión aún no está configurada en el servidor.', 'CONFIGURATION_ERROR');
  return value;
}

export function assertSessionConfiguration() { secret(); }

export function issueSession(response: NextResponse, role: SessionPayload['role'], groupId?: string) {
  const maxAge = role === 'admin' ? 8 * 60 * 60 : 14 * 24 * 60 * 60;
  const payload: SessionPayload = { role, ...(groupId ? { groupId } : {}), exp: Math.floor(Date.now() / 1000) + maxAge, demo: isDemo() };
  const data = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = createHmac('sha256', secret()).update(data).digest('base64url');
  response.cookies.set(COOKIE_NAME, `${data}.${signature}`, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', path: '/', maxAge });
  return response;
}

export function clearSession(response: NextResponse) {
  response.cookies.set(COOKIE_NAME, '', { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', path: '/', maxAge: 0 });
  return response;
}

export function getSession(request: NextRequest): SessionPayload | null {
  const token = request.cookies.get(COOKIE_NAME)?.value;
  if (!token || token.length > 2048) return null;
  const [data, signature, extra] = token.split('.');
  if (!data || !signature || extra) return null;
  const signingKey = secret();
  try {
    const expected = createHmac('sha256', signingKey).update(data).digest();
    const actual = Buffer.from(signature, 'base64url');
    if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return null;
    const payload = JSON.parse(Buffer.from(data, 'base64url').toString('utf8')) as SessionPayload;
    if (!Number.isFinite(payload.exp) || payload.exp <= Date.now() / 1000 || payload.demo !== isDemo()) return null;
    if (payload.role !== 'admin' && payload.role !== 'group') return null;
    if (payload.role === 'group' && (typeof payload.groupId !== 'string' || !/^[a-zA-Z0-9_-]{1,100}$/.test(payload.groupId))) return null;
    return payload;
  } catch { return null; }
}

export function requireSession(request: NextRequest) {
  const session = getSession(request);
  if (!session) throw new ApiError(401, 'Ingresá con tu equipo para continuar.', 'SESSION_REQUIRED');
  return session;
}

export function requireAdmin(request: NextRequest) {
  const session = requireSession(request);
  if (session.role !== 'admin') throw new ApiError(403, 'Esta acción corresponde al docente.', 'ADMIN_REQUIRED');
  return session;
}

export function verifyAdminPassword(value: unknown) {
  const configured = process.env.ADMIN_PASSWORD;
  if (!configured || configured.length < 12 || configured.startsWith('REPLACE_')) throw new ApiError(503, 'El acceso docente aún no está configurado en el servidor.', 'CONFIGURATION_ERROR');
  if (typeof value !== 'string' || value.length > 512) return false;
  return timingSafeEqual(createHash('sha256').update(value).digest(), createHash('sha256').update(configured).digest());
}

// Defense in depth for one process. Use a shared edge/server limiter when deploying multiple instances.
export function rateLimit(request: NextRequest, scope: string, limit: number) {
  const entries = authGlobal.popolRateLimits ??= new Map();
  const now = Date.now();
  if (entries.size > 5000) for (const [key, value] of entries) if (value.expires < now) entries.delete(key);
  if (entries.size > 10000) throw new ApiError(429, 'Hay muchas solicitudes. Esperá unos minutos.', 'RATE_LIMIT');
  const address = request.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'local';
  const key = `${scope}:${address}`;
  const entry = entries.get(key);
  if (!entry || entry.expires < now) { entries.set(key, { count: 1, expires: now + 10 * 60 * 1000 }); return; }
  entry.count++;
  if (entry.count > limit) throw new ApiError(429, 'Hubo varios intentos. Esperá unos minutos antes de volver a intentar.', 'RATE_LIMIT');
}

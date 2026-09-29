import { NextRequest } from 'next/server';
import { issueSession, rateLimit, verifyAdminPassword } from '@/lib/server/auth';
import { isDemo } from '@/lib/server/config';
import { ApiError, apiError, json } from '@/lib/server/errors';
import { readJson } from '@/lib/server/validation';

export const runtime = 'nodejs';
export async function POST(request: NextRequest) {
  try {
    rateLimit(request, 'admin-login', 10);
    const body = await readJson(request, 4096);
    if (!verifyAdminPassword(body.password)) throw new ApiError(401, 'La contraseña no es correcta.', 'INVALID_CREDENTIALS');
    return issueSession(json({ group: null, isAdmin: true, demo: isDemo() }), 'admin');
  } catch (error) { return apiError(error); }
}

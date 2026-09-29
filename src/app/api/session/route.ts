import { NextRequest } from 'next/server';
import { clearSession, getSession } from '@/lib/server/auth';
import { isDemo } from '@/lib/server/config';
import { apiError, json } from '@/lib/server/errors';
import { findGroup } from '@/lib/server/repository';
import { checkOrigin } from '@/lib/server/validation';

export const runtime = 'nodejs';
export async function GET(request: NextRequest) {
  try {
    const session = getSession(request), demo = isDemo();
    if (!session) return clearSession(json({ group: null, isAdmin: false, demo }));
    if (session.role === 'admin') return json({ group: null, isAdmin: true, demo });
    const group = await findGroup(session.groupId!);
    if (!group) return clearSession(json({ group: null, isAdmin: false, demo }));
    return json({ group, isAdmin: false, demo });
  } catch (error) { return apiError(error); }
}

export async function DELETE(request: NextRequest) {
  try { checkOrigin(request); return clearSession(json({ group: null, isAdmin: false, demo: isDemo() })); }
  catch (error) { return apiError(error); }
}

import { NextRequest } from 'next/server';
import { assertSessionConfiguration, issueSession, rateLimit, requireAdmin } from '@/lib/server/auth';
import { apiError, json } from '@/lib/server/errors';
import { createGroup, listGroups } from '@/lib/server/repository';
import { readJson, studentName } from '@/lib/server/validation';

export const runtime = 'nodejs';
export async function GET(request: NextRequest) {
  try { requireAdmin(request); return json(await listGroups()); } catch (error) { return apiError(error); }
}
export async function POST(request: NextRequest) {
  try {
    assertSessionConfiguration();
    rateLimit(request, 'groups', 100);
    const body = await readJson(request, 4096);
    const group = await createGroup(studentName(body.student1), studentName(body.student2));
    return issueSession(json(group, 201), 'group', group.id);
  } catch (error) { return apiError(error); }
}

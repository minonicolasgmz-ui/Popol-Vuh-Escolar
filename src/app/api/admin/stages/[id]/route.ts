import { NextRequest } from 'next/server';
import { requireAdmin } from '@/lib/server/auth';
import { apiError, json } from '@/lib/server/errors';
import { updateStage } from '@/lib/server/repository';
import { expectedVersion, readJson, validId } from '@/lib/server/validation';

export const runtime = 'nodejs';
type Context = { params: Promise<{ id: string }> };
export async function PUT(request: NextRequest, { params }: Context) {
  try {
    const session = requireAdmin(request), body = await readJson(request);
    return json(await updateStage(validId((await params).id), expectedVersion(body), body, session));
  } catch (error) { return apiError(error); }
}
export async function DELETE(request: NextRequest, { params }: Context) {
  try {
    const session = requireAdmin(request), body = await readJson(request, 4096);
    return json(await updateStage(validId((await params).id), expectedVersion(body), body, session, true));
  } catch (error) { return apiError(error); }
}

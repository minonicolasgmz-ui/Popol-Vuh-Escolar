import { NextRequest } from 'next/server';
import { requireSession } from '@/lib/server/auth';
import { apiError, json } from '@/lib/server/errors';
import { getStage, presentStage, updateStage } from '@/lib/server/repository';
import { expectedVersion, readJson, validId } from '@/lib/server/validation';

export const runtime = 'nodejs';
type Context = { params: Promise<{ id: string }> };
export async function GET(request: NextRequest, { params }: Context) {
  try { requireSession(request); return json(presentStage(await getStage(validId((await params).id)))); }
  catch (error) { return apiError(error); }
}
export async function PUT(request: NextRequest, { params }: Context) {
  try {
    const session = requireSession(request);
    const id = validId((await params).id), body = await readJson(request);
    return json(await updateStage(id, expectedVersion(body), body, session));
  } catch (error) { return apiError(error); }
}

import { NextRequest } from 'next/server';
import { requireSession } from '@/lib/server/auth';
import { ApiError, apiError, json } from '@/lib/server/errors';
import { claimStage } from '@/lib/server/repository';
import { checkOrigin, validId } from '@/lib/server/validation';

export const runtime = 'nodejs';
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    checkOrigin(request);
    const session = requireSession(request);
    if (session.role !== 'group' || !session.groupId) throw new ApiError(403, 'Ingresá como equipo para elegir un capítulo.', 'GROUP_REQUIRED');
    // Client groupId is ignored: ownership comes only from the signed cookie.
    return json(await claimStage(validId((await params).id), session.groupId));
  } catch (error) { return apiError(error); }
}

import { NextRequest } from 'next/server';
import { requireSession } from '@/lib/server/auth';
import { apiError, json } from '@/lib/server/errors';
import { listStages } from '@/lib/server/repository';

export const runtime = 'nodejs';
export async function GET(request: NextRequest) {
  try {
    requireSession(request);
    return json(await listStages(request.nextUrl.searchParams.get('mode') === 'book'));
  } catch (error) { return apiError(error); }
}

import { NextRequest } from 'next/server';
import { requireAdmin } from '@/lib/server/auth';
import { apiError, json } from '@/lib/server/errors';
import { listStages } from '@/lib/server/repository';

export const runtime = 'nodejs';
export async function GET(request: NextRequest) {
  try { requireAdmin(request); return json(await listStages(true)); }
  catch (error) { return apiError(error); }
}

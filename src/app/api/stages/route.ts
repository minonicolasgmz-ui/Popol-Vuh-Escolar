import { NextRequest } from 'next/server';
import { requireSession } from '@/lib/server/auth';
import { apiError, json } from '@/lib/server/errors';
import { listStages } from '@/lib/server/repository';

export const runtime = 'nodejs';
export async function GET(request: NextRequest) {
  try {
    const book = request.nextUrl.searchParams.get('mode') === 'book';
    if (!book) requireSession(request);
    return json(await listStages(book));
  } catch (error) { return apiError(error); }
}

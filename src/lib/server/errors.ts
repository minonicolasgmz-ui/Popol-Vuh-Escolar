import { NextResponse } from 'next/server';

export class ApiError extends Error {
  constructor(public status: number, message: string, public code = 'REQUEST_FAILED') {
    super(message);
  }
}

export function apiError(error: unknown) {
  if (error instanceof ApiError) {
    return NextResponse.json({ error: error.message, code: error.code }, { status: error.status, headers: { 'Cache-Control': 'no-store' } });
  }
  // Never expose connection strings, database errors, uploaded data or credentials.
  console.error('[Popol Vuh API] Request failed', error instanceof Error ? error.name : 'UnknownError');
  return NextResponse.json({ error: 'No pudimos completar la operación. Intentá nuevamente.', code: 'SERVER_ERROR' }, { status: 500 });
}

export function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status, headers: { 'Cache-Control': 'no-store' } });
}

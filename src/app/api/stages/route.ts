import { db } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const stages = await db.stage.findMany({
      include: { group: true },
      orderBy: { number: 'asc' }
    });
    return NextResponse.json(stages);
  } catch {
    return NextResponse.json({ error: 'Error al obtener etapas' }, { status: 500 });
  }
}

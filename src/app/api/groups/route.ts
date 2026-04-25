import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  try {
    const groups = await db.group.findMany({
      include: { stages: true },
      orderBy: { createdAt: 'desc' }
    });
    return NextResponse.json(groups);
  } catch {
    return NextResponse.json({ error: 'Error al obtener grupos' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { student1, student2 } = await request.json();

    if (!student1?.trim() || !student2?.trim()) {
      return NextResponse.json({ error: 'Ambos nombres son requeridos' }, { status: 400 });
    }

    const group = await db.group.create({
      data: {
        student1: student1.trim(),
        student2: student2.trim()
      }
    });

    return NextResponse.json(group, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: 'Error al crear grupo: ' + error.message }, { status: 500 });
  }
}

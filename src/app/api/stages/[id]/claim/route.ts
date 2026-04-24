import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { groupId } = await request.json();

    if (!groupId) {
      return NextResponse.json({ error: 'groupId es requerido' }, { status: 400 });
    }

    // Check if stage is already claimed
    const existingStage = await db.stage.findUnique({
      where: { id },
      include: { group: true }
    });

    if (!existingStage) {
      return NextResponse.json({ error: 'Etapa no encontrada' }, { status: 404 });
    }

    if (existingStage.groupId) {
      return NextResponse.json(
        { error: 'Esta etapa ya fue elegida por otro grupo', stage: existingStage },
        { status: 409 }
      );
    }

    const stage = await db.stage.update({
      where: { id },
      data: { groupId },
      include: { group: true }
    });

    return NextResponse.json(stage);
  } catch {
    return NextResponse.json({ error: 'Error al reclamar etapa' }, { status: 500 });
  }
}

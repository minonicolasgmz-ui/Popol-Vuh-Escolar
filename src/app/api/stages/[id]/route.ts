import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { text, imageUrl, audioData } = body;

    const stage = await db.stage.update({
      where: { id },
      data: {
        ...(text !== undefined && { text }),
        ...(imageUrl !== undefined && { imageUrl }),
        ...(audioData !== undefined && { audioData }),
      },
      include: { group: true }
    });

    return NextResponse.json(stage);
  } catch {
    return NextResponse.json({ error: 'Error al actualizar etapa' }, { status: 500 });
  }
}

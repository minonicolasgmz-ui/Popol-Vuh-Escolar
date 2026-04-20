import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { text, imageUrl, audioData, student1, student2, groupId } = body;

    // If groupId is null, we're removing the group assignment
    const updateData: Record<string, unknown> = {};
    if (text !== undefined) updateData.text = text;
    if (imageUrl !== undefined) updateData.imageUrl = imageUrl;
    if (audioData !== undefined) updateData.audioData = audioData;
    if (groupId !== undefined) updateData.groupId = groupId;

    // If group names are being updated
    if ((student1 || student2) && groupId) {
      await db.group.update({
        where: { id: groupId },
        data: {
          ...(student1 && { student1 }),
          ...(student2 && { student2 }),
        }
      });
    }

    const stage = await db.stage.update({
      where: { id },
      data: updateData,
      include: { group: true }
    });

    return NextResponse.json(stage);
  } catch {
    return NextResponse.json({ error: 'Error al actualizar etapa' }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const stage = await db.stage.update({
      where: { id },
      data: {
        text: null,
        imageUrl: null,
        audioData: null,
        groupId: null,
      },
      include: { group: true }
    });

    return NextResponse.json(stage);
  } catch {
    return NextResponse.json({ error: 'Error al resetear etapa' }, { status: 500 });
  }
}

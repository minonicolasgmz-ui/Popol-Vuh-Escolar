import type { Prisma } from '@prisma/client';
import { isDemo } from './config';
import { createDemoGroup, demoState, type GroupRecord, type StageRecord } from './demo';
import { ApiError } from './errors';
import { contentPatch, mediaUrl, type MediaKind } from './media';
import { assertVersion, studentName } from './validation';

type FullStage = StageRecord & { group: GroupRecord | null };
type StageSummary = Omit<FullStage, 'imageUrl' | 'audioData'> & { hasText: boolean; hasImage: boolean; hasAudio: boolean; imageUrl?: string | null; audioData?: string | null };
const nextVersion = (previous: Date) => new Date(Math.max(Date.now(), previous.getTime() + 1));

async function database() {
  // Never even instantiate Prisma in demo mode; real data is isolated from fixtures.
  if (isDemo()) throw new ApiError(503, 'La demostración no utiliza la base de datos.', 'DEMO_ISOLATION');
  return (await import('@/lib/db')).db;
}

function withDemoGroup(stage: StageRecord): FullStage {
  return { ...stage, group: stage.groupId ? demoState().groups.get(stage.groupId) ?? null : null };
}

export function presentStage(stage: FullStage | StageSummary, includeText = true) {
  const hasText = 'hasText' in stage ? stage.hasText : Boolean(stage.text?.trim());
  const hasImage = 'hasImage' in stage ? stage.hasImage : Boolean(stage.imageUrl);
  const hasAudio = 'hasAudio' in stage ? stage.hasAudio : Boolean(stage.audioData);
  return { id: stage.id, number: stage.number, title: stage.title, description: stage.description,
    text: includeText ? stage.text : null,
    imageUrl: hasImage ? mediaUrl(stage.id, 'image', stage.updatedAt) : null,
    audioData: hasAudio ? mediaUrl(stage.id, 'audio', stage.updatedAt) : null,
    hasText, hasImage, hasAudio, groupId: stage.groupId, group: stage.group,
    createdAt: stage.createdAt, updatedAt: stage.updatedAt };
}

export async function findGroup(id: string) {
  return isDemo() ? demoState().groups.get(id) ?? null : (await database()).group.findUnique({ where: { id } });
}

export async function createGroup(student1: string, student2: string) {
  return isDemo() ? createDemoGroup(student1, student2) : (await database()).group.create({ data: { student1, student2 } });
}

export async function listStages(includeText = false) {
  if (isDemo()) return [...demoState().stages.values()].sort((a, b) => a.number - b.number).map(s => presentStage(withDemoGroup(s), includeText));
  const db = await database();
  const { Prisma } = await import('@prisma/client');
  // The grid does not fetch base64 blobs from PostgreSQL, and the book fetches text only.
  const rows = await db.$queryRaw<StageSummary[]>(Prisma.sql`
    SELECT s.id, s.number, s.title, s.description, ${includeText ? Prisma.sql`s.text` : Prisma.sql`NULL::text`} AS text,
      s."groupId", s."createdAt", s."updatedAt",
      (s.text IS NOT NULL AND LENGTH(TRIM(s.text)) > 0) AS "hasText",
      (s."imageUrl" IS NOT NULL AND LENGTH(s."imageUrl") > 0) AS "hasImage",
      (s."audioData" IS NOT NULL AND LENGTH(s."audioData") > 0) AS "hasAudio",
      CASE WHEN g.id IS NULL THEN NULL ELSE json_build_object('id', g.id, 'student1', g.student1, 'student2', g.student2, 'createdAt', g."createdAt") END AS "group"
    FROM "Stage" s LEFT JOIN "Group" g ON s."groupId" = g.id ORDER BY s.number ASC`);
  return rows.map(s => presentStage(s, includeText));
}

export async function listGroups() {
  if (isDemo()) return [...demoState().groups.values()].map(g => ({ ...g, stages: [...demoState().stages.values()].filter(s => s.groupId === g.id).map(s => presentStage(withDemoGroup(s), false)) }));
  const [groups, stages] = await Promise.all([(await database()).group.findMany({ orderBy: { createdAt: 'desc' } }), listStages()]);
  return groups.map(g => ({ ...g, stages: stages.filter(s => s.groupId === g.id) }));
}

export async function getStage(id: string): Promise<FullStage> {
  const stage = isDemo() ? (() => { const value = demoState().stages.get(id); return value ? withDemoGroup(value) : null; })()
    : await (await database()).stage.findUnique({ where: { id }, include: { group: true } });
  if (!stage) throw new ApiError(404, 'Capítulo no encontrado.', 'NOT_FOUND');
  return stage;
}

export async function getMedia(id: string, kind: MediaKind) {
  if (isDemo()) {
    const stage = await getStage(id);
    return { value: kind === 'image' ? stage.imageUrl : stage.audioData, updatedAt: stage.updatedAt };
  }
  const db = await database();
  const record = kind === 'image'
    ? await db.stage.findUnique({ where: { id }, select: { updatedAt: true, imageUrl: true } })
    : await db.stage.findUnique({ where: { id }, select: { updatedAt: true, audioData: true } });
  if (!record) throw new ApiError(404, 'Capítulo no encontrado.', 'NOT_FOUND');
  return { value: 'imageUrl' in record ? record.imageUrl : record.audioData, updatedAt: record.updatedAt };
}

async function serializable<T>(work: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
  const db = await database();
  for (let attempt = 0; attempt < 3; attempt++) {
    try { return await db.$transaction(work, { isolationLevel: 'Serializable' }); }
    catch (error) {
      const code = typeof error === 'object' && error && 'code' in error ? error.code : null;
      if (code !== 'P2034') throw error;
    }
  }
  throw new ApiError(409, 'Otro equipo está actualizando el capítulo. Actualizá la página e intentá nuevamente.', 'CONCURRENT_UPDATE');
}

export async function claimStage(id: string, groupId: string) {
  if (isDemo()) {
    const state = demoState(), stage = state.stages.get(id);
    if (!state.groups.has(groupId)) throw new ApiError(401, 'Tu equipo ya no está disponible. Volvé a ingresar.', 'SESSION_REQUIRED');
    if (!stage) throw new ApiError(404, 'Capítulo no encontrado.', 'NOT_FOUND');
    if (stage.groupId === groupId) return presentStage(withDemoGroup(stage));
    if (stage.groupId) throw new ApiError(409, 'Otro equipo ya eligió este capítulo.', 'CHAPTER_TAKEN');
    if ([...state.stages.values()].some(s => s.groupId === groupId)) throw new ApiError(409, 'Tu equipo ya tiene un capítulo. Continuá trabajando en él.', 'GROUP_HAS_CHAPTER');
    stage.groupId = groupId; stage.updatedAt = nextVersion(stage.updatedAt);
    return presentStage(withDemoGroup(stage));
  }
  return serializable(async tx => {
    if (!await tx.group.findUnique({ where: { id: groupId }, select: { id: true } })) throw new ApiError(401, 'Tu equipo ya no está disponible. Volvé a ingresar.', 'SESSION_REQUIRED');
    const stage = await tx.stage.findUnique({ where: { id }, include: { group: true } });
    if (!stage) throw new ApiError(404, 'Capítulo no encontrado.', 'NOT_FOUND');
    if (stage.groupId === groupId) return presentStage(stage);
    if (stage.groupId) throw new ApiError(409, 'Otro equipo ya eligió este capítulo.', 'CHAPTER_TAKEN');
    if (await tx.stage.findFirst({ where: { groupId }, select: { id: true } })) throw new ApiError(409, 'Tu equipo ya tiene un capítulo. Continuá trabajando en él.', 'GROUP_HAS_CHAPTER');
    const result = await tx.stage.updateMany({ where: { id, groupId: null }, data: { groupId, updatedAt: nextVersion(stage.updatedAt) } });
    if (result.count !== 1) throw new ApiError(409, 'Otro equipo ya eligió este capítulo.', 'CHAPTER_TAKEN');
    return presentStage((await tx.stage.findUnique({ where: { id }, include: { group: true } }))!);
  });
}

export async function updateStage(id: string, expected: Date, body: Record<string, unknown>, actor: { role: 'group' | 'admin'; groupId?: string }, reset = false) {
  function prepare(stage: FullStage) {
    if (actor.role === 'group' && stage.groupId !== actor.groupId) throw new ApiError(403, 'Solo pueden editar el capítulo de su equipo.', 'NOT_YOUR_CHAPTER');
    assertVersion(stage.updatedAt, expected);
    const patch = reset ? { text: null, imageUrl: null, audioData: null, groupId: null } : contentPatch(body, stage);
    return { ...patch, updatedAt: nextVersion(stage.updatedAt) } as Partial<StageRecord>;
  }
  function groupChanges(stage: StageRecord) {
    if (actor.role !== 'admin' || reset) return { groupId: reset ? null : stage.groupId, names: {} };
    const groupId = 'groupId' in body ? body.groupId : stage.groupId;
    if (groupId !== null && (typeof groupId !== 'string' || !/^[a-zA-Z0-9_-]{1,100}$/.test(groupId))) throw new ApiError(400, 'Equipo no válido.', 'INVALID_GROUP');
    const names = { ...('student1' in body ? { student1: studentName(body.student1) } : {}), ...('student2' in body ? { student2: studentName(body.student2) } : {}) };
    if (!groupId && Object.keys(names).length) throw new ApiError(400, 'Elegí un equipo antes de cambiar sus nombres.', 'INVALID_GROUP');
    return { groupId, names };
  }
  if (isDemo()) {
    const state = demoState(), stage = state.stages.get(id);
    if (!stage) throw new ApiError(404, 'Capítulo no encontrado.', 'NOT_FOUND');
    const patch = prepare(withDemoGroup(stage)), changes = groupChanges(stage);
    if (changes.groupId) {
      const group = state.groups.get(changes.groupId);
      if (!group) throw new ApiError(400, 'Equipo no encontrado.', 'INVALID_GROUP');
      if (changes.groupId !== stage.groupId && [...state.stages.values()].some(s => s.id !== id && s.groupId === changes.groupId)) throw new ApiError(409, 'El equipo ya tiene otro capítulo.', 'GROUP_HAS_CHAPTER');
      Object.assign(group, changes.names);
    }
    Object.assign(stage, patch, { groupId: changes.groupId });
    return presentStage(withDemoGroup(stage));
  }
  return serializable(async tx => {
    const stage = await tx.stage.findUnique({ where: { id }, include: { group: true } });
    if (!stage) throw new ApiError(404, 'Capítulo no encontrado.', 'NOT_FOUND');
    const patch = prepare(stage), changes = groupChanges(stage);
    if (changes.groupId) {
      if (!await tx.group.findUnique({ where: { id: changes.groupId }, select: { id: true } })) throw new ApiError(400, 'Equipo no encontrado.', 'INVALID_GROUP');
      if (changes.groupId !== stage.groupId && await tx.stage.findFirst({ where: { groupId: changes.groupId, id: { not: id } }, select: { id: true } })) throw new ApiError(409, 'El equipo ya tiene otro capítulo.', 'GROUP_HAS_CHAPTER');
      if (Object.keys(changes.names).length) await tx.group.update({ where: { id: changes.groupId }, data: changes.names });
    }
    const updated = await tx.stage.updateMany({ where: { id, updatedAt: expected, ...(actor.role === 'group' ? { groupId: actor.groupId } : {}) }, data: { ...patch, groupId: changes.groupId } });
    if (updated.count !== 1) throw new ApiError(409, 'El capítulo cambió. Conservá tu borrador y volvé a abrirlo.', 'VERSION_CONFLICT');
    return presentStage((await tx.stage.findUnique({ where: { id }, include: { group: true } }))!);
  });
}

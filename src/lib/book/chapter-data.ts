import type { BookChapter } from './types';

interface StageLike {
  id: string; number: number; title: string; text: string | null;
  imageUrl: string | null; audioData: string | null; audioUrl?: string | null;
  hasText?: boolean; hasImage?: boolean; hasAudio?: boolean; updatedAt: string;
  group: { student1: string; student2: string } | null;
}

export function toBookChapter(stage: StageLike): BookChapter {
  const audio = stage.audioUrl || stage.audioData;
  return {
    id: stage.id, number: stage.number, title: stage.title, text: stage.text ?? '',
    imageUrl: stage.imageUrl,
    audioUrl: audio ? (/^(data:|https?:|\/|blob:)/.test(audio) ? audio : `data:audio/webm;base64,${audio}`) : null,
    authors: stage.group ? `${stage.group.student1} y ${stage.group.student2}` : '',
    version: stage.updatedAt,
    hasText: stage.hasText ?? Boolean(stage.text?.trim()),
    hasImage: stage.hasImage ?? Boolean(stage.imageUrl),
    hasAudio: stage.hasAudio ?? Boolean(audio),
  };
}

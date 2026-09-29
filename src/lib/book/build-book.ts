import { paginateText } from './paginate';
import type { BookChapter, BookPage, PageMeasurer } from './types';

export function hasContribution(chapter: BookChapter) {
  return chapter.hasText || chapter.hasImage || chapter.hasAudio;
}

/** showCover starts with [0], then [1,2], [3,4]… and a final singleton.
 * One courtesy face, only when necessary, keeps the back cover independent. */
export function buildBook(chapters: BookChapter[], fits: PageMeasurer): BookPage[] {
  const contributed = chapters.filter(hasContribution).sort((a, b) => a.number - b.number);
  const pages: BookPage[] = [
    { id: 'cover', kind: 'cover', anchor: { kind: 'cover' } },
    { id: 'title', kind: 'title', anchor: { kind: 'contents' } },
  ];
  // A short printed contents is an editorial preview; the full accessible index
  // stays outside the engine and includes pending chapters too.
  if (contributed.length) pages.push({ id: 'contents', kind: 'contents', anchor: { kind: 'contents' }, entries: contributed.slice(0, 8) });
  for (const chapter of contributed) {
    const fragments = paginateText(chapter, fits);
    fragments.forEach((fragment, index) => pages.push({
      id: `${chapter.id}:text:${fragment.start}`,
      kind: index === 0 ? 'chapter' : 'continuation',
      anchor: { kind: 'text', chapterId: chapter.id, offset: fragment.start },
      chapterId: chapter.id,
      ...fragment,
    }));
    if (chapter.hasImage) pages.push({
      id: `${chapter.id}:image`, kind: 'image',
      chapterId: chapter.id, anchor: { kind: 'image', chapterId: chapter.id },
    });
  }
  pages.push({ id: 'credits', kind: 'credits', anchor: { kind: 'credits' }, entries: contributed });
  if (pages.length % 2 === 0) pages.push({ id: 'courtesy', kind: 'courtesy', anchor: { kind: 'credits' } });
  pages.push({ id: 'back', kind: 'back', anchor: { kind: 'back' } });
  return pages.map((page, index) => ({ ...page, folio: index > 0 && index < pages.length - 1 ? index : undefined }));
}

export function visiblePageIndices(index: number, count: number, spread: boolean): number[] {
  if (!spread || index === 0 || index === count - 1) return [index];
  const left = index % 2 === 1 ? index : index - 1;
  return [left, left + 1].filter((value) => value < count);
}

export function adjacentPageIndex(index: number, count: number, spread: boolean, direction: 1 | -1): number {
  if (!spread) return Math.max(0, Math.min(count - 1, index + direction));
  const visible = visiblePageIndices(index, count, true);
  if (direction > 0) return Math.min(count - 1, visible[visible.length - 1] + 1);
  return Math.max(0, visible[0] - 2);
}

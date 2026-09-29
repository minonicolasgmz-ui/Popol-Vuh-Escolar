import type { BookAnchor, BookPage } from './types';

export function findAnchorPage(pages: BookPage[], anchor: BookAnchor): number {
  if (anchor.kind === 'text') {
    const candidates = pages.map((page, index) => ({ page, index })).filter(({ page }) => page.chapterId === anchor.chapterId && page.start !== undefined);
    return candidates.find(({ page }) => anchor.offset >= page.start! && anchor.offset < (page.end ?? page.start! + 1))?.index
      ?? candidates[candidates.length - 1]?.index ?? 2;
  }
  if (anchor.kind === 'image') {
    return Math.max(0, pages.findIndex((page) => page.kind === 'image' && page.chapterId === anchor.chapterId));
  }
  return Math.max(0, pages.findIndex((page) => page.anchor.kind === anchor.kind));
}

export interface SavedReadingPosition { anchor: BookAnchor; fontSize: number; version: string }
const KEY = 'popol-vuh-reading-position-v2';

export function loadReadingPosition(): SavedReadingPosition | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const saved = JSON.parse(raw) as SavedReadingPosition;
    if (!saved.anchor || !['cover', 'contents', 'credits', 'back', 'text', 'image'].includes(saved.anchor.kind)) return null;
    if (saved.anchor.kind === 'text' && (!Number.isFinite(saved.anchor.offset) || typeof saved.anchor.chapterId !== 'string')) return null;
    if (saved.anchor.kind === 'image' && typeof saved.anchor.chapterId !== 'string') return null;
    return { ...saved, fontSize: [17, 19, 21].includes(saved.fontSize) ? saved.fontSize : 17 };
  } catch { return null; }
}

export function saveReadingPosition(position: SavedReadingPosition) {
  try { localStorage.setItem(KEY, JSON.stringify(position)); } catch { /* Reading remains available if storage is full. */ }
}

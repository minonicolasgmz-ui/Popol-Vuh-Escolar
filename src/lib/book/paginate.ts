import type { BookChapter, BookLayout, PageMeasurer, TextFragment } from './types';

export class BookLayoutError extends Error {}

/** The slices retain every original UTF-16 position, including whitespace. */
export function paginateText(chapter: BookChapter, fits: PageMeasurer): TextFragment[] {
  const original = chapter.text;
  if (!original.length) return [{ text: '', start: 0, end: 0 }];
  const boundaries = [0];
  for (const token of original.matchAll(/\s+|\S+/gu)) {
    boundaries.push(token.index! + token[0].length);
  }
  const fragments: TextFragment[] = [];
  let start = 0;
  while (start < original.length) {
    const first = fragments.length === 0;
    let low = boundaries.findIndex((end) => end > start);
    let high = boundaries.length - 1;
    let end = start;
    while (low <= high) {
      const mid = Math.floor((low + high) / 2);
      const candidate = boundaries[mid];
      if (fits(chapter, original.slice(start, candidate), first)) {
        end = candidate;
        low = mid + 1;
      } else high = mid - 1;
    }
    // An unusually long word is allowed to wrap. Split at a code point only if
    // that word itself exceeds a whole page, keeping the text lossless.
    if (end === start) {
      const tokenEnd = boundaries.find((boundary) => boundary > start)!;
      const points = Array.from(original.slice(start, tokenEnd));
      let a = 1;
      let b = points.length;
      while (a <= b) {
        const mid = Math.floor((a + b) / 2);
        const text = points.slice(0, mid).join('');
        if (fits(chapter, text, first)) {
          end = start + text.length;
          a = mid + 1;
        } else b = mid - 1;
      }
    }
    if (end === start) throw new BookLayoutError('El texto necesita más espacio. Usá la lectura continua.');
    // Prefer a paragraph ending when it occupies a substantial part of a page.
    if (end < original.length) {
      const candidate = original.slice(start, end);
      const paragraph = candidate.lastIndexOf('\n\n');
      if (paragraph > candidate.length * 0.62) end = start + paragraph + 2;
    }
    fragments.push({ text: original.slice(start, end), start, end });
    start = end;
  }
  return fragments;
}

/** A real DOM measuring sheet uses exactly the final page CSS and loaded font. */
export function createPageMeasurer(layout: BookLayout): { fits: PageMeasurer; destroy: () => void } {
  const sheet = document.createElement('article');
  sheet.className = 'book-sheet book-measuring-sheet';
  sheet.style.width = `${layout.width}px`;
  sheet.style.height = `${layout.height}px`;
  sheet.style.setProperty('--book-font-size', `${layout.fontSize}px`);
  sheet.style.setProperty('--book-page-pad', `${Math.max(22, Math.min(40, Math.round(layout.width * 0.075)))}px`);
  sheet.style.setProperty('--book-title-size', `${layout.width >= 400 ? 32 : 28}px`);
  sheet.setAttribute('aria-hidden', 'true');
  const inner = document.createElement('div');
  inner.className = 'book-sheet-inner';
  const header = document.createElement('header');
  header.className = 'book-chapter-header';
  const label = document.createElement('p');
  label.className = 'book-eyebrow';
  const title = document.createElement('h2');
  const authors = document.createElement('p');
  authors.className = 'book-authors';
  header.append(label, title, authors);
  const prose = document.createElement('div');
  prose.className = 'book-prose';
  const textBlock = document.createElement('p');
  textBlock.className = 'book-prose-text';
  prose.append(textBlock);
  const footer = document.createElement('footer');
  footer.className = 'book-folio';
  footer.textContent = 'Popol Vuh · 1';
  inner.append(header, prose, footer);
  sheet.append(inner);
  document.body.append(sheet);
  let lastHeader = '';
  return {
    fits(chapter, text, first) {
      const key = `${chapter.id}:${first}`;
      if (key !== lastHeader) {
        header.className = first ? 'book-chapter-header' : 'book-chapter-header book-continuation-header';
        label.textContent = first ? `CAPÍTULO ${chapter.number}` : `CAPÍTULO ${chapter.number} · CONTINUACIÓN`;
        title.textContent = chapter.title;
        authors.textContent = chapter.authors;
        authors.hidden = !first || !chapter.authors;
        lastHeader = key;
      }
      textBlock.textContent = text;
      // Compare an unbounded text block against its available flex area. A 2px
      // safety margin absorbs browser rounding without clipping a final line.
      return prose.clientHeight > layout.fontSize * 1.62 && textBlock.getBoundingClientRect().height <= prose.clientHeight - 2;
    },
    destroy() { sheet.remove(); },
  };
}

'use client';

import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import { hasContribution } from '@/lib/book/build-book';
import type { BookAnchor, BookChapter } from '@/lib/book/types';
import { ChapterHeader } from './BookPage';
import { MaizeOrnament } from './BookCover';

export interface ContinuousReaderHandle { scrollTo: (anchor: BookAnchor) => void }

const ContinuousReader = forwardRef<ContinuousReaderHandle, { chapters: BookChapter[]; initialAnchor: BookAnchor; onPosition: (anchor: BookAnchor) => void; onImage: (chapter: BookChapter) => void }>(function ContinuousReader({ chapters, initialAnchor, onPosition, onImage }, ref) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const positionRef = useRef(onPosition);
  positionRef.current = onPosition;

  function scrollTo(anchor: BookAnchor) {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    if (anchor.kind !== 'text' && anchor.kind !== 'image') { scroller.scrollTop = anchor.kind === 'credits' || anchor.kind === 'back' ? scroller.scrollHeight : 0; return; }
    const article = Array.from(scroller.querySelectorAll<HTMLElement>('[data-chapter-id]')).find((element) => element.dataset.chapterId === anchor.chapterId);
    if (!article) return;
    let target: Element = article;
    let top = article.getBoundingClientRect().top;
    if (anchor.kind === 'image') target = article.querySelector('figure') || article;
    else if (anchor.offset > 0) {
      const paragraphs = Array.from(article.querySelectorAll<HTMLElement>('[data-text-start]'));
      const paragraph = paragraphs.reverse().find((p) => Number(p.dataset.textStart) <= anchor.offset);
      if (paragraph?.firstChild) {
        const range = document.createRange();
        range.setStart(paragraph.firstChild, Math.min(anchor.offset - Number(paragraph.dataset.textStart), paragraph.firstChild.textContent?.length || 0));
        range.collapse(true);
        const bounds = range.getBoundingClientRect();
        top = bounds.height ? bounds.top : paragraph.getBoundingClientRect().top;
        target = paragraph;
      }
    }
    if (anchor.kind === 'image' || target === article) top = target.getBoundingClientRect().top;
    scroller.scrollTop += top - scroller.getBoundingClientRect().top - 20;
  }
  useImperativeHandle(ref, () => ({ scrollTo }));

  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    const initial = requestAnimationFrame(() => scrollTo(initialAnchor));
    let frame = 0;
    const onScroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        const viewport = scroller.getBoundingClientRect();
        const articles = Array.from(scroller.querySelectorAll<HTMLElement>('[data-chapter-id]'));
        const current = articles.find((article) => article.getBoundingClientRect().bottom > viewport.top + 90);
        if (!current) return;
        const paragraph = Array.from(current.querySelectorAll<HTMLElement>('[data-text-start]')).find((p) => p.getBoundingClientRect().bottom > viewport.top + 28);
        let offset = Number(paragraph?.dataset.textStart || 0);
        if (paragraph && paragraph.getBoundingClientRect().top < viewport.top + 28) {
          const caretDocument = document as Document & { caretPositionFromPoint?: (x: number, y: number) => { offsetNode: Node; offset: number } | null; caretRangeFromPoint?: (x: number, y: number) => Range | null };
          const textRect = paragraph.getBoundingClientRect();
          const caret = caretDocument.caretPositionFromPoint?.(textRect.left + 3, viewport.top + 28);
          const range = caretDocument.caretRangeFromPoint?.(textRect.left + 3, viewport.top + 28);
          if (caret?.offsetNode === paragraph.firstChild) offset += caret.offset;
          else if (range?.startContainer === paragraph.firstChild) offset += range.startOffset;
        }
        positionRef.current({ kind: 'text', chapterId: current.dataset.chapterId!, offset });
      });
    };
    scroller.addEventListener('scroll', onScroll, { passive: true });
    return () => { cancelAnimationFrame(initial); cancelAnimationFrame(frame); scroller.removeEventListener('scroll', onScroll); };
    // Initial anchor is applied when entering this mode; later index jumps use
    // the imperative handle instead of resetting on each scroll update.
  }, [chapters]);

  return <div ref={scrollerRef} className="reader-continuous" tabIndex={0} aria-label="Lectura continua del libro">
    <div className="reader-continuous-intro"><p className="book-eyebrow">EL LIBRO DE NUESTRA CLASE</p><h2>Popol Vuh</h2><p>Un relato antiguo. Muchas voces nuevas.</p><MaizeOrnament /></div>
    {chapters.filter(hasContribution).map((chapter) => {
      let offset = 0;
      const paragraphs = Array.from(chapter.text.matchAll(/[\s\S]+?(?:\n\s*\n|$)/g)).map((match) => { const block = { text: match[0], offset }; offset += match[0].length; return block; });
      return <article key={chapter.id} data-chapter-id={chapter.id} className="reader-continuous-chapter">
        <ChapterHeader chapter={chapter} />
        {chapter.text ? <div className="book-prose">{paragraphs.map((paragraph) => <p key={paragraph.offset} className="book-prose-text" data-text-start={paragraph.offset}>{paragraph.text}</p>)}</div> : <p className="book-page-note">El resumen todavía está en preparación.</p>}
        {chapter.imageUrl && <figure><button onClick={() => onImage(chapter)} aria-label={`Ampliar ilustración de ${chapter.title}`}><img src={chapter.imageUrl} alt={`Ilustración de ${chapter.title}, por ${chapter.authors || 'la clase'}`} loading="lazy" decoding="async" /></button><figcaption>{chapter.authors}</figcaption></figure>}
      </article>;
    })}
    <footer className="reader-continuous-end"><p className="book-eyebrow">HECHO ENTRE TODOS</p><h2>La historia sigue<br />en nuestras voces.</h2></footer>
  </div>;
});

export default ContinuousReader;

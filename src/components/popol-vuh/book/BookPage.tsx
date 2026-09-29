/* The engine owns static clones. Media src is applied only near a visible leaf. */
import type { BookChapter, BookPage as PageDescriptor } from '@/lib/book/types';
import BookCover, { MaizeOrnament } from './BookCover';

export function ChapterHeader({ chapter, continuation = false }: { chapter: BookChapter; continuation?: boolean }) {
  return (
    <header className={`book-chapter-header ${continuation ? 'book-continuation-header' : ''}`}>
      <p className="book-eyebrow">CAPÍTULO {chapter.number}{continuation ? ' · CONTINUACIÓN' : ''}</p>
      <h2>{chapter.title}</h2>
      {!continuation && chapter.authors && <p className="book-authors">{chapter.authors}</p>}
    </header>
  );
}

export default function BookPage({ page, chapter, loadMedia = false }: { page: PageDescriptor; chapter?: BookChapter; loadMedia?: boolean }) {
  const hard = page.kind === 'cover' || page.kind === 'back';
  return (
    <article className={`book-sheet book-sheet-${page.kind}`} data-density={hard ? 'hard' : 'soft'} data-book-page={page.id}>
      {hard ? <BookCover back={page.kind === 'back'} /> : (
        <div className="book-sheet-inner">
          {page.kind === 'title' && (
            <div className="book-title-page">
              <p className="book-eyebrow">NUESTRA EDICIÓN</p>
              <MaizeOrnament className="book-title-ornament" />
              <h2>Popol Vuh</h2>
              <p>Contado por<br />nuestra clase.</p>
              <div className="book-small-rule" />
              <p className="book-title-note">Cada capítulo reúne la mirada,<br />el dibujo y la voz de una pareja.</p>
            </div>
          )}
          {page.kind === 'contents' && (
            <div className="book-printed-contents">
              <p className="book-eyebrow">EL RECORRIDO</p>
              <h2>Historias<br /><em>que nos unen.</em></h2>
              <ol>{page.entries?.map((entry) => <li key={entry.id}><span>{String(entry.number).padStart(2, '0')}</span><p>{entry.title}</p></li>)}</ol>
              <p className="book-page-note">Abrí el índice para elegir cualquier capítulo.</p>
            </div>
          )}
          {(page.kind === 'chapter' || page.kind === 'continuation') && chapter && (
            <>
              <ChapterHeader chapter={chapter} continuation={page.kind === 'continuation'} />
              <div className="book-prose">
                {page.text ? <p className="book-prose-text">{page.text}</p> : (
                  <div className="book-pending-text"><MaizeOrnament /><p>{chapter.hasAudio ? 'Este capítulo también se cuenta con la voz.' : 'Una imagen abre este capítulo.'}</p><span>El resumen todavía está en preparación.</span></div>
                )}
              </div>
            </>
          )}
          {page.kind === 'image' && chapter && (
            <>
              <p className="book-eyebrow">CAPÍTULO {chapter.number} · ILUSTRACIÓN</p>
              <figure className="book-illustration">
                {chapter.imageUrl ? <img src={loadMedia ? chapter.imageUrl : undefined} data-media-src={chapter.imageUrl} alt={`Ilustración de ${chapter.title}, por ${chapter.authors || 'la clase'}`} decoding="async" draggable={false} /> : <p>La ilustración no está disponible.</p>}
                <figcaption>{chapter.authors || 'Una creación de nuestra clase'}</figcaption>
              </figure>
            </>
          )}
          {page.kind === 'credits' && (
            <div className="book-credits">
              <p className="book-eyebrow">HECHO ENTRE TODOS</p>
              <MaizeOrnament className="book-title-ornament" />
              <h2>Muchas voces.<br /><em>Un mismo libro.</em></h2>
              <p>Esta edición reúne {page.entries?.length || 0} {page.entries?.length === 1 ? 'capítulo con aportes' : 'capítulos con aportes'} de nuestra clase.</p>
              <p>Leímos, imaginamos, escribimos y pusimos nuestra voz en una historia compartida.</p>
              <div className="book-small-rule" />
              <p className="book-page-note">Los nombres de cada pareja acompañan su capítulo.</p>
            </div>
          )}
          {page.kind === 'courtesy' && <div className="book-courtesy"><MaizeOrnament /><p>La historia sigue en nuestras voces.</p></div>}
          <footer className="book-folio"><span>Popol Vuh</span><span>{page.folio}</span></footer>
        </div>
      )}
    </article>
  );
}

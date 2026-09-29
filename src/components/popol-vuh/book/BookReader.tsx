'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { ArrowLeft, BookOpen, Check, Expand, LoaderCircle, RefreshCw, Text, X } from 'lucide-react';
import { adjacentPageIndex, buildBook, hasContribution, visiblePageIndices } from '@/lib/book/build-book';
import { createPageMeasurer } from '@/lib/book/paginate';
import { findAnchorPage, loadReadingPosition, saveReadingPosition } from '@/lib/book/reading-position';
import type { BookAnchor, BookChapter, BookEngineState, BookLayout, BookPage as PageDescriptor } from '@/lib/book/types';
import BookContents from './BookContents';
import BookControls from './BookControls';
import BookPage from './BookPage';
import ChapterAudioPlayer from './ChapterAudioPlayer';
import ContinuousReader, { type ContinuousReaderHandle } from './ContinuousReader';
import FlipBookAdapter, { type FlipBookHandle } from './FlipBookAdapter';

interface Props { chapters: BookChapter[]; onBack: () => void; onRefresh: () => void; checking: boolean; onApplyVersion?: () => void }

export default function BookReader({ chapters, onBack, onRefresh, checking, onApplyVersion }: Props) {
  const sceneRef = useRef<HTMLDivElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const flipRef = useRef<FlipBookHandle>(null);
  const continuousRef = useRef<ContinuousReaderHandle>(null);
  const anchorRef = useRef<BookAnchor>({ kind: 'cover' });
  const [readingAnchor, setReadingAnchor] = useState<BookAnchor>({ kind: 'cover' });
  const stateRef = useRef<BookEngineState>('preparing');
  const [engineState, setEngineState] = useState<BookEngineState>('preparing');
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [fontSize, setFontSize] = useState(17);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [preferredMode, setPreferredMode] = useState<'book' | 'continuous'>('book');
  const [fontsReady, setFontsReady] = useState(false);
  const [composition, setComposition] = useState<{ pages: PageDescriptor[]; layout: BookLayout; initialIndex: number } | null>(null);
  const [index, setIndex] = useState(0);
  const [selectedId, setSelectedId] = useState<string>();
  const [notice, setNotice] = useState('');
  const [image, setImage] = useState<BookChapter | null>(null);
  const explicitChapterRef = useRef<string | null>(null);
  const composedKeyRef = useRef('');
  const version = useMemo(() => chapters.map((chapter) => `${chapter.id}:${chapter.version}`).join('|'), [chapters]);
  const lowHeight = size.height > 0 && size.height < 340;
  const continuous = preferredMode === 'continuous' || lowHeight;
  const busy = engineState === 'animating' || engineState === 'dragging';

  const setState = useCallback((state: BookEngineState) => { stateRef.current = state; setEngineState(state); }, []);
  const persist = useCallback((anchor: BookAnchor) => { anchorRef.current = anchor; setReadingAnchor(anchor); saveReadingPosition({ anchor, fontSize, version }); }, [fontSize, version]);

  useEffect(() => {
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReducedMotion(motion.matches);
    let disposed = false;
    void Promise.resolve().then(() => {
      if (disposed) return;
      const saved = loadReadingPosition();
      if (saved) { anchorRef.current = saved.anchor; setReadingAnchor(saved.anchor); setFontSize(saved.fontSize); }
      update();
    });
    motion.addEventListener('change', update);
    void document.fonts.ready.then(() => { if (!disposed) setFontsReady(true); });
    return () => { disposed = true; motion.removeEventListener('change', update); };
  }, []);

  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;
    const observer = new ResizeObserver(([entry]) => {
      const next = { width: Math.floor(entry.contentRect.width), height: Math.floor(entry.contentRect.height) };
      setSize((previous) => Math.abs(previous.width - next.width) >= 2 || Math.abs(previous.height - next.height) >= 8 ? next : previous);
    });
    observer.observe(scene);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!fontsReady || size.width < 240 || size.height < 120 || busy) return;
    const compositionKey = `${version}:${size.width}:${size.height}:${fontSize}`;
    if (compositionKey === composedKeyRef.current) return;
    // Measure after the browser lays out the scene. A ready event after a turn
    // does not rebuild the book; only content, dimensions or typography do.
    const frame = requestAnimationFrame(() => {
    const availableHeight = Math.max(280, size.height - 20);
    const spread = size.width >= 792 && availableHeight >= 420;
    const pageWidth = Math.floor(Math.min(spread ? (size.width - 32) / 2 : size.width - 28, spread ? Math.min(470, availableHeight / 1.48) : 450));
    const layout: BookLayout = { width: pageWidth, height: Math.floor(Math.min(availableHeight, pageWidth * 1.48)), spread, fontSize };
    const anchor = anchorRef.current;
    if ((anchor.kind === 'text' || anchor.kind === 'image') && !chapters.some((chapter) => chapter.id === anchor.chapterId && hasContribution(chapter))) {
      anchorRef.current = { kind: 'contents' };
      setNotice('El capítulo que estabas leyendo cambió. Elegí una historia en el índice.');
    }
    const measurer = createPageMeasurer(layout);
    try {
      const pages = buildBook(chapters, measurer.fits);
      const nextIndex = findAnchorPage(pages, anchorRef.current);
      composedKeyRef.current = compositionKey;
      setComposition({ pages, layout, initialIndex: nextIndex });
      setIndex(nextIndex);
      const current = pages[nextIndex];
      setSelectedId(current?.chapterId);
      setState('preparing');
      saveReadingPosition({ anchor: anchorRef.current, fontSize, version });
    } catch {
      composedKeyRef.current = compositionKey;
      setPreferredMode('continuous');
      setNotice('Este espacio funciona mejor con lectura continua. El texto se conserva completo.');
    } finally { measurer.destroy(); }
    });
    return () => cancelAnimationFrame(frame);
    // Busy defers a changed composition until the engine's real ready event.
  }, [chapters, version, fontsReady, size, fontSize, busy, setState]);

  function onPage(nextIndex: number) {
    if (!composition) return;
    const visible = visiblePageIndices(nextIndex, composition.pages.length, composition.layout.spread);
    const candidates = visible.map((value) => composition.pages[value]).filter((page) => page.chapterId);
    const destination = nextIndex >= index ? candidates[candidates.length - 1] : candidates[0];
    const chosenId = explicitChapterRef.current || destination?.chapterId;
    explicitChapterRef.current = null;
    setSelectedId(chosenId);
    setIndex(nextIndex);
    // A jump to a right-hand chapter preserves that destination as its anchor.
    const chosen = chosenId ? visible.map((value) => composition.pages[value]).find((page) => page.chapterId === chosenId) : undefined;
    persist((chosen || composition.pages[nextIndex]).anchor);
  }

  const selectChapter = (chapter: BookChapter) => {
    const anchor: BookAnchor = { kind: 'text', chapterId: chapter.id, offset: 0 };
    const target = composition ? findAnchorPage(composition.pages, anchor) : 0;
    explicitChapterRef.current = chapter.id;
    persist(anchor); setSelectedId(chapter.id); setIndex(target);
    if (continuous) continuousRef.current?.scrollTo(anchor);
    else if (reducedMotion) setState('ready');
    else flipRef.current?.jump(target);
  };

  const goToCover = () => {
    explicitChapterRef.current = null;
    const anchor: BookAnchor = { kind: 'cover' };
    persist(anchor); setSelectedId(undefined); setIndex(0);
    if (continuous) continuousRef.current?.scrollTo(anchor);
    else if (!reducedMotion) flipRef.current?.jump(0);
  };

  function navigate(direction: 1 | -1) {
    if (!composition || busy) return;
    if (continuous || reducedMotion) {
      const target = adjacentPageIndex(index, composition.pages.length, continuous ? false : composition.layout.spread, direction);
      onPage(target);
      if (continuous) continuousRef.current?.scrollTo(composition.pages[target].anchor);
    } else if (direction > 0) flipRef.current?.next(); else flipRef.current?.previous();
  }

  useEffect(() => {
    if (continuous || reducedMotion) {
      let disposed = false;
      void Promise.resolve().then(() => { if (!disposed) setState('ready'); });
      return () => { disposed = true; };
    }
  }, [continuous, reducedMotion, composition, setState]);

  const visibleIndices = composition ? visiblePageIndices(index, composition.pages.length, composition.layout.spread && !continuous) : [];
  const visibleChapters = chapters.filter((chapter) => visibleIndices.some((value) => composition?.pages[value]?.chapterId === chapter.id));
  const selected = chapters.find((chapter) => chapter.id === selectedId);
  const currentImage = visibleIndices.map((value) => composition?.pages[value]).find((page) => page?.kind === 'image');
  const currentImageChapter = chapters.find((chapter) => chapter.id === currentImage?.chapterId && chapter.imageUrl);
  const style = composition ? {
    '--book-font-size': `${fontSize}px`,
    '--book-page-pad': `${Math.max(22, Math.min(40, Math.round(composition.layout.width * 0.075)))}px`,
    '--book-title-size': `${composition.layout.width >= 400 ? 32 : 28}px`,
    '--book-page-width': `${composition.layout.width}px`,
    '--book-page-height': `${composition.layout.height}px`,
  } as CSSProperties : { '--book-font-size': `${fontSize}px` } as CSSProperties;

  return <div ref={rootRef} className={`book-reader ${continuous ? 'book-reader-continuous' : ''}`} style={style} onKeyDown={(event) => {
    if (event.target instanceof HTMLElement && event.target.closest('input,select,textarea,[role="dialog"]')) return;
    if (event.key === 'ArrowRight') { event.preventDefault(); navigate(1); }
    if (event.key === 'ArrowLeft') { event.preventDefault(); navigate(-1); }
  }}>
    <header className="reader-header"><button className="reader-button reader-back" onClick={onBack}><ArrowLeft size={19} /><span>Volver</span></button><div className="reader-brand"><BookOpen size={18} /><div><h1>El libro de la clase</h1><p>Popol Vuh · Nuestra edición</p></div></div><BookContents chapters={chapters} currentId={selectedId} onSelect={selectChapter} onCover={goToCover} disabled={busy} /></header>
    <div className="reader-toolbar"><div className="reader-modes" role="group" aria-label="Modo de lectura"><button aria-pressed={!continuous} onClick={() => { if (!lowHeight) setPreferredMode('book'); }} disabled={lowHeight || busy}><BookOpen size={15} />Libro</button><button aria-pressed={continuous} onClick={() => { setPreferredMode('continuous'); setState('ready'); }} disabled={busy}><Text size={15} /><span>Continua</span></button></div><div className="reader-toolbar-actions"><button className="reader-text-size" onClick={() => setFontSize((size) => size === 17 ? 19 : size === 19 ? 21 : 17)} disabled={busy} aria-label={`Tamaño de texto ${fontSize}. Cambiar tamaño`} title="Cambiar tamaño de texto"><span>A</span><strong>A</strong><span className="reader-text-size-dot">{fontSize === 17 ? '·' : fontSize === 19 ? '··' : '···'}</span></button><button className="reader-icon-button reader-refresh" onClick={onRefresh} disabled={checking} aria-label="Buscar nuevos aportes">{checking ? <LoaderCircle size={17} className="reader-spinner" /> : <RefreshCw size={17} />}</button></div></div>
    {(notice || onApplyVersion || lowHeight) && <div className="reader-notice" role="status"><p>{onApplyVersion ? 'Hay nuevos aportes para este libro.' : lowHeight ? 'Lectura continua para aprovechar este espacio.' : notice}</p>{onApplyVersion && <button onClick={onApplyVersion} disabled={busy || checking}><Check size={15} />Actualizar</button>}{notice && !lowHeight && !onApplyVersion && <button aria-label="Cerrar aviso" onClick={() => setNotice('')}><X size={16} /></button>}</div>}
    <main ref={sceneRef} className="reader-scene" aria-label="Páginas del libro" tabIndex={0}>
      {continuous ? <ContinuousReader ref={continuousRef} chapters={chapters} initialAnchor={readingAnchor} onImage={setImage} onPosition={(anchor) => { persist(anchor); if (anchor.kind === 'text') setSelectedId(anchor.chapterId); if (composition) setIndex(findAnchorPage(composition.pages, anchor)); }} /> : composition ? (
        <div className={`reader-book-object ${composition.layout.spread ? 'reader-book-spread' : ''} ${!busy && index === 0 ? 'reader-book-front-closed' : !busy && index === composition.pages.length - 1 ? 'reader-book-back-closed' : ''}`} data-layout={composition.layout.spread ? 'spread' : 'single'}>
          {reducedMotion ? <div className={`reader-instant-pages ${composition.layout.spread ? 'reader-instant-spread' : ''}`}>{visibleIndices.map((value) => <BookPage key={composition.pages[value].id} page={composition.pages[value]} chapter={chapters.find((chapter) => chapter.id === composition.pages[value].chapterId)} loadMedia />)}</div> : <FlipBookAdapter ref={flipRef} pages={composition.pages} chapters={chapters} layout={composition.layout} initialIndex={index} onPage={onPage} onState={setState} onError={(message) => { setNotice(message); setPreferredMode('continuous'); }} />}
          {currentImageChapter && <button className="reader-image-expand" onClick={() => setImage(currentImageChapter)} aria-label="Ampliar ilustración"><Expand size={17} /></button>}
        </div>
      ) : <div className="reader-preparing" role="status"><LoaderCircle className="reader-spinner" size={26} /><p>Preparando las páginas…</p></div>}
      {!continuous && composition && <div className="reader-accessible-page" aria-live="polite"><h2>{index === 0 ? 'Portada de Popol Vuh' : selected?.title || 'Popol Vuh'}</h2>{visibleIndices.map((value) => <p key={value}>{composition.pages[value].text || (composition.pages[value].kind === 'image' ? 'Ilustración del capítulo. Usá Ampliar ilustración para verla en detalle.' : '')}</p>)}<p>Para seleccionar texto o usar lectura con reflujo, elegí Lectura continua.</p></div>}
    </main>
    {!continuous && <p className={`reader-gesture-hint ${index === 0 ? '' : 'reader-gesture-hint-hidden'}`} aria-hidden={index !== 0}>Deslizá para abrir. Cada página tiene una historia.</p>}
    <ChapterAudioPlayer chapter={selected} alternatives={visibleChapters} onSelect={setSelectedId} />
    {composition && <BookControls pages={composition.pages} index={index} spread={composition.layout.spread && !continuous} busy={busy || (!continuous && !reducedMotion && engineState !== 'ready')} onPrevious={() => navigate(-1)} onNext={() => navigate(1)} />}
    <Dialog.Root open={Boolean(image)} onOpenChange={(open) => { if (!open) setImage(null); }}><Dialog.Portal><Dialog.Overlay className="reader-dialog-overlay" /><Dialog.Content className="reader-image-dialog"><header><div><Dialog.Title>{image?.title || 'Ilustración'}</Dialog.Title><Dialog.Description>{image?.authors || 'Una creación de la clase'}</Dialog.Description></div><Dialog.Close asChild><button className="reader-icon-button" aria-label="Cerrar ilustración"><X size={23} /></button></Dialog.Close></header>{image?.imageUrl && <img src={image.imageUrl} alt={`Ilustración completa de ${image.title}`} />}</Dialog.Content></Dialog.Portal></Dialog.Root>
  </div>;
}

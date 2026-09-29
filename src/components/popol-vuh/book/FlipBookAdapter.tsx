'use client';

import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import type { PageFlip } from 'page-flip';
import { installManagedRenderLoop } from '@/lib/book/managed-render-loop';
import type { BookChapter, BookEngineState, BookLayout, BookPage as PageDescriptor } from '@/lib/book/types';
import BookPage from './BookPage';

export interface FlipBookHandle { next: () => void; previous: () => void; jump: (index: number) => void }
interface Props {
  pages: PageDescriptor[];
  chapters: BookChapter[];
  layout: BookLayout;
  initialIndex: number;
  onPage: (index: number) => void;
  onState: (state: BookEngineState) => void;
  onError: (message: string) => void;
}

/** React owns the hidden source sheets and the outer mount only. The motor
 * owns a separate imperative child, including all temporary copies. */
const FlipBookAdapter = forwardRef<FlipBookHandle, Props>(function FlipBookAdapter({ pages, chapters, layout, initialIndex, onPage, onState, onError }, ref) {
  const mountRef = useRef<HTMLDivElement>(null);
  const sourceRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<PageFlip | null>(null);
  const callbacks = useRef({ onPage, onState, onError });
  callbacks.current = { onPage, onState, onError };
  const initialRef = useRef(initialIndex);
  initialRef.current = initialIndex;

  useImperativeHandle(ref, () => ({
    next() { const engine = engineRef.current; if (engine?.getState() === 'read' && engine.getCurrentPageIndex() < pages.length - 1) engine.flipNext(); },
    previous() { const engine = engineRef.current; if (engine?.getState() === 'read' && engine.getCurrentPageIndex() > 0) engine.flipPrev(); },
    jump(index) { const engine = engineRef.current; if (engine?.getState() === 'read') engine.turnToPage(Math.max(0, Math.min(pages.length - 1, index))); },
  }), [pages.length]);

  useEffect(() => {
    const mount = mountRef.current;
    const source = sourceRef.current;
    if (!mount || !source) return;
    let disposed = false;
    let teardown: (() => void) | undefined;
    callbacks.current.onState('preparing');
    void import('page-flip').then(({ PageFlip: Constructor }) => {
      if (disposed) return;
      const owned = document.createElement('div');
      owned.className = 'reader-engine';
      owned.style.width = `${layout.width * (layout.spread ? 2 : 1)}px`;
      owned.style.height = `${layout.height}px`;
      mount.append(owned);
      const nodes = Array.from(source.children).map((node) => node.cloneNode(true) as HTMLElement);
      const engine = new Constructor(owned, {
        width: layout.width, height: layout.height, size: 'fixed',
        usePortrait: !layout.spread, autoSize: false, showCover: true,
        startPage: Math.min(initialRef.current, pages.length - 1),
        flippingTime: 580, drawShadow: true, maxShadowOpacity: 0.24,
        mobileScrollSupport: true, useMouseEvents: true,
        // Native click handlers are removed below. Keep this false so the
        // library's own previous-page command can start in portrait mode.
        clickEventForward: true, disableFlipByClick: false, showPageCorners: false,
      });
      const stopRender = installManagedRenderLoop(engine);
      engineRef.current = engine;
      const disposeEngine = () => {
        stopRender();
        try { if (engine.getUI()) engine.destroy(); } finally {
          owned.remove();
          if (engineRef.current === engine) engineRef.current = null;
        }
      };
      // Register disposal before initialization, which may fail after starting
      // the renderer. The error fallback must release that partial instance.
      teardown = disposeEngine;
      function prepareImages(index: number) {
        const before = Math.max(0, index - 2);
        const after = Math.min(nodes.length - 1, index + (layout.spread ? 4 : 2));
        for (let i = before; i <= after; i++) {
          nodes[i].querySelectorAll<HTMLImageElement>('img[data-media-src]').forEach((img) => {
            if (!img.getAttribute('src')) {
              img.onerror = () => { img.classList.add('book-image-error'); img.alt = 'La ilustración no pudo cargarse. Abrila de nuevo para reintentar.'; };
              img.src = img.dataset.mediaSrc!;
            }
          });
        }
      }
      engine.on('flip', (event) => {
        if (disposed) return;
        const index = Number(event.data);
        prepareImages(index);
        callbacks.current.onPage(index);
      });
      engine.on('changeState', (event) => {
        if (disposed) return;
        callbacks.current.onState(event.data === 'read' ? 'ready' : event.data === 'user_fold' ? 'dragging' : 'animating');
      });
      engine.on('init', () => { if (!disposed) { prepareImages(engine.getCurrentPageIndex()); callbacks.current.onState('ready'); } });
      engine.loadFromHTML(nodes);
      // The library's touch handlers delay folds and also handle vertical
      // gestures. Replace them with axis-aware Pointer Events, retaining its
      // actual geometry and completion/cancellation events.
      const ui = engine.getUI() as unknown as { removeHandlers: () => void; getDistElement: () => HTMLElement };
      ui.removeHandlers();
      const surface = ui.getDistElement();
      let pointer: { id: number; x: number; y: number; active: boolean; startX: number; startY: number; lastX: number; lastY: number } | null = null;
      const down = (event: PointerEvent) => {
        if (!event.isPrimary) { cancelPointer(); return; }
        if (event.button !== 0 || engine.getState() !== 'read') return;
        pointer = { id: event.pointerId, x: event.clientX, y: event.clientY, active: false, startX: 0, startY: 0, lastX: 0, lastY: 0 };
      };
      const move = (event: PointerEvent) => {
        if (!pointer || pointer.id !== event.pointerId) return;
        const dx = event.clientX - pointer.x;
        const dy = event.clientY - pointer.y;
        if (!pointer.active) {
          if (Math.abs(dy) > 9 && Math.abs(dy) >= Math.abs(dx)) { pointer = null; return; }
          if (Math.abs(dx) < 9 || Math.abs(dx) < Math.abs(dy) * 1.3) return;
          const forward = dx < 0;
          if ((!forward && engine.getCurrentPageIndex() === 0) || (forward && engine.getCurrentPageIndex() === pages.length - 1)) { pointer = null; return; }
          const bounds = engine.getBoundsRect();
          const rect = surface.getBoundingClientRect();
          pointer.startX = forward ? bounds.left + bounds.width - 1 : bounds.left + 1;
          pointer.startY = Math.max(1, Math.min(layout.height - 1, pointer.y - rect.top));
          engine.startUserTouch({ x: pointer.startX, y: pointer.startY });
          // Lock the direction at the original corner before a fast first
          // movement can cross the engine's direction detection boundary.
          engine.getFlipController().start({ x: pointer.startX, y: pointer.startY });
          pointer.active = true;
          surface.setPointerCapture(event.pointerId);
        }
        // Portrait rendering hides the opposite leaf. Map a swipe across the
        // visible page onto that full fold so half a swipe can complete it.
        pointer.lastX = pointer.startX + dx * (layout.spread ? 1 : 2);
        pointer.lastY = Math.max(1, Math.min(layout.height - 1, pointer.startY + dy));
        engine.userMove({ x: pointer.lastX, y: pointer.lastY }, true);
        if (event.cancelable) event.preventDefault();
      };
      const up = (event: PointerEvent) => {
        if (!pointer || pointer.id !== event.pointerId) return;
        if (pointer.active) engine.userStop({ x: pointer.lastX, y: pointer.lastY });
        pointer = null;
      };
      function cancelPointer() {
        if (pointer?.active) {
          // Return the fold to its original corner before releasing it. A
          // pointercancel (pinch, OS interruption) must never commit a page.
          engine.userMove({ x: pointer.startX, y: pointer.startY }, true);
          engine.userStop({ x: pointer.startX, y: pointer.startY });
        }
        pointer = null;
      }
      surface.addEventListener('pointerdown', down);
      surface.addEventListener('pointermove', move, { passive: false });
      surface.addEventListener('pointerup', up);
      surface.addEventListener('pointercancel', cancelPointer);
      surface.addEventListener('lostpointercapture', cancelPointer);
      teardown = () => {
        surface.removeEventListener('pointerdown', down);
        surface.removeEventListener('pointermove', move);
        surface.removeEventListener('pointerup', up);
        surface.removeEventListener('pointercancel', cancelPointer);
        surface.removeEventListener('lostpointercapture', cancelPointer);
        disposeEngine();
      };
    }).catch(() => {
      teardown?.(); teardown = undefined;
      if (!disposed) callbacks.current.onError('No se pudo abrir el efecto de páginas. El libro sigue disponible en lectura continua.');
    });
    return () => { disposed = true; teardown?.(); mount.replaceChildren(); };
  }, [pages, layout]);

  return (
    <>
      <div className="reader-page-sources" ref={sourceRef} aria-hidden="true" inert>{pages.map((page) => <BookPage key={page.id} page={page} chapter={chapters.find((chapter) => chapter.id === page.chapterId)} />)}</div>
      <div className="reader-engine-mount" ref={mountRef} aria-hidden="true" />
    </>
  );
});

export default FlipBookAdapter;

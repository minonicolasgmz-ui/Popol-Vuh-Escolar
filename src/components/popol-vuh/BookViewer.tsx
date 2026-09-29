'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeft, BookOpen, LoaderCircle, RefreshCw } from 'lucide-react';
import { useAppStore, type StageData } from '@/lib/store';
import { toBookChapter } from '@/lib/book/chapter-data';
import { hasContribution } from '@/lib/book/build-book';
import type { BookChapter } from '@/lib/book/types';
import BookReader from './book/BookReader';
import BookCover from './book/BookCover';

export default function BookViewer() {
  const { group: currentGroup, isAdmin, setView } = useAppStore();
  const [chapters, setChapters] = useState<BookChapter[] | null>(null);
  const [pending, setPending] = useState<BookChapter[] | null>(null);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState('');
  const installedVersion = useRef<string | null>(null);
  const inflight = useRef(false);
  const mounted = useRef(false);

  const refresh = useCallback(async (signal?: AbortSignal) => {
    if (inflight.current) return;
    inflight.current = true;
    setChecking(true);
    try {
      const response = await fetch('/api/stages?mode=book', { signal, cache: 'no-store' });
      const result = await response.json();
      if (!response.ok || !Array.isArray(result)) throw new Error(result.error || 'No pudimos cargar el libro.');
      if (!mounted.current || signal?.aborted) return;
      const next = (result as StageData[]).map(toBookChapter);
      const version = next.map((chapter) => `${chapter.id}:${chapter.version}`).join('|');
      if (installedVersion.current === null) { installedVersion.current = version; setChapters(next); }
      else if (installedVersion.current !== version) setPending(next);
      else setPending(null);
      setError('');
    } catch (reason) {
      if (mounted.current && !signal?.aborted) setError(reason instanceof Error ? reason.message : 'No pudimos cargar el libro. Intentá otra vez.');
    } finally {
      inflight.current = false;
      if (mounted.current && !signal?.aborted) setChecking(false);
    }
  }, []);

  useEffect(() => {
    mounted.current = true;
    const controller = new AbortController();
    void Promise.resolve().then(() => { if (!controller.signal.aborted) return refresh(controller.signal); });
    return () => { mounted.current = false; controller.abort(); };
  }, [refresh]);

  const back = () => setView(isAdmin ? 'admin' : currentGroup ? 'stages' : 'landing');
  if (!chapters || !chapters.some(hasContribution)) return <div className="book-empty-screen">
    <button className="reader-button" onClick={back}><ArrowLeft size={18} />Volver</button>
    <div className="book-empty-cover"><BookCover /></div>
    <div className="book-empty-copy"><p className="reader-overline">EL LIBRO DE LA CLASE</p><h1>{!chapters ? 'Abriendo nuestra historia…' : 'La primera página espera sus voces.'}</h1><p>{!chapters ? 'Estamos reuniendo los capítulos.' : 'Cuando una pareja guarde su texto, su ilustración o su voz, aparecerá aquí.'}</p>
      {checking && <LoaderCircle className="reader-spinner" aria-label="Cargando libro" />}
      {error && <p role="alert">{error}</p>}
      {!checking && <button className="reader-button" onClick={() => void refresh()}><RefreshCw size={18} />Volver a buscar</button>}
      {chapters && <button className="reader-button" onClick={back}><BookOpen size={18} />Ir a los capítulos</button>}
    </div>
  </div>;

  return <>
    {error && <div className="book-fetch-error" role="alert"><span>{error}</span><button onClick={() => void refresh()} disabled={checking}>Reintentar</button></div>}
    <BookReader chapters={chapters} onBack={back} onRefresh={() => void refresh()} checking={checking} onApplyVersion={pending ? () => {
      installedVersion.current = pending.map((chapter) => `${chapter.id}:${chapter.version}`).join('|');
      setChapters(pending); setPending(null);
    } : undefined} />
  </>;
}

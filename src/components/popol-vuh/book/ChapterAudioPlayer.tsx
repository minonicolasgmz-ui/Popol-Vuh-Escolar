'use client';

import { useEffect, useRef, useState } from 'react';
import { LoaderCircle, Mic, Pause, Play } from 'lucide-react';
import type { BookChapter } from '@/lib/book/types';

function time(value: number) {
  if (!Number.isFinite(value)) return '0:00';
  return `${Math.floor(value / 60)}:${String(Math.floor(value % 60)).padStart(2, '0')}`;
}

export default function ChapterAudioPlayer({ chapter, alternatives = [], onSelect }: { chapter?: BookChapter; alternatives?: BookChapter[]; onSelect: (id: string) => void }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const playIntentRef = useRef(0);
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState('');
  const source = chapter?.audioUrl;

  useEffect(() => {
    const audio = audioRef.current;
    playIntentRef.current++;
    let disposed = false;
    void Promise.resolve().then(() => {
      if (!disposed) { setPlaying(false); setLoading(false); setCurrent(0); setDuration(0); setError(''); }
    });
    if (audio) { audio.pause(); audio.load(); }
    return () => { disposed = true; playIntentRef.current++; audio?.pause(); };
  }, [chapter?.id, source]);

  async function toggle() {
    const audio = audioRef.current;
    if (!audio || !source) return;
    if (!audio.paused) { playIntentRef.current++; audio.pause(); setLoading(false); return; }
    const intent = ++playIntentRef.current;
    setError(''); setLoading(true);
    try {
      if (audio.error) audio.load();
      await audio.play();
      if (intent !== playIntentRef.current) { audio.pause(); return; }
      setPlaying(true);
    } catch {
      if (intent === playIntentRef.current) setError('No pudimos reproducir la voz. Tocá reproducir para reintentar.');
    } finally { if (intent === playIntentRef.current) setLoading(false); }
  }

  return (
    <section className={`reader-audio ${!source ? 'reader-audio-empty' : ''}`} aria-label="Voz del capítulo">
      <audio ref={audioRef} src={source || undefined} preload="none"
        onTimeUpdate={(event) => setCurrent(event.currentTarget.currentTime)}
        onLoadedMetadata={(event) => setDuration(Number.isFinite(event.currentTarget.duration) ? event.currentTarget.duration : 0)}
        onDurationChange={(event) => setDuration(Number.isFinite(event.currentTarget.duration) ? event.currentTarget.duration : 0)}
        onPause={() => setPlaying(false)} onEnded={() => { setPlaying(false); setLoading(false); }}
        onError={() => { setPlaying(false); setLoading(false); setError('La grabación no está disponible. Podés seguir leyendo y reintentar.'); }} />
      <button className="reader-audio-play" onClick={toggle} disabled={!source || loading} aria-label={playing ? 'Pausar lectura' : current > 0 ? 'Reanudar lectura' : 'Escuchar lectura'}>
        {loading ? <LoaderCircle size={21} className="reader-spinner" /> : playing ? <Pause size={21} fill="currentColor" /> : <Play size={21} fill="currentColor" />}
      </button>
      <div className="reader-audio-body">
        <div className="reader-audio-heading"><span><Mic size={13} />{chapter ? `LA VOZ DEL CAPÍTULO ${chapter.number}` : 'HISTORIAS CON VOZ'}</span><span>{source ? `${time(current)} / ${time(duration)}` : 'AUDIO'}</span></div>
        <p>{chapter ? source ? chapter.authors || 'Escuchá la lectura de este capítulo' : 'La voz de esta pareja todavía está en preparación.' : 'Abrí un capítulo para escuchar a sus autores.'}</p>
        {source && <input className="reader-audio-progress" type="range" min={0} max={duration || 1} step={0.1} value={Math.min(current, duration || 1)} disabled={!duration} aria-label="Posición de la lectura" aria-valuetext={`${time(current)} de ${time(duration)}`} onChange={(event) => { if (audioRef.current) { const value = Number(event.target.value); audioRef.current.currentTime = value; setCurrent(value); } }} />}
        {error && <p className="reader-audio-error" role="alert">{error}</p>}
        {alternatives.length > 1 && <div className="reader-audio-alternatives" aria-label="Voces de las páginas visibles">{alternatives.map((other) => <button key={other.id} onClick={() => onSelect(other.id)} aria-pressed={other.id === chapter?.id}>Cap. {other.number}</button>)}</div>}
      </div>
    </section>
  );
}

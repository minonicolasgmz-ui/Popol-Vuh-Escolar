'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Check, Headphones, Loader2, Mic, Pause, Play, RotateCcw, Square, Trash2, Upload } from 'lucide-react';
import { blobToDataUrl } from '@/lib/stage-drafts';
import './editor.css';

interface AudioRecorderProps {
  onAudioRecorded: (audio: string) => void;
  initialAudio?: string | null;
  onRecordingChange?: (recording: boolean) => void;
  disabled?: boolean;
}

const MAX_SECONDS = 300;
const MAX_BYTES = 8 * 1024 * 1024;
const FORMATS = ['audio/webm;codecs=opus', 'audio/mp4', 'audio/webm', 'audio/ogg;codecs=opus'];

function formatTime(seconds: number) {
  const safe = Number.isFinite(seconds) ? Math.max(0, seconds) : 0;
  return `${Math.floor(safe / 60)}:${Math.floor(safe % 60).toString().padStart(2, '0')}`;
}

function normalizeAudio(source?: string | null) {
  if (!source) return null;
  if (/^(data:|blob:|https?:|\/)/.test(source)) return source;
  return `data:audio/webm;base64,${source}`;
}

function AudioPreview({ source, disabled, audioRef }: { source: string; disabled: boolean; audioRef: React.RefObject<HTMLAudioElement | null> }) {
  const [playing, setPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState('');
  const toggle = async () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (!audio.paused) { audio.pause(); return; }
    try { setError(''); await audio.play(); } catch {
      setError('No pudimos reproducir el audio. Revisá la conexión y volvé a intentar.');
    }
  };
  useEffect(() => {
    const audio = audioRef.current;
    if (audio) audio.src = source;
    return () => { if (audio) { audio.pause(); audio.removeAttribute('src'); audio.load(); } };
  }, [audioRef, source]);
  return <div className="voice-preview">
    <audio ref={audioRef} src={source} preload="none"
      onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onEnded={() => setPlaying(false)}
      onTimeUpdate={(event) => setPosition(event.currentTarget.currentTime)}
      onDurationChange={(event) => setDuration(Number.isFinite(event.currentTarget.duration) ? event.currentTarget.duration : 0)}
      onError={() => { setPlaying(false); setError('Este audio no se pudo abrir. Revisá la conexión o grabalo nuevamente.'); }} />
    <button type="button" className="voice-play" onClick={toggle} disabled={disabled} aria-label={playing ? 'Pausar lectura' : 'Escuchar lectura'}>
      {playing ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" />}
    </button>
    <div className="voice-track">
      <div className="voice-track-title"><span>La voz de nuestro equipo</span><span>{formatTime(position)} / {duration ? formatTime(duration) : '—:—'}</span></div>
      <input aria-label="Posición de la lectura" type="range" min="0" max={duration || 1} step="0.1" value={Math.min(position, duration || 1)} disabled={disabled || !duration}
        onChange={(event) => { if (audioRef.current) { audioRef.current.currentTime = Number(event.target.value); setPosition(Number(event.target.value)); } }} />
    </div>
    {error && <p role="alert" className="voice-error">{error}</p>}
  </div>;
}

export default function AudioRecorder({ onAudioRecorded, initialAudio, onRecordingChange, disabled = false }: AudioRecorderProps) {
  const [status, setStatus] = useState<'idle' | 'requesting' | 'recording' | 'processing'>('idle');
  const [seconds, setSeconds] = useState(0);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const mountedRef = useRef(false);
  const busyRef = useRef(false);
  const callbackRef = useRef(onAudioRecorded);
  const recordingCallbackRef = useRef(onRecordingChange);
  const source = normalizeAudio(initialAudio);
  useEffect(() => { callbackRef.current = onAudioRecorded; recordingCallbackRef.current = onRecordingChange; }, [onAudioRecorded, onRecordingChange]);
  const release = useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }, []);
  const stop = useCallback(() => {
    const recorder = recorderRef.current;
    if (recorder?.state === 'recording' || recorder?.state === 'paused') {
      recorder.stop();
      if (mountedRef.current) setStatus('processing');
    }
    release();
  }, [release]);
  useEffect(() => {
    mountedRef.current = true;
    const interrupt = () => {
      if (document.hidden && recorderRef.current?.state === 'recording') {
        setNotice('La grabación se detuvo al salir de la pantalla. Escuchá el fragmento antes de guardarlo.');
        stop();
      }
    };
    document.addEventListener('visibilitychange', interrupt);
    return () => {
      mountedRef.current = false;
      document.removeEventListener('visibilitychange', interrupt);
      const recorder = recorderRef.current;
      if (recorder && recorder.state !== 'inactive') recorder.stop();
      release();
      audioRef.current?.pause();
      recordingCallbackRef.current?.(false);
    };
  }, [release, stop]);
  const start = async () => {
    if (busyRef.current || disabled) return;
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setError('La grabación necesita un navegador compatible y una conexión segura (HTTPS). Abrí la app en Safari o Chrome actualizado.');
      return;
    }
    busyRef.current = true;
    setStatus('requesting'); recordingCallbackRef.current?.(true);
    setError(''); setNotice(''); setConfirmDelete(false); audioRef.current?.pause();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (!mountedRef.current) { stream.getTracks().forEach((track) => track.stop()); return; }
      streamRef.current = stream;
      const mimeType = FORMATS.find((format) => MediaRecorder.isTypeSupported(format));
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType, audioBitsPerSecond: 96000 } : undefined);
      recorderRef.current = recorder;
      const chunks: Blob[] = []; let size = 0; let recorderError = false;
      recorder.ondataavailable = (event) => {
        if (event.data.size) { chunks.push(event.data); size += event.data.size; }
        if (size >= MAX_BYTES && recorder.state === 'recording') {
          if (mountedRef.current) setNotice('Llegamos al tamaño máximo de esta grabación. Revisá el audio antes de guardarlo.');
          stop();
        }
      };
      recorder.onerror = () => {
        recorderError = true;
        if (mountedRef.current) setError('El micrófono se interrumpió. La grabación anterior sigue disponible; intentá grabar otra vez.');
        stop();
      };
      recorder.onstop = async () => {
        release();
        try {
          if (!mountedRef.current || recorderError) return;
          setStatus('processing');
          const blob = new Blob(chunks, { type: recorder.mimeType || chunks[0]?.type || 'audio/webm' });
          if (!blob.size) throw new Error('No se capturó sonido. Probá grabar otra vez.');
          if (blob.size > MAX_BYTES) throw new Error('La grabación es demasiado grande. Probá una lectura más breve; conservamos el audio anterior.');
          const data = await blobToDataUrl(blob);
          if (mountedRef.current) callbackRef.current(data);
        } catch (cause) {
          if (mountedRef.current) setError(cause instanceof Error ? cause.message : 'No se pudo preparar el audio.');
        } finally {
          busyRef.current = false;
          if (mountedRef.current) { setStatus('idle'); recordingCallbackRef.current?.(false); }
        }
      };
      stream.getAudioTracks().forEach((track) => { track.onended = () => {
        if (mountedRef.current && recorder.state === 'recording') {
          setNotice('El micrófono se desconectó. Revisá la parte que pudimos grabar.'); stop();
        }
      }; });
      recorder.start(1000); setSeconds(0); setStatus('recording');
      const startedAt = performance.now();
      timerRef.current = setInterval(() => {
        const elapsed = Math.floor((performance.now() - startedAt) / 1000); setSeconds(elapsed);
        if (elapsed >= MAX_SECONDS) { setNotice('Se alcanzaron los 5 minutos. Escuchá la lectura antes de guardarla.'); stop(); }
      }, 250);
    } catch (cause) {
      release(); busyRef.current = false;
      if (!mountedRef.current) return;
      setStatus('idle'); recordingCallbackRef.current?.(false);
      const name = cause instanceof DOMException ? cause.name : '';
      setError(name === 'NotAllowedError'
        ? 'No tenemos permiso para usar el micrófono. Habilitalo desde el candado o los permisos del navegador y volvé a intentar.'
        : name === 'NotFoundError'
          ? 'No encontramos un micrófono. Conectá uno o abrí la app en tu celular.'
          : 'No pudimos iniciar el micrófono. Cerrá otras apps que lo usen y volvé a intentar.');
    }
  };
  const busy = status !== 'idle';
  const uploadAudio = async (file?: File) => {
    if (!file || busyRef.current || disabled) return;
    if (file.size > MAX_BYTES) { setError('El audio supera los 8 MB. Elegí una grabación más pequeña.'); return; }
    if (!file.type.startsWith('audio/') && !/\.(wav|mp3|m4a|mp4|webm|ogg|aac)$/i.test(file.name)) { setError('Elegí una grabación de audio compatible.'); return; }
    busyRef.current = true; setStatus('processing'); setError(''); setNotice(''); recordingCallbackRef.current?.(true); audioRef.current?.pause();
    const url = URL.createObjectURL(file);
    const probe = new Audio();
    try {
      await new Promise<void>((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error('No pudimos abrir ese audio. Probá con MP3, M4A, WAV o WebM.')), 12000);
        probe.onloadedmetadata = () => {
          clearTimeout(timer);
          if (Number.isFinite(probe.duration) && probe.duration > MAX_SECONDS) reject(new Error('La lectura supera los 5 minutos. Elegí una versión más breve.'));
          else resolve();
        };
        probe.onerror = () => { clearTimeout(timer); reject(new Error('Este navegador no puede abrir el archivo. Probá con otra grabación.')); };
        probe.preload = 'metadata'; probe.src = url;
      });
      const data = await blobToDataUrl(file);
      if (mountedRef.current) { callbackRef.current(data); setNotice('Audio incorporado. Escúchenlo antes de guardar el capítulo.'); }
    } catch (cause) {
      if (mountedRef.current) setError(cause instanceof Error ? cause.message : 'No pudimos abrir el audio. La lectura anterior se conserva.');
    } finally {
      probe.pause(); probe.removeAttribute('src'); probe.load(); URL.revokeObjectURL(url);
      busyRef.current = false;
      if (mountedRef.current) { setStatus('idle'); recordingCallbackRef.current?.(false); if (fileRef.current) fileRef.current.value = ''; }
    }
  };
  return <div className="voice-recorder">
    <input type="file" ref={fileRef} className="editor-file-input" accept="audio/*,.m4a,.webm,.ogg,.wav,.mp3" aria-label="Elegir una lectura grabada" disabled={busy || disabled} onChange={(event) => void uploadAudio(event.target.files?.[0])} />
    <div className={`voice-studio ${status === 'recording' ? 'is-recording' : ''}`}>
      <div className="voice-studio-icon">{status === 'recording' ? <span className="voice-record-dot" /> : source ? <Headphones size={24} /> : <Mic size={24} />}</div>
      <div className="voice-studio-copy"><strong>{status === 'recording' ? `Grabando · ${formatTime(seconds)}` : status === 'requesting' ? 'Esperando el micrófono…' : status === 'processing' ? 'Preparando la lectura…' : source ? 'Su historia ya tiene voz' : 'Dejen su voz en el libro'}</strong>
        <span>{status === 'recording' ? 'Lean con calma. Al terminar, toquen Detener.' : source ? 'Escuchen cómo quedó antes de guardar.' : 'Busquen un lugar tranquilo y lean el resumen.'}</span>
      </div>
      <div className="voice-waves" aria-hidden="true">{[1, 2, 3, 4, 5, 6, 7].map((item) => <i key={item} style={{ '--wave-index': item } as React.CSSProperties} />)}</div>
    </div>
    {source && <AudioPreview key={source} source={source} disabled={busy || disabled} audioRef={audioRef} />}
    <div className="voice-actions">
      {status === 'recording' ? <button type="button" onClick={stop} className="voice-stop"><Square size={17} fill="currentColor" /> Detener grabación</button>
        : <button type="button" onClick={start} disabled={busy || disabled} className="action-primary">
          {busy ? <Loader2 size={18} className="editor-spin" /> : source ? <RotateCcw size={18} /> : <Mic size={18} />}
          {status === 'requesting' ? 'Habilitar micrófono…' : status === 'processing' ? 'Preparando…' : source ? 'Grabar de nuevo' : 'Grabar nuestra lectura'}
        </button>}
      {source && !busy && <button type="button" className="editor-text-button" onClick={() => setConfirmDelete(!confirmDelete)} disabled={disabled}><Trash2 size={16} /> Borrar audio</button>}
      {!busy && <button type="button" className="action-secondary" onClick={() => fileRef.current?.click()} disabled={disabled}><Upload size={16} />Subir un audio</button>}
    </div>
    {confirmDelete && <div className="editor-inline-confirm"><span>¿Borrar esta grabación del borrador?</span><button type="button" onClick={() => { audioRef.current?.pause(); callbackRef.current(''); setConfirmDelete(false); }}><Check size={16} /> Sí, borrar</button><button type="button" onClick={() => setConfirmDelete(false)}>Conservar</button></div>}
    <p className="editor-hint">Hasta 5 minutos. {source ? 'La lectura anterior se conserva hasta que termine la nueva.' : 'El navegador les pedirá permiso para usar el micrófono.'}</p>
    <div aria-live="polite">{notice && <p className="voice-notice">{notice}</p>}</div>
    {error && <p role="alert" className="error-notice">{error}</p>}
  </div>;
}

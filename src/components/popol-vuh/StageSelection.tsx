'use client';

import { useCallback, useEffect, useState } from 'react';
import { ArrowRight, BookOpen, Check, Image as ImageIcon, Loader2, LockKeyhole, LogOut, Mic, PenLine, RefreshCw } from 'lucide-react';
import { StageData, useAppStore } from '@/lib/store';
import { Brand, EditorialMark } from './EditorialMark';

export function StageProgress({ stage }: { stage: StageData }) {
  const items = [{ label: 'Texto', done: stage.hasText ?? !!stage.text?.trim(), Icon: PenLine }, { label: 'Imagen', done: stage.hasImage ?? !!stage.imageUrl, Icon: ImageIcon }, { label: 'Voz', done: stage.hasAudio ?? !!stage.audioData, Icon: Mic }];
  return <div className="stage-progress">{items.map(({ label, done, Icon }) => <span key={label} className={done ? 'is-done' : ''}><Icon size={14} />{label}{done && <Check size={12} />}<span className="sr-only">{done ? ' listo' : ' pendiente'}</span></span>)}</div>;
}

export default function StageSelection() {
  const { stages, group, setStages, setView, setSelectedStageId } = useAppStore();
  const [loading, setLoading] = useState(stages.length === 0);
  const [error, setError] = useState('');
  const [claiming, setClaiming] = useState<string | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);
  const refresh = useCallback(async (signal?: AbortSignal) => {
    try {
      const response = await fetch('/api/stages', { signal, cache: 'no-store' });
      const result = await response.json();
      if (!response.ok || !Array.isArray(result)) throw new Error(result.error || 'No pudimos cargar los capítulos.');
      setStages(result); setError('');
    } catch (error) { if (!signal?.aborted) setError(error instanceof Error ? error.message : 'Revisá la conexión e intentá de nuevo.'); }
    finally { if (!signal?.aborted) setLoading(false); }
  }, [setStages]);
  useEffect(() => { const controller = new AbortController(); void Promise.resolve().then(() => { if (!controller.signal.aborted) return refresh(controller.signal); }); return () => controller.abort(); }, [refresh]);
  const ours = stages.find((stage) => stage.groupId === group?.id);
  const contributions = stages.filter((s) => s.hasText || s.hasImage || s.hasAudio || s.text || s.imageUrl || s.audioData).length;

  const choose = async (stage: StageData) => {
    if (claiming) return;
    if (stage.groupId === group?.id) { setSelectedStageId(stage.id); setView('editor'); return; }
    if (ours || stage.groupId) return;
    setClaiming(stage.id); setError('');
    try {
      const response = await fetch(`/api/stages/${stage.id}/claim`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ groupId: group?.id }) });
      const result = await response.json();
      if (!response.ok || !result.id) { if (response.status === 409) await refresh(); throw new Error(result.error || 'No pudimos reservar este capítulo.'); }
      useAppStore.getState().updateStage(result); setSelectedStageId(stage.id); setView('editor');
    } catch (error) { setError(error instanceof Error ? error.message : 'No pudimos conectar. Intentá de nuevo.'); }
    finally { setClaiming(null); }
  };

  return <main className="app-shell selection-page">
    <header className="workspace-header"><Brand /><div className="header-actions"><button className="action-secondary" onClick={() => setView('book')}><BookOpen size={17} /><span>El libro</span></button><button className="icon-button" aria-label="Cerrar sesión del equipo" disabled={loggingOut} onClick={async () => { setLoggingOut(true); try { await useAppStore.getState().reset(); } catch (error) { setError(error instanceof Error ? error.message : 'No pudimos salir.'); setLoggingOut(false); } }}><LogOut size={19} /></button></div></header>
    <div className="workspace-content">
      <section className="selection-heading"><div><span className="eyebrow">EL TALLER DE NUESTRA CLASE</span><h1>{ours ? 'Su historia está tomando forma.' : <>Nuestros capítulos.<br /><em>Muchas voces.</em></>}</h1><p>Bienvenidos, <strong>{group?.student1} y {group?.student2}</strong>.<br />{ours ? 'Continúen creando y descubran los aportes de sus compañeros.' : 'Elijan un capítulo para contarlo a su manera.'}</p></div><div className="chapter-tally"><strong>{String(contributions).padStart(2, '0')}</strong><span>capítulos con aportes<br />de {stages.length || 12} en nuestra historia</span></div></section>
      <section className="collective-banner"><div className="banner-cover" aria-hidden="true"><span>POPOL VUH</span><EditorialMark /></div><div><span className="eyebrow">NUESTRA EDICIÓN COLECTIVA</span><h2>Una historia que crece con cada equipo.</h2><p>Abran el libro, pasen sus páginas y escuchen las voces de la clase.</p></div><button className="action-primary banner-action" onClick={() => setView('book')}>Abrir el libro <ArrowRight size={18} /></button></section>
      {error && <div className="error-notice" role="alert">{error}<button className="quiet-link" onClick={() => { setLoading(true); void refresh(); }}><RefreshCw size={16} /> Reintentar</button></div>}
      {ours && <section className="our-chapter paper-card"><div><span className="eyebrow">NUESTRO CAPÍTULO</span><h2><span>{String(ours.number).padStart(2, '0')}</span> {ours.title}</h2><StageProgress stage={ours} /></div><button className="action-primary" onClick={() => void choose(ours)}>Continuar creando <ArrowRight size={18} /></button></section>}
      <div className="section-rule"><h2>Los capítulos del libro</h2><span>{ours ? 'Cada equipo aporta su mirada' : 'Elijan uno que esté disponible'}</span></div>
      {loading ? <div className="chapter-grid" aria-busy="true">{Array.from({ length: 6 }, (_, i) => <div className="chapter-skeleton" key={i} />)}</div> : !stages.length ? <div className="paper-card empty-card"><BookOpen size={32} /><h2>El taller está por comenzar</h2><p>Los capítulos aparecerán cuando el docente prepare la actividad.</p></div> : <div className="chapter-grid">{stages.map((stage) => {
        const mine = stage.groupId === group?.id;
        const reserved = !!stage.groupId;
        const disabled = !!claiming || (reserved && !mine) || (!!ours && !mine);
        const hasContent = stage.hasText || stage.hasImage || stage.hasAudio || stage.text || stage.imageUrl || stage.audioData;
        return <article className={`chapter-card ${mine ? 'chapter-mine' : ''}`} key={stage.id}><div className="chapter-card-top"><span className="chapter-number">{String(stage.number).padStart(2, '0')}</span><span className={`chapter-status ${reserved ? 'reserved' : ''}`}>{mine ? 'Nuestro capítulo' : hasContent ? 'Con aportes' : reserved ? 'En edición' : 'Disponible'}</span></div><h3>{stage.title}</h3><p>{stage.description}</p><StageProgress stage={stage} /><div className="chapter-card-bottom">{reserved && !mine ? <span className="chapter-authors"><LockKeyhole size={14} />{stage.group?.student1} y {stage.group?.student2}</span> : <button disabled={disabled} onClick={() => void choose(stage)}>{claiming === stage.id ? <><Loader2 size={16} className="animate-spin" /> Reservando…</> : <>{mine ? 'Continuar' : ours ? 'Otro equipo puede elegirlo' : 'Elegir este capítulo'}{!disabled && <ArrowRight size={17} />}</>}</button>}</div></article>;
      })}</div>}
      <footer className="workspace-footer"><span>✦</span> Sus palabras también forman parte de esta historia.</footer>
    </div>
  </main>;
}

'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowRight, BookOpen, Check, ImagePlus, LogOut, Mic, Pencil, RefreshCw, Save, Trash2, X } from 'lucide-react';
import { StageData, useAppStore } from '@/lib/store';
import { prepareEditorImage } from '@/lib/editor-image';
import { Brand } from './EditorialMark';
import { StageProgress } from './StageSelection';
import AudioRecorder from './AudioRecorder';

interface Editing { stage: StageData; text: string; imageUrl: string | null; audioData: string | null }

export default function AdminPanel() {
  const { stages, setStages, setView, updateStage } = useAppStore();
  const [editing, setEditing] = useState<Editing | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [listeningId, setListeningId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const complete = stages.filter((s) => (s.hasText ?? !!s.text) && (s.hasImage ?? !!s.imageUrl) && (s.hasAudio ?? !!s.audioData)).length;
  const refresh = useCallback(async (signal?: AbortSignal) => {
    try {
      const response = await fetch('/api/admin/stages', { cache: 'no-store', signal });
      const result = await response.json();
      if (!response.ok || !Array.isArray(result)) throw new Error(result.error || 'No pudimos cargar el taller.');
      setStages(result);
    } catch (error) { if (!signal?.aborted) setError(error instanceof Error ? error.message : 'No pudimos conectar.'); }
  }, [setStages]);
  useEffect(() => { const controller = new AbortController(); void Promise.resolve().then(() => { if (!controller.signal.aborted) return refresh(controller.signal); }); return () => controller.abort(); }, [refresh]);

  const openEditor = async (stage: StageData) => {
    setBusy(stage.id); setError(''); setNotice(''); setListeningId(null);
    try {
      const response = await fetch(`/api/stages/${stage.id}`, { cache: 'no-store' });
      const detail = await response.json();
      if (!response.ok || !detail.id) throw new Error(detail.error || 'No pudimos abrir el capítulo.');
      setEditing({ stage: detail, text: detail.text || '', imageUrl: detail.imageUrl, audioData: detail.audioData });
    } catch (error) { setError(error instanceof Error ? error.message : 'No pudimos abrir el capítulo.'); }
    finally { setBusy(null); }
  };
  const save = async () => {
    if (!editing) return;
    setBusy(editing.stage.id); setError('');
    try {
      const response = await fetch(`/api/admin/stages/${editing.stage.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: editing.text || null, imageUrl: editing.imageUrl, audioData: editing.audioData, expectedUpdatedAt: editing.stage.updatedAt }) });
      const result = await response.json();
      if (!response.ok || !result.id) throw new Error(result.error || 'No pudimos guardar. Los cambios siguen en el editor.');
      updateStage(result); setEditing(null); setNotice('Los cambios del capítulo se guardaron.');
    } catch (error) { setError(error instanceof Error ? error.message : 'No pudimos guardar. Los cambios siguen en el editor.'); }
    finally { setBusy(null); }
  };
  const clear = async (stage: StageData) => {
    if (!window.confirm(`¿Vaciar «${stage.title}» y liberar su equipo? Se quitarán el texto, la imagen y la voz. Esta acción no se puede deshacer desde la app.`)) return;
    setBusy(stage.id); setError('');
    try {
      const response = await fetch(`/api/admin/stages/${stage.id}`, { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ expectedUpdatedAt: stage.updatedAt }) });
      const result = await response.json();
      if (!response.ok || !result.id) throw new Error(result.error || 'No pudimos liberar el capítulo.');
      updateStage(result); setNotice('Capítulo liberado.');
    } catch (error) { setError(error instanceof Error ? error.message : 'No pudimos liberar el capítulo.'); }
    finally { setBusy(null); }
  };

  return <main className="app-shell admin-page"><header className="workspace-header"><Brand /><div className="header-actions"><button className="action-secondary" onClick={() => setView('book')}><BookOpen size={17} /> El libro</button><button className="icon-button" aria-label="Cerrar sesión docente" onClick={async () => { try { await useAppStore.getState().reset(); } catch { setError('No pudimos cerrar la sesión.'); } }}><LogOut size={18} /></button></div></header><div className="workspace-content">
    <section className="selection-heading"><div><span className="eyebrow">EL ESPACIO DEL DOCENTE</span><h1>Acompañar<br /><em>cada mirada.</em></h1><p>Revisá las creaciones, escuchá a los equipos y abrí el libro colectivo.</p></div><div className="chapter-tally"><strong>{String(complete).padStart(2, '0')}</strong><span>capítulos completos<br />de {stages.length} en el taller</span></div></section>
    <section className="teacher-summary paper-card"><div><span className="eyebrow">ASÍ CRECE NUESTRO LIBRO</span><h2>{stages.filter((s) => s.groupId).length} equipos creando una misma historia.</h2></div><button className="action-primary" onClick={() => setView('book')}>Ver la edición <ArrowRight size={18} /></button></section>
    {error && <p className="error-notice" role="alert">{error}</p>}{notice && <p className="teacher-notice" role="status"><Check size={16} />{notice}</p>}
    <div className="section-rule"><h2>Los capítulos de la clase</h2><button className="quiet-link" onClick={() => { setError(''); void refresh(); }}><RefreshCw size={15} /> Actualizar</button></div>
    <div className="teacher-stages">{stages.map((stage) => <article className={`teacher-stage paper-card ${editing?.stage.id === stage.id ? 'teacher-stage-editing' : ''}`} key={stage.id}><div className="teacher-stage-heading"><span className="chapter-number">{String(stage.number).padStart(2, '0')}</span><div><h2>{stage.title}</h2><p>{stage.group ? `${stage.group.student1} y ${stage.group.student2}` : 'Disponible para un equipo'}</p><StageProgress stage={stage} /></div><div className="teacher-stage-actions"><button className="action-secondary" disabled={!!busy || (!!editing && editing.stage.id !== stage.id)} onClick={() => void openEditor(stage)}><Pencil size={15} />{busy === stage.id ? 'Preparando…' : 'Editar'}</button><button className="icon-button teacher-delete" title="Vaciar y liberar capítulo" aria-label={`Vaciar y liberar ${stage.title}`} disabled={!!busy || !!editing} onClick={() => void clear(stage)}><Trash2 size={16} /></button></div></div>
      {editing?.stage.id === stage.id ? <div className="teacher-editor"><label htmlFor="teacher-text">Resumen del capítulo<textarea id="teacher-text" value={editing.text} onChange={(e) => setEditing({ ...editing, text: e.target.value })} disabled={!!busy} /></label><section><h3>Ilustración</h3>{editing.imageUrl && <img src={editing.imageUrl} alt={`Ilustración de ${stage.title}`} className="teacher-image" />}<div className="teacher-media-actions"><button className="action-secondary" disabled={!!busy} onClick={() => inputRef.current?.click()}><ImagePlus size={16} />{editing.imageUrl ? 'Cambiar imagen' : 'Agregar imagen'}</button>{editing.imageUrl && <button className="quiet-link" onClick={() => setEditing({ ...editing, imageUrl: null })}><Trash2 size={16} /> Quitar imagen</button>}</div><input ref={inputRef} type="file" className="sr-only" tabIndex={-1} accept="image/*" onChange={async (event) => { const file = event.target.files?.[0]; if (!file) return; setBusy(stage.id); try { const imageUrl = await prepareEditorImage(file); setEditing((current) => current ? { ...current, imageUrl } : current); } catch (error) { setError(error instanceof Error ? error.message : 'No pudimos abrir la imagen.'); } finally { setBusy(null); } }} /></section><section><h3>La voz del equipo</h3><AudioRecorder initialAudio={editing.audioData} onAudioRecorded={(audioData) => setEditing((current) => current ? { ...current, audioData: audioData || null } : current)} /></section><div className="teacher-save-actions"><button className="action-secondary" disabled={!!busy} onClick={() => { if (window.confirm('¿Cerrar la edición sin guardar los cambios docentes?')) setEditing(null); }}><X size={16} /> Cancelar</button><button className="action-primary" disabled={!!busy} onClick={() => void save()}><Save size={16} />{busy ? 'Guardando…' : 'Guardar cambios'}</button></div></div> : (stage.hasAudio || stage.audioData) && <div className="teacher-audio">{listeningId === stage.id ? <audio key={stage.id} controls preload="metadata" src={stage.audioData || undefined} /> : <button className="quiet-link" onClick={() => setListeningId(stage.id)}><Mic size={16} /> Escuchar a este equipo</button>}</div>}
    </article>)}</div><footer className="workspace-footer">Cada capítulo merece una mirada atenta.</footer>
  </div></main>;
}

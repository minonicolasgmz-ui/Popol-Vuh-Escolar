'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowUpRight, BookOpen, Check, CheckCheck, Cloud, Feather, ImagePlus, Loader2, Mic, Save, ShieldCheck, Trash2, WifiOff } from 'lucide-react';
import { useAppStore, type GroupData, type StageData } from '@/lib/store';
import { draftKey, readStageDraft, removeStageDraft, sameDraftContent, writeStageDraft, type DraftContent, type StageDraft } from '@/lib/stage-drafts';
import { prepareEditorImage } from '@/lib/editor-image';
import AudioRecorder from './AudioRecorder';
import './editor.css';

function stageContent(stage: StageData): DraftContent {
  return { text: stage.text || '', imageUrl: stage.imageUrl || null, audioData: stage.audioData || null };
}

function isStage(value: unknown): value is StageData {
  return !!value && typeof value === 'object' && 'id' in value && typeof value.id === 'string' && 'updatedAt' in value && typeof value.updatedAt === 'string';
}

function messageFrom(value: unknown, fallback: string) {
  return value && typeof value === 'object' && 'error' in value && typeof value.error === 'string' ? value.error : fallback;
}

export default function StageEditor() {
  const selectedStageId = useAppStore((state) => state.selectedStageId);
  const group = useAppStore((state) => state.group);
  const setView = useAppStore((state) => state.setView);
  if (!group || !selectedStageId) return <div className="app-shell editor-loading"><BookOpen size={32} /><h1>Volvamos a su capítulo</h1><p>Ingresen con su equipo para continuar el trabajo.</p><button className="action-primary" onClick={() => setView(group ? 'stages' : 'landing')}>Continuar</button></div>;
  return <ChapterWorkshop key={`${group.id}:${selectedStageId}`} stageId={selectedStageId} group={group} />;
}

function ChapterWorkshop({ stageId, group }: { stageId: string; group: GroupData }) {
  const setView = useAppStore((state) => state.setView);
  const updateStage = useAppStore((state) => state.updateStage);
  const [stage, setStage] = useState<StageData | null>(() => useAppStore.getState().stages.find((item) => item.id === stageId) || null);
  const [content, setContent] = useState<DraftContent | null>(null);
  const [savedContent, setSavedContent] = useState<DraftContent | null>(null);
  const [baseUpdatedAt, setBaseUpdatedAt] = useState('');
  const [loadError, setLoadError] = useState('');
  const [error, setError] = useState('');
  const [localError, setLocalError] = useState('');
  const [localStatus, setLocalStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [recovered, setRecovered] = useState(false);
  const [retry, setRetry] = useState(0);
  const [saving, setSaving] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [conflict, setConflict] = useState<StageData | null>(null);
  const [online, setOnline] = useState(true);
  const [recording, setRecording] = useState(false);
  const [imageBusy, setImageBusy] = useState(false);
  const [imageError, setImageError] = useState('');
  const [confirmImageDelete, setConfirmImageDelete] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const readingScriptRef = useRef<HTMLDetailsElement>(null);
  const requestRef = useRef<XMLHttpRequest | null>(null);
  const mountedRef = useRef(true);
  const imageSequenceRef = useRef(0);
  const key = draftKey(group.id, stageId);
  const dirty = !!content && (!savedContent || !sameDraftContent(content, savedContent));

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; imageSequenceRef.current++; requestRef.current?.abort(); };
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    const load = async () => {
      setLoadError('');
      const [remote, local] = await Promise.allSettled([
        fetch(`/api/stages/${encodeURIComponent(stageId)}`, { signal: controller.signal, cache: 'no-store' }).then(async (response) => {
          const value: unknown = await response.json();
          if (!response.ok || !isStage(value)) throw new Error(messageFrom(value, 'No pudimos abrir este capítulo.'));
          return value;
        }),
        readStageDraft(key),
      ]);
      if (!active) return;
      const draft: StageDraft | null = local.status === 'fulfilled' ? local.value : null;
      if (local.status === 'rejected') {
        setLocalError('El navegador no pudo abrir los borradores. Pueden editar, pero guarden antes de salir.'); setLocalStatus('error');
      }
      if (remote.status === 'fulfilled') {
        const current = remote.value;
        if (current.groupId !== group.id) { setLoadError('Este capítulo ya no está asignado a su equipo. Vuelvan a los capítulos para revisar la asignación.'); return; }
        const saved = stageContent(current);
        setStage(current); updateStage(current); setSavedContent(saved);
        if (draft && !sameDraftContent(draft, saved)) {
          setContent({ text: draft.text, imageUrl: draft.imageUrl, audioData: draft.audioData });
          setBaseUpdatedAt(draft.baseUpdatedAt); setRecovered(true); setLocalStatus('saved');
          if (draft.baseUpdatedAt !== current.updatedAt) setConflict(current);
        } else {
          setContent(saved); setBaseUpdatedAt(current.updatedAt);
          if (draft) void removeStageDraft(key).catch(() => undefined);
        }
      } else if (draft) {
        setContent({ text: draft.text, imageUrl: draft.imageUrl, audioData: draft.audioData });
        setBaseUpdatedAt(draft.baseUpdatedAt); setRecovered(true); setLocalStatus('saved');
        setError('Recuperamos el borrador de este dispositivo. No pudimos comprobar la versión del libro; vuelvan a guardar cuando haya conexión.');
      } else {
        setLoadError(remote.reason instanceof Error ? remote.reason.message : 'No pudimos abrir el capítulo. Revisen la conexión e intenten otra vez.');
      }
    };
    void load();
    return () => { active = false; controller.abort(); };
  }, [stageId, group.id, key, retry, updateStage]);

  useEffect(() => {
    const syncOnline = () => setOnline(navigator.onLine);
    syncOnline(); window.addEventListener('online', syncOnline); window.addEventListener('offline', syncOnline);
    return () => { window.removeEventListener('online', syncOnline); window.removeEventListener('offline', syncOnline); };
  }, []);

  useEffect(() => {
    if (!content || !dirty || !baseUpdatedAt) return;
    let latest = true;
    void writeStageDraft({ ...content, key, baseUpdatedAt, savedAt: Date.now() }).then(() => {
      if (latest) { setLocalStatus('saved'); setLocalError(''); }
    }).catch(() => {
      if (latest) { setLocalStatus('error'); setLocalError('No pudimos guardar el borrador en este dispositivo. Puede faltar espacio; guarden en el libro antes de salir.'); }
    });
    return () => { latest = false; };
  }, [content, dirty, baseUpdatedAt, key]);

  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (recording || saving || imageBusy || (dirty && localStatus !== 'saved')) { event.preventDefault(); event.returnValue = ''; }
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty, localStatus, recording, saving, imageBusy]);

  const changeContent = useCallback((patch: Partial<DraftContent>) => {
    setContent((previous) => previous ? { ...previous, ...patch } : previous);
    setLocalStatus('saving');
    setError('');
  }, []);
  const handleAudio = useCallback((value: string) => changeContent({ audioData: value || null }), [changeContent]);
  const handleRecording = useCallback((value: boolean) => {
    setRecording(value);
    if (value && readingScriptRef.current) readingScriptRef.current.open = true;
  }, []);

  const handleImage = async (file?: File) => {
    if (!file) return;
    const sequence = ++imageSequenceRef.current;
    setImageBusy(true); setImageError('');
    try {
      const imageUrl = await prepareEditorImage(file);
      if (mountedRef.current && sequence === imageSequenceRef.current) changeContent({ imageUrl });
    } catch (cause) {
      if (mountedRef.current && sequence === imageSequenceRef.current) setImageError(cause instanceof Error ? cause.message : 'No se pudo abrir la imagen.');
    } finally {
      if (mountedRef.current && sequence === imageSequenceRef.current) setImageBusy(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const save = async () => {
    if (!content || saving || recording || imageBusy || conflict) return false;
    setSaving(true); setError(''); setUploadProgress(0);
    try {
      const result = await new Promise<{ status: number; data: unknown }>((resolve, reject) => {
        const request = new XMLHttpRequest(); requestRef.current = request;
        request.open('PUT', `/api/stages/${encodeURIComponent(stageId)}`);
        request.setRequestHeader('Content-Type', 'application/json'); request.timeout = 90000;
        request.upload.onprogress = (event) => { if (event.lengthComputable && mountedRef.current) setUploadProgress(Math.round(event.loaded / event.total * 100)); };
        request.onload = () => { try { resolve({ status: request.status, data: JSON.parse(request.responseText) }); } catch { reject(new Error('El servidor devolvió una respuesta inesperada. Conservamos el borrador.')); } };
        request.onerror = () => reject(new Error('No pudimos conectar. El borrador permanece en este dispositivo si el guardado local está disponible.'));
        request.ontimeout = () => reject(new Error('El guardado demoró demasiado. Revisen la conexión e intenten otra vez.'));
        request.onabort = () => reject(new Error('El envío se interrumpió.'));
        request.send(JSON.stringify({ text: content.text.trim() ? content.text : null, imageUrl: content.imageUrl, audioData: content.audioData, expectedUpdatedAt: baseUpdatedAt }));
      });
      if (result.status === 409) {
        const response = await fetch(`/api/stages/${encodeURIComponent(stageId)}`, { cache: 'no-store' });
        const latest: unknown = await response.json();
        if (response.ok && isStage(latest)) setConflict(latest);
        throw new Error('Hay una versión más reciente de este capítulo. Revisen el cambio antes de volver a guardar.');
      }
      if (result.status < 200 || result.status >= 300 || !isStage(result.data)) throw new Error(messageFrom(result.data, 'No se pudo guardar. El borrador se conserva para volver a intentar.'));
      if (!mountedRef.current) return false;
      const updated = result.data;
      const nextContent = stageContent(updated);
      setStage(updated); updateStage(updated); setContent(nextContent); setSavedContent(nextContent); setBaseUpdatedAt(updated.updatedAt);
      setRecovered(false); setLocalStatus('idle');
      await removeStageDraft(key).catch(() => { if (mountedRef.current) setLocalError('El capítulo está guardado; no pudimos limpiar la copia local anterior.'); });
      return true;
    } catch (cause) {
      if (mountedRef.current) setError(cause instanceof Error ? cause.message : 'No se pudo guardar el capítulo.');
      return false;
    } finally { if (mountedRef.current) setSaving(false); requestRef.current = null; }
  };

  const openBook = async () => {
    if (dirty && !(await save())) return;
    setView('book');
  };
  const goBack = async () => {
    if (recording || saving || imageBusy) return;
    if (dirty && content) {
      try { await writeStageDraft({ ...content, key, baseUpdatedAt, savedAt: Date.now() }); }
      catch { setLocalError('El borrador no pudo guardarse. Guarden en el libro antes de salir para conservar el trabajo.'); return; }
    }
    setView('stages');
  };

  if (!content) return <main className="app-shell editor-loading">
    {loadError ? <><BookOpen size={32} /><h1>No pudimos abrir el capítulo</h1><p role="alert">{loadError}</p><div className="editor-loading-actions"><button type="button" className="action-primary" onClick={() => setRetry((value) => value + 1)}>Volver a intentar</button><button type="button" className="action-secondary" onClick={() => setView('stages')}>Ver capítulos</button></div></>
      : <><Loader2 size={30} className="editor-spin" /><p role="status">Preparando su espacio para crear…</p></>}
  </main>;

  const completed = [!!content.text.trim(), !!content.imageUrl, !!content.audioData];
  const completeCount = completed.filter(Boolean).length;
  const words = content.text.trim() ? content.text.trim().split(/\s+/).length : 0;
  const disabled = saving || imageBusy;
  const title = stage?.title || 'Nuestro capítulo';
  const saveLabel = saving ? uploadProgress < 100 ? `Enviando ${uploadProgress}%` : 'Confirmando…' : dirty ? 'Guardar capítulo' : 'Guardado en el libro';
  const statusLabel = saving ? 'Guardando en el libro…' : dirty ? localStatus === 'error' ? 'Borrador local no disponible' : localStatus === 'saved' ? online ? 'Borrador en este dispositivo' : 'Sin conexión · borrador local' : localStatus === 'saving' ? 'Protegiendo el borrador…' : 'Cambios sin guardar' : 'El libro tiene la última versión';

  return <main className="app-shell chapter-workshop">
    <div className="editor-container">
      <header className="editor-header">
        <button type="button" className="editor-back" onClick={goBack} disabled={recording || disabled}><ArrowLeft size={18} /><span>Capítulos</span></button>
        <span className="editor-brand">Popol Vuh <span>/ taller de la clase</span></span>
        <span className="editor-header-seal" aria-hidden="true"><Feather size={18} /></span>
      </header>
      <div className="editor-intro">
        <div><p className="eyebrow">El libro también lo escriben ustedes</p><h1>Una historia.<br /><em>Su propia voz.</em></h1></div>
        <div className="editor-team"><span className="editor-team-mark" aria-hidden="true">{group.student1.charAt(0)}{group.student2.charAt(0)}</span><div><span>Equipo de autores</span><strong>{group.student1} <span>&</span> {group.student2}</strong></div></div>
      </div>

      <nav className="editor-step-nav" aria-label="Secciones del capítulo">
        {[{ id: 'escribir', label: 'Escribir', Icon: Feather }, { id: 'ilustrar', label: 'Ilustrar', Icon: ImagePlus }, { id: 'narrar', label: 'Narrar', Icon: Mic }].map(({ id, label, Icon }, index) => <a key={id} href={`#${id}`}><span className={`editor-step-circle ${completed[index] ? 'is-complete' : ''}`}>{completed[index] ? <Check size={17} /> : <Icon size={17} />}</span><span>{label}</span><small>0{index + 1}</small></a>)}
      </nav>

      {recovered && <div className="editor-recovered"><ShieldCheck size={18} /><span>Recuperamos su borrador. Al guardar, los cambios aparecerán en el libro de la clase.</span></div>}
      {localError && <p role="alert" className="error-notice">{localError}</p>}
      {error && <p role="alert" className="error-notice">{error}</p>}
      {conflict && <section className="editor-conflict" aria-labelledby="conflict-title"><h2 id="conflict-title">Hay otra versión guardada</h2><p>El capítulo cambió desde que comenzaron este borrador. Su trabajo sigue aquí.</p><details><summary>Leer el texto guardado en el libro</summary><p>{conflict.text || 'Esta versión no tiene texto.'}</p></details><div><button type="button" className="action-secondary" onClick={() => { const next = stageContent(conflict); setContent(next); setSavedContent(next); setBaseUpdatedAt(conflict.updatedAt); setStage(conflict); updateStage(conflict); setConflict(null); setError(''); setRecovered(false); void removeStageDraft(key).catch(() => undefined); }}>Usar la versión del libro</button><button type="button" className="action-primary" onClick={() => { setSavedContent(stageContent(conflict)); setBaseUpdatedAt(conflict.updatedAt); setConflict(null); setError('Revisen su borrador y toquen Guardar para reemplazar la versión del libro.'); }}>Conservar nuestro borrador</button></div></section>}

      <div className="editor-grid">
        <div className="editor-sections">
          <section id="escribir" className="paper-card editor-section">
            <div className="editor-section-heading"><span className="editor-section-number">01</span><div><p className="eyebrow">Escribir</p><h2>Las palabras de su historia</h2></div><Feather size={23} aria-hidden="true" /></div>
            <div className="editor-brief"><span>Capítulo {String(stage?.number || 1).padStart(2, '0')}</span><h3>{title}</h3>{stage?.description && <p>{stage.description}</p>}</div>
            <label htmlFor="chapter-summary" className="editor-field-label">¿Qué sucede en este capítulo?</label>
            <p id="summary-help" className="editor-hint">Cuenten los hechos principales con sus palabras. Este será el texto que lean en voz alta.</p>
            <textarea id="chapter-summary" className="editor-manuscript" value={content.text} onChange={(event) => changeContent({ text: event.target.value })} disabled={saving} aria-describedby="summary-help" placeholder="Todo comienza cuando…" />
            <div className="editor-writing-footer"><span><Feather size={13} /> Cada palabra cuenta</span><span>{words} {words === 1 ? 'palabra' : 'palabras'}</span></div>
          </section>

          <section id="ilustrar" className="paper-card editor-section">
            <div className="editor-section-heading"><span className="editor-section-number">02</span><div><p className="eyebrow">Ilustrar</p><h2>Una imagen para imaginar</h2></div><ImagePlus size={23} aria-hidden="true" /></div>
            <p className="editor-section-description">Un dibujo, una foto o una ilustración que represente el capítulo.</p>
            <input ref={fileInputRef} type="file" accept="image/*" onChange={(event) => void handleImage(event.target.files?.[0])} className="editor-file-input" aria-label="Elegir imagen del capítulo" disabled={disabled} />
            {content.imageUrl ? <div className="editor-artwork"><img src={content.imageUrl} alt={`Ilustración del capítulo ${title}`} /><div className="editor-artwork-caption"><span><Check size={15} /> Su ilustración está lista</span><span>Se conserva la imagen completa</span></div></div>
              : <button type="button" className="editor-image-drop" onClick={() => fileInputRef.current?.click()} disabled={disabled}><span className="editor-image-drop-icon"><ImagePlus size={30} /></span><strong>Denle forma a su historia</strong><span>Elegir una imagen de la galería</span><small>JPG, PNG o WebP · hasta 15 MB</small></button>}
            {imageBusy && <p role="status" className="editor-preparing"><Loader2 size={17} className="editor-spin" /> Preparando una imagen ligera para el libro…</p>}
            {content.imageUrl && <div className="editor-media-actions"><button type="button" className="action-secondary" onClick={() => fileInputRef.current?.click()} disabled={disabled}><ImagePlus size={17} /> Cambiar imagen</button><button type="button" className="editor-text-button" onClick={() => setConfirmImageDelete(!confirmImageDelete)} disabled={disabled}><Trash2 size={16} /> Quitar</button></div>}
            {confirmImageDelete && <div className="editor-inline-confirm"><span>¿Quitar la imagen del borrador?</span><button type="button" onClick={() => { changeContent({ imageUrl: null }); setConfirmImageDelete(false); }}>Sí, quitar</button><button type="button" onClick={() => setConfirmImageDelete(false)}>Conservar</button></div>}
            {imageError && <p role="alert" className="error-notice">{imageError}</p>}
          </section>

          <section id="narrar" className="paper-card editor-section">
            <div className="editor-section-heading"><span className="editor-section-number">03</span><div><p className="eyebrow">Narrar</p><h2>El relato cobra vida</h2></div><Mic size={23} aria-hidden="true" /></div>
            <p className="editor-section-description">Pueden turnarse para leer. Su voz acompañará este capítulo en el libro de todos.</p>
            {content.text.trim() && <details ref={readingScriptRef} className="editor-reading-script"><summary><BookOpen size={17} /> Ver nuestro texto para leer</summary><div>{content.text}</div></details>}
            <AudioRecorder initialAudio={content.audioData} onAudioRecorded={handleAudio} onRecordingChange={handleRecording} disabled={disabled} />
          </section>
        </div>

        <aside className="editor-sidebar" aria-label="Vista previa y avance">
          <div className="editor-preview-card"><div className="editor-preview-label"><BookOpen size={16} /><span>Así empieza su capítulo</span></div><div className="editor-preview-page"><span className="editor-preview-number">{String(stage?.number || 1).padStart(2, '0')}</span><span className="editor-preview-rule" /><h2>{title}</h2><p className="editor-preview-authors">Por {group.student1} y {group.student2}</p>{content.imageUrl ? <img src={content.imageUrl} alt="" /> : <div className="editor-preview-placeholder"><Feather size={30} /><span>Una página para<br />su imaginación</span></div>}<p className={`editor-preview-text ${!content.text.trim() ? 'is-empty' : ''}`}>{content.text.trim() || 'Aquí aparecerá el relato que están creando. Este es su lugar en nuestra historia.'}</p><span className="editor-preview-folio">Popol Vuh · Libro de la clase</span></div><p className="editor-preview-note">Vista previa. El libro adapta las páginas al texto y al tamaño de pantalla.</p></div>
          <div className="editor-progress-card"><div><strong>{completeCount} de 3 aportes listos</strong><span>{completeCount === 3 ? 'Un capítulo para compartir' : 'La historia se construye paso a paso'}</span></div><div className="editor-progress-track" aria-hidden="true">{completed.map((done, index) => <i className={done ? 'is-done' : ''} key={index} />)}</div><ul>{['Resumen escrito', 'Imagen elegida', 'Lectura grabada'].map((label, index) => <li key={label} className={completed[index] ? 'is-done' : ''}>{completed[index] ? <CheckCheck size={17} /> : <span className="editor-empty-check" />} {label}</li>)}</ul><button type="button" className="editor-book-link" onClick={openBook} disabled={disabled || recording || !!conflict}><BookOpen size={18} /> {dirty ? 'Guardar y ver en el libro' : 'Ver el libro de la clase'}<ArrowUpRight size={18} /></button><p>Pueden guardar aunque falte un aporte.</p></div>
        </aside>
      </div>
    </div>
    <footer className="editor-savebar"><div className="editor-savebar-inner"><div className="editor-save-state" role="status" aria-live="polite">{saving ? <Loader2 size={19} className="editor-spin" /> : !online ? <WifiOff size={19} /> : dirty ? <ShieldCheck size={19} /> : <Cloud size={19} />}<div><strong>{statusLabel}</strong><span>{recording ? 'Terminen de grabar antes de salir o guardar.' : dirty ? 'Guarden para compartir los cambios con la clase.' : 'Pueden seguir creando cuando quieran.'}</span></div></div><button type="button" className="action-primary editor-save-button" onClick={save} disabled={disabled || recording || !!conflict || !dirty}>{saving ? <Loader2 size={18} className="editor-spin" /> : dirty ? <Save size={18} /> : <Check size={18} />}<span>{saveLabel}</span></button></div></footer>
  </main>;
}

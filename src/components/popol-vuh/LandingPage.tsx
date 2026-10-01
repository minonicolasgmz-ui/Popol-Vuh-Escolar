'use client';

import { useState } from 'react';
import { ArrowRight, BookOpen, Mic, PenLine, Shield, Users } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { Brand, EditorialMark } from './EditorialMark';

export default function LandingPage() {
  const { group, isAdmin, setGroup, setView } = useAppStore();
  const [student1, setStudent1] = useState('');
  const [student2, setStudent2] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const enter = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!student1.trim() || !student2.trim()) { setError('Escriban los nombres de los dos integrantes.'); return; }
    setBusy(true); setError('');
    try {
      const response = await fetch('/api/groups', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ student1: student1.trim(), student2: student2.trim() }) });
      const result = await response.json();
      if (!response.ok || !result.id) throw new Error(result.error || 'No pudimos ingresar al equipo.');
      setGroup(result); setView('stages');
    } catch (error) { setError(error instanceof Error ? error.message : 'Revisá tu conexión e intentá de nuevo.'); }
    finally { setBusy(false); }
  };

  return <main className="landing-page">
    <header className="landing-header"><Brand /><button className="quiet-link" onClick={() => setView(isAdmin ? 'admin' : 'admin-login')}><Shield size={16} /> Acceso docente</button></header>
    <div className="landing-grid">
      <section className="landing-story" aria-labelledby="landing-title">
        <span className="eyebrow"><span className="tiny-star">✦</span> UNA HISTORIA QUE NOS REÚNE</span>
        <h1 id="landing-title">Un libro antiguo.<br />Una <em>nueva voz.</em></h1>
        <p className="landing-intro">El Popol Vuh cobra vida con sus palabras, sus imágenes y sus voces. Creemos juntos el libro de nuestra clase.</p>
        <div className="landing-read-action">
          <button className="action-secondary" type="button" onClick={() => setView('book')}><BookOpen size={18} />Abrir el libro<ArrowRight size={18} /></button>
          <p>Para leer y escuchar, no hace falta ingresar los nombres.</p>
        </div>
        <div className="landing-book-scene" aria-hidden="true">
          <div className="scene-orbit orbit-one" /><div className="scene-orbit orbit-two" />
          <span className="scene-star star-one">✦</span><span className="scene-star star-two">✧</span>
          <div className="showcase-book"><div className="showcase-cover"><small>EL LIBRO DEL CONSEJO</small><strong>Popol<br />Vuh</strong><EditorialMark /><span>PALABRAS · IMÁGENES · VOCES</span></div><div className="showcase-pages" /></div>
          <span className="scene-caption">Una creación colectiva, página a página.</span>
        </div>
      </section>
      <section className="entry-card paper-card" aria-labelledby="entry-title">
        <span className="entry-icon"><Users size={24} /></span>
        <span className="eyebrow">EL TALLER EMPIEZA ACÁ</span>
        <h2 id="entry-title">Dos autores.<br /> Un capítulo.</h2>
        <p>Ingresen los nombres de su pareja para comenzar a crear.</p>
        {group || isAdmin ? <div className="resume-team"><span className="eyebrow">SU SESIÓN SIGUE ABIERTA</span><strong>{group ? `${group.student1} y ${group.student2}` : 'Panel docente'}</strong><button className="action-primary" onClick={() => setView(isAdmin ? 'admin' : 'stages')}>Continuar <ArrowRight size={18} /></button><button className="quiet-link" onClick={async () => { try { await useAppStore.getState().reset(); } catch { setError('No pudimos cerrar la sesión. Intentá de nuevo.'); } }}>Cambiar de equipo</button></div>
          : <form onSubmit={enter} className="entry-form">
            <label htmlFor="student1">Primer integrante<input id="student1" value={student1} maxLength={80} onChange={(e) => setStudent1(e.target.value)} placeholder="Nombre y apellido" autoComplete="off" required disabled={busy} /></label>
            <label htmlFor="student2">Segundo integrante<input id="student2" value={student2} maxLength={80} onChange={(e) => setStudent2(e.target.value)} placeholder="Nombre y apellido" autoComplete="off" required disabled={busy} /></label>
            <button className="action-primary" disabled={busy} type="submit">{busy ? 'Preparando el taller…' : 'Comenzar nuestro capítulo'}<ArrowRight size={18} /></button>
          </form>}
        {error && <p className="error-notice" role="alert">{error}</p>}
        <div className="entry-note"><span>01</span> Elijan un capítulo. <span>02</span> Háganlo suyo.</div>
      </section>
    </div>
    <footer className="landing-footer"><span>UN RELATO. MUCHAS MIRADAS.</span><div><span><PenLine size={16} /> Escribir</span><i /><span><BookOpen size={16} /> Ilustrar</span><i /><span><Mic size={16} /> Narrar</span></div><span>HECHO POR NUESTRA CLASE</span></footer>
  </main>;
}

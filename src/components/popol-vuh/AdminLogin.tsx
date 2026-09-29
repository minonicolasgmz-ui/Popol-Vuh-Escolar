'use client';

import { useState } from 'react';
import { ArrowLeft, ArrowRight, Shield } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { Brand } from './EditorialMark';

export default function AdminLogin() {
  const { setView, setIsAdmin } = useAppStore();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); setBusy(true); setError('');
    try {
      const response = await fetch('/api/admin/session', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'No pudimos ingresar.');
      setIsAdmin(true); setView('admin');
    } catch (error) { setError(error instanceof Error ? error.message : 'Revisá la conexión.'); }
    finally { setBusy(false); }
  };
  return <main className="app-shell"><header className="workspace-header"><Brand /><button className="quiet-link" onClick={() => setView('landing')}><ArrowLeft size={17} /> Inicio</button></header><div className="admin-entry"><section className="paper-card entry-card"><span className="entry-icon"><Shield size={24} /></span><span className="eyebrow">ACOMPAÑAR LA CREACIÓN</span><h1>El espacio<br /><em>del docente.</em></h1><p>Revisá los capítulos y acompañá el libro de tu clase.</p><form className="entry-form" onSubmit={submit}><label htmlFor="admin-password">Contraseña<input id="admin-password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required disabled={busy} /></label>{error && <p className="error-notice" role="alert">{error}</p>}<button className="action-primary" disabled={busy}>{busy ? 'Verificando…' : 'Ingresar al taller'}<ArrowRight size={18} /></button></form></section></div></main>;
}

'use client';

import { useState } from 'react';
import { useAppStore } from '@/lib/store';
import { Shield, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function AdminLogin() {
  const { setView, setIsAdmin } = useAppStore();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Simple password check - in production this should be server-side
    const ADMIN_PASSWORD = process.env.NEXT_PUBLIC_ADMIN_PASSWORD || 'popolvuh2024';

    if (password === ADMIN_PASSWORD) {
      setIsAdmin(true);

      // Fetch stages
      const stagesRes = await fetch('/api/stages');
      const stagesData = await stagesRes.json();
      useAppStore.getState().setStages(stagesData);

      setView('admin');
    } else {
      setError('Contraseña incorrecta');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-black p-4">
      <div className="w-full max-w-sm">
        <Button
          onClick={() => setView('landing')}
          variant="ghost"
          className="text-neutral-400 hover:text-white mb-8"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Volver
        </Button>

        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full border-2 border-jade/30 bg-jade/10 mb-4">
            <Shield className="w-8 h-8 text-jade" />
          </div>
          <h2 className="text-2xl font-serif font-bold text-white">Acceso Docente</h2>
          <p className="text-neutral-500 text-sm mt-1">Ingrese la contraseña de administrador</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 bg-neutral-950/80 border border-jade/20 rounded-2xl p-6">
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Contraseña"
            className="bg-neutral-900 border-neutral-800 text-white placeholder:text-neutral-600 focus:border-jade focus:ring-jade/20"
          />

          {error && <p className="text-red-400 text-sm text-center">{error}</p>}

          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-jade hover:bg-jade-dark text-black font-semibold"
          >
            {loading ? 'Verificando...' : 'Ingresar'}
          </Button>
        </form>
      </div>
    </div>
  );
}

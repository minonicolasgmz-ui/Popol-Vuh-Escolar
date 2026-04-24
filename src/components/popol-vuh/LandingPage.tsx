'use client';

import { useState } from 'react';
import { useAppStore } from '@/lib/store';
import { Book, Users, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function LandingPage() {
  const { setView, setGroup, setStages } = useAppStore();
  const [student1, setStudent1] = useState('');
  const [student2, setStudent2] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!student1.trim() || !student2.trim()) {
      setError('Ambos nombres son requeridos');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ student1: student1.trim(), student2: student2.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Error al crear grupo');
        return;
      }

      setGroup(data);

      // Fetch stages
      const stagesRes = await fetch('/api/stages');
      const stagesData = await stagesRes.json();
      setStages(stagesData);

      setView('stages');
    } catch {
      setError('Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-black p-4">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-jade/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-jade/3 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-lg">
        {/* Logo / Title */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full border-2 border-jade/30 bg-jade/10 mb-6">
            <Book className="w-10 h-10 text-jade" />
          </div>
          <h1 className="text-4xl md:text-5xl font-serif font-bold text-white mb-3">
            Popol Vuh
          </h1>
          <p className="text-jade/70 text-lg font-light tracking-wide">
            El Libro del Consejo Maya
          </p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-6 bg-neutral-950/80 backdrop-blur-sm border border-jade/20 rounded-2xl p-8 shadow-2xl shadow-jade/5">
          <div className="flex items-center gap-2 mb-4">
            <Users className="w-5 h-5 text-jade" />
            <h2 className="text-xl text-white font-medium">Ingresen sus nombres</h2>
          </div>

          <div className="space-y-2">
            <Label htmlFor="student1" className="text-neutral-300 text-sm">
              Alumno/a 1
            </Label>
            <Input
              id="student1"
              value={student1}
              onChange={(e) => setStudent1(e.target.value)}
              placeholder="Nombre del primer alumno/a"
              className="bg-neutral-900 border-neutral-800 text-white placeholder:text-neutral-600 focus:border-jade focus:ring-jade/20"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="student2" className="text-neutral-300 text-sm">
              Alumno/a 2
            </Label>
            <Input
              id="student2"
              value={student2}
              onChange={(e) => setStudent2(e.target.value)}
              placeholder="Nombre del segundo alumno/a"
              className="bg-neutral-900 border-neutral-800 text-white placeholder:text-neutral-600 focus:border-jade focus:ring-jade/20"
            />
          </div>

          {error && (
            <p className="text-red-400 text-sm text-center">{error}</p>
          )}

          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-jade hover:bg-jade-dark text-black font-semibold py-3 text-base transition-all duration-200 hover:shadow-lg hover:shadow-jade/20"
          >
            {loading ? 'Ingresando...' : 'Ingresar'}
          </Button>

          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-neutral-800" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-neutral-950 px-3 text-neutral-500">o</span>
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            onClick={() => setView('admin-login')}
            className="w-full border-neutral-800 text-neutral-400 hover:text-white hover:border-jade/50 hover:bg-jade/5 transition-all duration-200"
          >
            <Shield className="w-4 h-4 mr-2" />
            Acceso Docente
          </Button>
        </form>
      </div>
    </div>
  );
}

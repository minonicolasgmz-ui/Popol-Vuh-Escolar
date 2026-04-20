'use client';

import { useEffect } from 'react';
import { useAppStore } from '@/lib/store';
import LandingPage from '@/components/popol-vuh/LandingPage';
import StageSelection from '@/components/popol-vuh/StageSelection';
import StageEditor from '@/components/popol-vuh/StageEditor';
import BookViewer from '@/components/popol-vuh/BookViewer';
import AdminLogin from '@/components/popol-vuh/AdminLogin';
import AdminPanel from '@/components/popol-vuh/AdminPanel';

export default function Home() {
  const { view, hydrated, hydrate, setStages, group, isAdmin } = useAppStore();

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (hydrated && (group || isAdmin)) {
      fetch('/api/stages')
        .then((res) => res.json())
        .then((data) => setStages(data))
        .catch(() => {});
    }
  }, [hydrated, group, isAdmin, setStages]);

  if (!hydrated) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-2 border-jade border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-jade/60 text-sm">Cargando...</p>
        </div>
      </div>
    );
  }

  switch (view) {
    case 'landing':
      return <LandingPage />;
    case 'stages':
      return <StageSelection />;
    case 'editor':
      return <StageEditor />;
    case 'book':
      return <BookViewer />;
    case 'admin-login':
      return <AdminLogin />;
    case 'admin':
      return <AdminPanel />;
    default:
      return <LandingPage />;
  }
}

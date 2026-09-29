'use client';

import { useEffect } from 'react';
import dynamic from 'next/dynamic';
import { usePathname } from 'next/navigation';
import { pathView, useAppStore } from '@/lib/store';
import LandingPage from '@/components/popol-vuh/LandingPage';
import StageSelection from '@/components/popol-vuh/StageSelection';
import AdminLogin from '@/components/popol-vuh/AdminLogin';

const StageEditor = dynamic(() => import('@/components/popol-vuh/StageEditor'), { loading: () => <LoadingScreen /> });
const BookViewer = dynamic(() => import('@/components/popol-vuh/BookViewer'), { loading: () => <LoadingScreen /> });
const AdminPanel = dynamic(() => import('@/components/popol-vuh/AdminPanel'), { loading: () => <LoadingScreen /> });

function LoadingScreen() {
  return <main className="loading-screen" aria-busy="true"><span className="loading-orbit" aria-hidden="true" /><p>Preparando nuestra historia…</p></main>;
}

export default function Home() {
  const pathname = usePathname();
  const { view, stageId } = pathView(pathname);
  const { hydrated, hydrate, group, isAdmin, sessionError } = useAppStore();

  useEffect(() => { void hydrate(); }, [hydrate]);
  useEffect(() => { useAppStore.setState({ view, selectedStageId: stageId }); }, [view, stageId]);
  useEffect(() => {
    if (!hydrated || sessionError) return;
    const protectedView = ['stages', 'editor', 'book', 'admin'].includes(view);
    if (protectedView && !group && !isAdmin) useAppStore.getState().setView(view === 'admin' ? 'admin-login' : 'landing');
    else if (view === 'admin' && !isAdmin) useAppStore.getState().setView('stages');
  }, [hydrated, group, isAdmin, sessionError, view]);

  if (!hydrated) return <LoadingScreen />;
  if (sessionError) return <main className="loading-screen"><div className="paper-card connection-card"><h1>Volvamos a conectar</h1><p>{sessionError}</p><button className="action-primary" onClick={() => void hydrate()}>Reintentar</button></div></main>;
  if (view === 'landing') return <LandingPage />;
  if (view === 'admin-login') return <AdminLogin />;
  if (!group && !isAdmin) return <LoadingScreen />;
  if (view === 'editor') return <StageEditor key={stageId} />;
  if (view === 'book') return <BookViewer />;
  if (view === 'admin') return isAdmin ? <AdminPanel /> : <LoadingScreen />;
  return <StageSelection />;
}

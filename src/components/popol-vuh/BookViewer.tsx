'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { useAppStore } from '@/lib/store';
import { ArrowLeft, ChevronLeft, ChevronRight, Volume2, Pause, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';

const PAGE_BG = 'bg-gradient-to-br from-amber-50 to-amber-100/90';
const SHADOW_L = 'shadow-[inset_-7px_0_15px_-7px_rgba(0,0,0,0.15),0_0_30px_rgba(0,0,0,0.3)]';
const SHADOW_R = 'shadow-[inset_7px_0_15px_-7px_rgba(0,0,0,0.15),0_0_30px_rgba(0,0,0,0.3)]';

interface StageWithGroup {
  id: string;
  number: number;
  title: string;
  description: string;
  text: string | null;
  imageUrl: string | null;
  audioData: string | null;
  groupId: string | null;
  group: { student1: string; student2: string } | null;
}

function PageContent({
  side,
  stage,
  playingAudio,
  onPlayAudio,
}: {
  side: 'left' | 'right';
  stage: StageWithGroup | null;
  playingAudio: string | null;
  onPlayAudio: (id: string, data: string) => void;
}) {
  if (!stage) {
    return (
      <div className={`w-full h-full ${PAGE_BG} flex items-center justify-center ${side === 'left' ? SHADOW_L : SHADOW_R}`}>
        <p className="text-neutral-300 italic text-sm">Página en blanco</p>
      </div>
    );
  }

  if (side === 'left') {
    return (
      <div className={`w-full h-full ${PAGE_BG} ${SHADOW_L} p-6 md:p-10 flex flex-col relative overflow-hidden`}>
        <div className="absolute left-0 top-0 bottom-0 w-3 bg-gradient-to-r from-amber-200/40 to-transparent" />
        <div className="flex flex-col h-full">
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-1">
              <span className="w-6 h-6 rounded-full bg-jade text-white text-xs flex items-center justify-center font-bold shrink-0">
                {stage.number}
              </span>
              <h2 className="font-serif text-lg md:text-xl font-bold text-neutral-800">{stage.title}</h2>
            </div>
            {stage.group && (
              <p className="text-neutral-400 text-xs italic ml-8">
                Por {stage.group.student1} y {stage.group.student2}
              </p>
            )}
          </div>
          <div className="flex-1 overflow-y-auto pr-2 custom-scroll">
            <p className="text-neutral-700 text-sm md:text-base leading-relaxed whitespace-pre-wrap font-serif">
              {stage.text || 'Sin texto aún...'}
            </p>
          </div>
          {stage.audioData && (
            <div className="mt-4 pt-4 border-t border-amber-200/50">
              <button
                onClick={() => onPlayAudio(stage.id, stage.audioData!)}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  playingAudio === stage.id ? 'bg-red-500/20 text-red-600' : 'bg-jade/15 text-jade hover:bg-jade/25'
                }`}
              >
                {playingAudio === stage.id
                  ? <><Pause className="w-4 h-4" /> Pausar audio</>
                  : <><Volume2 className="w-4 h-4" /> Escuchar lectura</>}
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={`w-full h-full ${PAGE_BG} ${SHADOW_R} p-6 md:p-10 flex flex-col items-center justify-center relative overflow-hidden`}>
      <div className="absolute right-0 top-0 bottom-0 w-3 bg-gradient-to-l from-amber-200/40 to-transparent" />
      {stage.imageUrl ? (
        <img src={stage.imageUrl} alt={stage.title} className="max-w-full max-h-[450px] md:max-h-[520px] object-contain rounded-lg shadow-lg" />
      ) : (
        <p className="text-neutral-400 italic text-sm">Sin imagen aún</p>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════ */
export default function BookViewer() {
  const { stages, setView } = useAppStore();
  const [currentPage, setCurrentPage] = useState(0);
  const [flipping, setFlipping] = useState<'next' | 'prev' | null>(null);
  const [playingAudio, setPlayingAudio] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const completedStages = stages.filter((s) => s.text || s.imageUrl) as StageWithGroup[];
  const totalPages = completedStages.length;
  const currentStage = completedStages[currentPage];
  const nextStage = completedStages[currentPage + 1];
  const prevStage = completedStages[currentPage - 1];

  useEffect(() => {
    return () => { if (audioRef.current) audioRef.current.pause(); };
  }, []);

  const playAudio = useCallback((stageId: string, audioData: string) => {
    if (playingAudio === stageId && audioRef.current) {
      audioRef.current.pause(); audioRef.current = null; setPlayingAudio(null); return;
    }
    if (audioRef.current) audioRef.current.pause();
    const audio = new Audio(`data:audio/webm;base64,${audioData}`);
    audioRef.current = audio;
    audio.onended = () => { setPlayingAudio(null); audioRef.current = null; };
    audio.play();
    setPlayingAudio(stageId);
  }, [playingAudio]);

  /* ── flip logic ── */
  const FLIP_MS = 800;

  const flipTo = useCallback(
    (target: number, dir: 'next' | 'prev') => {
      if (target < 0 || target >= totalPages || flipping) return;
      if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; setPlayingAudio(null); }
      setFlipping(dir);
      // After animation completes, update page and remove flipping overlay
      setTimeout(() => {
        setCurrentPage(target);
        setFlipping(null);
      }, FLIP_MS);
    },
    [flipping, totalPages],
  );

  /* Determine what the static pages show depending on flip state */
  const leftStage = flipping === 'prev' ? prevStage : currentStage;
  const rightStage = flipping === 'next' ? nextStage : currentStage;

  return (
    <div className="min-h-screen bg-gradient-to-b from-neutral-950 via-black to-neutral-950 flex flex-col items-center justify-center p-4 md:p-8 select-none">
      {/* Header */}
      <div className="w-full max-w-5xl flex items-center justify-between mb-6">
        <Button onClick={() => setView('stages')} variant="ghost" className="text-neutral-400 hover:text-white">
          <ArrowLeft className="w-4 h-4 mr-2" /> Volver
        </Button>
        <h1 className="text-lg md:text-xl font-serif text-jade font-bold flex items-center gap-2">
          <BookOpen className="w-5 h-5" /> Popol Vuh — El Libro Sagrado
        </h1>
        <div className="text-neutral-500 text-sm">
          {totalPages > 0 ? `${currentPage + 1} / ${totalPages}` : '—'}
        </div>
      </div>

      {totalPages === 0 ? (
        <div className="text-center text-neutral-500 py-20">
          <BookOpen className="w-16 h-16 mx-auto mb-4 text-neutral-700" />
          <p className="text-lg">Aún no hay contenido para mostrar</p>
          <p className="text-sm mt-2">Los alumnos deben completar las etapas primero</p>
        </div>
      ) : (
        /* ── BOOK ── */
        <div className="w-full max-w-5xl flex-1 flex items-center justify-center" style={{ perspective: '2500px' }}>
          <div className="relative w-full" style={{ transformStyle: 'preserve-3d' }}>
            <div className="relative w-full flex min-h-[500px] md:min-h-[600px]" style={{ transformStyle: 'preserve-3d' }}>

              {/* ── STATIC LEFT PAGE ── */}
              <div className="w-1/2 relative z-0 rounded-l-xl overflow-hidden">
                <PageContent side="left" stage={leftStage} playingAudio={playingAudio} onPlayAudio={playAudio} />
              </div>

              {/* ── STATIC RIGHT PAGE ── */}
              <div className="w-1/2 relative z-0 rounded-r-xl overflow-hidden">
                <PageContent side="right" stage={rightStage} playingAudio={playingAudio} onPlayAudio={playAudio} />
              </div>

              {/* ═══ FLIP NEXT ═══ */}
              {flipping === 'next' && (
                <div
                  className="absolute top-0 right-0 w-1/2 h-full z-20"
                  style={{
                    transformOrigin: 'left center',
                    transformStyle: 'preserve-3d',
                    animation: 'pageFlipNext 0.8s cubic-bezier(0.645, 0.045, 0.355, 1) forwards',
                  }}
                >
                  {/* Front face: current image page */}
                  <div className="absolute inset-0" style={{ backfaceVisibility: 'hidden' }}>
                    <div className="w-full h-full rounded-r-xl overflow-hidden">
                      <PageContent side="right" stage={currentStage} playingAudio={null} onPlayAudio={() => {}} />
                    </div>
                  </div>
                  {/* Back face: next text page */}
                  <div className="absolute inset-0" style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}>
                    <div className="w-full h-full rounded-l-xl overflow-hidden">
                      <PageContent side="left" stage={nextStage} playingAudio={null} onPlayAudio={() => {}} />
                    </div>
                  </div>
                </div>
              )}

              {/* ═══ FLIP PREV ═══ */}
              {flipping === 'prev' && (
                <div
                  className="absolute top-0 left-0 w-1/2 h-full z-20"
                  style={{
                    transformOrigin: 'right center',
                    transformStyle: 'preserve-3d',
                    animation: 'pageFlipPrev 0.8s cubic-bezier(0.645, 0.045, 0.355, 1) forwards',
                  }}
                >
                  {/* Front face: current text page */}
                  <div className="absolute inset-0" style={{ backfaceVisibility: 'hidden' }}>
                    <div className="w-full h-full rounded-l-xl overflow-hidden">
                      <PageContent side="left" stage={currentStage} playingAudio={null} onPlayAudio={() => {}} />
                    </div>
                  </div>
                  {/* Back face: previous image page */}
                  <div className="absolute inset-0" style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}>
                    <div className="w-full h-full rounded-r-xl overflow-hidden">
                      <PageContent side="right" stage={prevStage} playingAudio={null} onPlayAudio={() => {}} />
                    </div>
                  </div>
                </div>
              )}

              {/* ── Spine ── */}
              <div className="absolute left-1/2 top-0 bottom-0 w-[3px] -translate-x-1/2 z-30 pointer-events-none">
                <div className="w-full h-full bg-gradient-to-b from-amber-300/60 via-amber-500/90 to-amber-300/60 rounded-full" />
                <div className="absolute -left-4 top-0 bottom-0 w-4 bg-gradient-to-r from-transparent to-black/10" />
                <div className="absolute -right-4 top-0 bottom-0 w-4 bg-gradient-to-l from-transparent to-black/10" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Navigation ── */}
      {totalPages > 0 && (
        <div className="flex items-center gap-6 mt-8">
          <Button
            onClick={() => flipTo(currentPage - 1, 'prev')}
            disabled={currentPage === 0 || !!flipping}
            variant="outline"
            className="border-neutral-800 text-neutral-400 hover:text-white hover:border-jade/50 disabled:opacity-30"
          >
            <ChevronLeft className="w-5 h-5" />
            <span className="hidden sm:inline ml-1">Anterior</span>
          </Button>

          <div className="flex gap-1.5 max-w-xs overflow-x-auto py-2">
            {completedStages.map((_, idx) => (
              <button
                key={idx}
                onClick={() => { if (idx !== currentPage && !flipping) flipTo(idx, idx > currentPage ? 'next' : 'prev'); }}
                className={`w-2.5 h-2.5 rounded-full transition-all ${idx === currentPage ? 'bg-jade scale-125' : 'bg-neutral-700 hover:bg-neutral-500'}`}
              />
            ))}
          </div>

          <Button
            onClick={() => flipTo(currentPage + 1, 'next')}
            disabled={currentPage === totalPages - 1 || !!flipping}
            variant="outline"
            className="border-neutral-800 text-neutral-400 hover:text-white hover:border-jade/50 disabled:opacity-30"
          >
            <span className="hidden sm:inline mr-1">Siguiente</span>
            <ChevronRight className="w-5 h-5" />
          </Button>
        </div>
      )}
    </div>
  );
}

'use client';

import { useState, useRef } from 'react';
import { useAppStore } from '@/lib/store';
import { ArrowLeft, ChevronLeft, ChevronRight, Volume2, Pause, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function BookViewer() {
  const { stages, setView } = useAppStore();
  const [currentPage, setCurrentPage] = useState(0);
  const [isFlipping, setIsFlipping] = useState(false);
  const [flipDirection, setFlipDirection] = useState<'next' | 'prev'>('next');
  const [playingAudio, setPlayingAudio] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Each stage is one "spread" in the book (2 pages)
  const completedStages = stages.filter((s) => s.text || s.imageUrl);
  const totalPages = completedStages.length;

  const currentStage = completedStages[currentPage];

  const goToPage = (page: number, direction: 'next' | 'prev') => {
    if (page < 0 || page >= totalPages || isFlipping) return;

    // Stop audio if playing
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
      setPlayingAudio(null);
    }

    setFlipDirection(direction);
    setIsFlipping(true);
    setTimeout(() => {
      setCurrentPage(page);
      setIsFlipping(false);
    }, 400);
  };

  const playAudio = (stageId: string, audioDataBase64: string) => {
    if (playingAudio === stageId && audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
      setPlayingAudio(null);
      return;
    }

    if (audioRef.current) {
      audioRef.current.pause();
    }

    const audio = new Audio(`data:audio/webm;base64,${audioDataBase64}`);
    audioRef.current = audio;
    audio.onended = () => {
      setPlayingAudio(null);
      audioRef.current = null;
    };
    audio.play();
    setPlayingAudio(stageId);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-neutral-950 via-black to-neutral-950 flex flex-col items-center justify-center p-4 md:p-8">
      {/* Header */}
      <div className="w-full max-w-5xl flex items-center justify-between mb-6">
        <Button
          onClick={() => setView('stages')}
          variant="ghost"
          className="text-neutral-400 hover:text-white"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Volver
        </Button>
        <h1 className="text-lg md:text-xl font-serif text-jade font-bold flex items-center gap-2">
          <BookOpen className="w-5 h-5" />
          Popol Vuh — El Libro Sagrado
        </h1>
        <div className="text-neutral-500 text-sm">
          {currentPage + 1} / {totalPages}
        </div>
      </div>

      {/* Book Container */}
      {totalPages === 0 ? (
        <div className="text-center text-neutral-500 py-20">
          <BookOpen className="w-16 h-16 mx-auto mb-4 text-neutral-700" />
          <p className="text-lg">Aún no hay contenido para mostrar</p>
          <p className="text-sm mt-2">Los alumnos deben completar las etapas primero</p>
        </div>
      ) : (
        <div className="w-full max-w-5xl flex-1 flex items-center justify-center">
          <div className="relative w-full" style={{ perspective: '2000px' }}>
            {/* Book */}
            <div className="flex items-stretch justify-center gap-0 min-h-[500px] md:min-h-[600px]">
              {/* Left Page - Text */}
              <div
                className={`w-1/2 bg-gradient-to-br from-amber-50 to-amber-100/90 rounded-l-xl shadow-2xl p-6 md:p-10 flex flex-col justify-between transition-all duration-400 ${
                  isFlipping && flipDirection === 'next'
                    ? 'animate-flip-left'
                    : isFlipping && flipDirection === 'prev'
                    ? 'animate-flip-left-back'
                    : ''
                }`}
                style={{
                  boxShadow: 'inset -7px 0 15px -7px rgba(0,0,0,0.15), 0 0 30px rgba(0,0,0,0.3)',
                  transformOrigin: 'right center',
                }}
              >
                {currentStage && (
                  <div className="flex flex-col h-full">
                    <div className="mb-4">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="w-6 h-6 rounded-full bg-jade text-white text-xs flex items-center justify-center font-bold">
                          {currentStage.number}
                        </span>
                        <h2 className="font-serif text-lg md:text-xl font-bold text-neutral-800">
                          {currentStage.title}
                        </h2>
                      </div>
                      {currentStage.group && (
                        <p className="text-neutral-400 text-xs italic ml-8">
                          Por {currentStage.group.student1} y {currentStage.group.student2}
                        </p>
                      )}
                    </div>

                    <div className="flex-1 overflow-y-auto pr-2">
                      <p className="text-neutral-700 text-sm md:text-base leading-relaxed whitespace-pre-wrap font-serif">
                        {currentStage.text || 'Sin texto aún...'}
                      </p>
                    </div>

                    {/* Audio button on text page */}
                    {currentStage.audioData && (
                      <div className="mt-4 pt-4 border-t border-amber-200/50">
                        <button
                          onClick={() => playAudio(currentStage.id, currentStage.audioData!)}
                          className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                            playingAudio === currentStage.id
                              ? 'bg-red-500/20 text-red-600'
                              : 'bg-jade/15 text-jade hover:bg-jade/25'
                          }`}
                        >
                          {playingAudio === currentStage.id ? (
                            <>
                              <Pause className="w-4 h-4" />
                              Pausar audio
                            </>
                          ) : (
                            <>
                              <Volume2 className="w-4 h-4" />
                              Escuchar lectura
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Page edge decoration */}
                <div className="absolute left-0 top-0 bottom-0 w-3 bg-gradient-to-r from-amber-200/40 to-transparent rounded-l-xl" />
              </div>

              {/* Right Page - Image */}
              <div
                className={`w-1/2 bg-gradient-to-bl from-amber-50 to-amber-100/90 rounded-r-xl shadow-2xl p-6 md:p-10 flex flex-col items-center justify-center transition-all duration-400 ${
                  isFlipping && flipDirection === 'next'
                    ? 'animate-flip-right'
                    : isFlipping && flipDirection === 'prev'
                    ? 'animate-flip-right-back'
                    : ''
                }`}
                style={{
                  boxShadow: 'inset 7px 0 15px -7px rgba(0,0,0,0.15), 0 0 30px rgba(0,0,0,0.3)',
                  transformOrigin: 'left center',
                }}
              >
                {currentStage && (
                  <>
                    {currentStage.imageUrl ? (
                      <div className="w-full h-full flex items-center justify-center">
                        <img
                          src={currentStage.imageUrl}
                          alt={currentStage.title}
                          className="max-w-full max-h-[450px] md:max-h-[520px] object-contain rounded-lg shadow-lg"
                        />
                      </div>
                    ) : (
                      <div className="text-neutral-400 text-center">
                        <p className="text-sm italic">Sin imagen aún</p>
                      </div>
                    )}
                  </>
                )}

                {/* Page edge decoration */}
                <div className="absolute right-0 top-0 bottom-0 w-3 bg-gradient-to-l from-amber-200/40 to-transparent rounded-r-xl" />
              </div>
            </div>

            {/* Book spine */}
            <div className="absolute left-1/2 top-0 bottom-0 w-1 bg-gradient-to-b from-amber-300/60 via-amber-400/80 to-amber-300/60 -translate-x-1/2 z-10" />
          </div>
        </div>
      )}

      {/* Navigation */}
      {totalPages > 0 && (
        <div className="flex items-center gap-6 mt-8">
          <Button
            onClick={() => goToPage(currentPage - 1, 'prev')}
            disabled={currentPage === 0 || isFlipping}
            variant="outline"
            className="border-neutral-800 text-neutral-400 hover:text-white hover:border-jade/50 disabled:opacity-30"
          >
            <ChevronLeft className="w-5 h-5" />
            <span className="hidden sm:inline ml-1">Anterior</span>
          </Button>

          {/* Page indicators */}
          <div className="flex gap-1.5 max-w-xs overflow-x-auto py-2">
            {completedStages.map((_, idx) => (
              <button
                key={idx}
                onClick={() => goToPage(idx, idx > currentPage ? 'next' : 'prev')}
                className={`w-2.5 h-2.5 rounded-full transition-all ${
                  idx === currentPage
                    ? 'bg-jade scale-125'
                    : 'bg-neutral-700 hover:bg-neutral-500'
                }`}
              />
            ))}
          </div>

          <Button
            onClick={() => goToPage(currentPage + 1, 'next')}
            disabled={currentPage === totalPages - 1 || isFlipping}
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

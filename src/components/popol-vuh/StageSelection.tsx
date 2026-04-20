'use client';

import { useEffect } from 'react';
import { useAppStore, StageData } from '@/lib/store';
import { BookOpen, Lock, User, LogOut, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function StageSelection() {
  const { stages, group, setView, setSelectedStageId, setStages } = useAppStore();

  // Refresh stages on mount to get latest data
  useEffect(() => {
    fetch('/api/stages')
      .then((res) => res.json())
      .then((data) => setStages(data))
      .catch(() => {});
  }, [setStages]);

  const handleSelectStage = async (stage: StageData) => {
    const myStages = stages.filter((s) => s.groupId === group?.id);

    // If group already has a stage, they can only click on their own stage
    if (myStages.length > 0) {
      if (stage.groupId === group?.id) {
        // Open their own stage for editing
        setSelectedStageId(stage.id);
        setView('editor');
      }
      // Otherwise, ignore the click
      return;
    }

    // No stage claimed yet - claim this one
    if (stage.groupId && stage.groupId !== group?.id) {
      return; // Already claimed by another group
    }

    if (!stage.groupId) {
      try {
        const res = await fetch(`/api/stages/${stage.id}/claim`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ groupId: group?.id }),
        });

        if (res.status === 409) {
          // Stage was just claimed by someone else, refresh
          const stagesRes = await fetch('/api/stages');
          const stagesData = await stagesRes.json();
          useAppStore.getState().setStages(stagesData);
          return;
        }

        const updatedStage = await res.json();
        useAppStore.getState().updateStage(updatedStage);
      } catch {
        return;
      }
    }

    setSelectedStageId(stage.id);
    setView('editor');
  };

  const isStageClaimedByMe = (stage: StageData) => stage.groupId === group?.id;
  const isStageClaimedByOther = (stage: StageData) => stage.groupId !== null && stage.groupId !== group?.id;
  const isStageComplete = (stage: StageData) => stage.text && stage.imageUrl && stage.audioData;

  const myStages = stages.filter((s) => s.groupId === group?.id);
  const hasClaimedStage = myStages.length > 0;
  const allComplete = stages.every((s) => s.text && s.imageUrl && s.audioData);

  return (
    <div className="min-h-screen bg-black text-white p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-serif font-bold">
              <span className="text-jade">Popol Vuh</span>
            </h1>
            <p className="text-neutral-400 mt-1">
              Bienvenidos, <span className="text-jade">{group?.student1}</span> y{' '}
              <span className="text-jade">{group?.student2}</span>
            </p>
          </div>

          <div className="flex gap-3">
            <Button
              onClick={() => setView('book')}
              variant="outline"
              className="border-neutral-800 text-neutral-400 hover:text-white hover:border-jade/50"
            >
              <Eye className="w-4 h-4 mr-2" />
              Libro
            </Button>
            <Button
              onClick={() => useAppStore.getState().reset()}
              variant="ghost"
              className="text-neutral-500 hover:text-red-400"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Salir
            </Button>
          </div>
        </div>

        {/* My Stage - Prominent */}
        {hasClaimedStage && (
          <div className="mb-8 p-5 rounded-xl border border-jade/30 bg-jade/5">
            <h3 className="text-jade font-medium mb-3">Mi etapa asignada:</h3>
            {myStages.map((stage) => (
              <button
                key={stage.id}
                onClick={() => {
                  setSelectedStageId(stage.id);
                  setView('editor');
                }}
                className={`w-full text-left px-5 py-4 rounded-lg font-medium transition-all flex items-center justify-between ${
                  isStageComplete(stage)
                    ? 'bg-jade text-black hover:bg-jade-dark'
                    : 'bg-jade/20 text-jade hover:bg-jade/30 border border-jade/30'
                }`}
              >
                <div>
                  <span className="font-serif font-bold text-lg">{stage.number}. {stage.title}</span>
                  <p className={`text-sm mt-1 ${isStageComplete(stage) ? 'text-black/70' : 'text-jade/60'}`}>
                    {isStageComplete(stage) ? 'Completa — clic para editar' : 'En progreso — clic para continuar editando'}
                  </p>
                </div>
                <BookOpen className={`w-5 h-5 ${isStageComplete(stage) ? 'text-black/50' : 'text-jade/40'}`} />
              </button>
            ))}
          </div>
        )}

        {/* Info message when group has a stage */}
        {hasClaimedStage && (
          <div className="mb-6 px-4 py-3 rounded-lg bg-neutral-900/50 border border-neutral-800 text-neutral-500 text-sm">
            Las demás etapas están asignadas a otros grupos. Solo puedes editar tu etapa.
          </div>
        )}

        {/* Stage Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {stages.map((stage) => {
            const claimedByMe = isStageClaimedByMe(stage);
            const claimedByOther = isStageClaimedByOther(stage);
            const complete = isStageComplete(stage);
            const isDisabled = claimedByOther || (hasClaimedStage && !claimedByMe);

            return (
              <button
                key={stage.id}
                onClick={() => handleSelectStage(stage)}
                disabled={isDisabled}
                className={`relative group p-5 rounded-xl border text-left transition-all duration-300 ${
                  isDisabled
                    ? 'border-neutral-800 bg-neutral-950/50 cursor-not-allowed opacity-50'
                    : claimedByMe
                    ? 'border-jade/40 bg-jade/5 hover:border-jade/60 hover:bg-jade/10 cursor-pointer'
                    : 'border-neutral-800 bg-neutral-950/80 hover:border-jade/30 hover:bg-neutral-900/80 cursor-pointer'
                }`}
              >
                {/* Stage Number */}
                <div className={`absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                  claimedByMe ? 'bg-jade text-black' : 'bg-neutral-800 text-neutral-400'
                }`}>
                  {stage.number}
                </div>

                {/* Title */}
                <h3 className={`font-serif font-bold text-base mb-2 pr-10 ${
                  isDisabled ? 'text-neutral-500' : 'text-white'
                }`}>
                  {stage.title}
                </h3>

                {/* Description */}
                <p className="text-xs text-neutral-500 line-clamp-2 mb-3">
                  {stage.description}
                </p>

                {/* Status */}
                <div className="flex items-center gap-2 text-xs">
                  {claimedByOther ? (
                    <>
                      <Lock className="w-3 h-3 text-neutral-600" />
                      <span className="text-neutral-600">
                        <User className="w-3 h-3 inline mr-1" />
                        {stage.group?.student1} y {stage.group?.student2}
                      </span>
                    </>
                  ) : claimedByMe ? (
                    <span className={`flex items-center gap-1 ${complete ? 'text-jade' : 'text-yellow-500'}`}>
                      {complete ? 'Completa' : 'En progreso'}
                    </span>
                  ) : hasClaimedStage ? (
                    <span className="text-neutral-600">No disponible</span>
                  ) : (
                    <span className="text-jade/60">Disponible</span>
                  )}
                </div>

                {/* Hover Effect */}
                {!isDisabled && (
                  <div className="absolute inset-0 rounded-xl bg-jade/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

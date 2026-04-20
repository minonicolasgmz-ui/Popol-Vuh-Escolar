'use client';

import { useState, useEffect, useRef } from 'react';
import { useAppStore, StageData } from '@/lib/store';
import { Trash2, Edit3, Save, X, Users, BookOpen, LogOut, Volume2, Pause, ImagePlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import AudioRecorder from './AudioRecorder';

export default function AdminPanel() {
  const { stages, setView, setStages, updateStage } = useAppStore();
  const [editingStageId, setEditingStageId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [editImageUrl, setEditImageUrl] = useState<string | null>(null);
  const [editAudioData, setEditAudioData] = useState('');
  const [playingAudio, setPlayingAudio] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'stages' | 'book'>('stages');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const startEditing = (stage: StageData) => {
    setEditingStageId(stage.id);
    setEditText(stage.text || '');
    setEditImageUrl(stage.imageUrl || null);
    setEditAudioData(stage.audioData || '');
  };

  const cancelEditing = () => {
    setEditingStageId(null);
    setEditText('');
    setEditImageUrl(null);
    setEditAudioData('');
  };

  const saveEditing = async (stageId: string) => {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/stages/${stageId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: editText || null,
          imageUrl: editImageUrl || null,
          audioData: editAudioData || null,
        }),
      });
      const updatedStage = await res.json();
      updateStage(updatedStage);
      setEditingStageId(null);
    } catch {
      alert('Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const resetStage = async (stageId: string) => {
    if (!confirm('¿Estás seguro de que quieres resetear esta etapa? Se borrará todo el contenido y la asignación del grupo.')) return;

    try {
      const res = await fetch(`/api/admin/stages/${stageId}`, { method: 'DELETE' });
      const updatedStage = await res.json();
      updateStage(updatedStage);
    } catch {
      alert('Error al resetear');
    }
  };

  const playAudio = (stageId: string, audioDataBase64: string) => {
    if (playingAudio === stageId) {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
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

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setEditImageUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const refreshStages = async () => {
    const res = await fetch('/api/stages');
    const data = await res.json();
    setStages(data);
  };

  useEffect(() => {
    refreshStages();
  }, []);

  return (
    <div className="min-h-screen bg-black text-white p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-serif font-bold">
              <span className="text-jade">Panel</span> Docente
            </h1>
            <p className="text-neutral-500 text-sm mt-1">Administrar etapas del Popol Vuh</p>
          </div>
          <div className="flex gap-3">
            <Button
              onClick={() => setView('book')}
              variant="outline"
              className="border-neutral-800 text-neutral-400 hover:text-white hover:border-jade/50"
            >
              <BookOpen className="w-4 h-4 mr-2" />
              Ver Libro
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

        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-neutral-950 p-1 rounded-lg w-fit">
          <button
            onClick={() => setActiveTab('stages')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
              activeTab === 'stages' ? 'bg-jade text-black' : 'text-neutral-400 hover:text-white'
            }`}
          >
            Etapas
          </button>
          <button
            onClick={() => setActiveTab('book')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
              activeTab === 'book' ? 'bg-jade text-black' : 'text-neutral-400 hover:text-white'
            }`}
          >
            Libro
          </button>
        </div>

        {activeTab === 'stages' && (
          <div className="space-y-4">
            {stages.map((stage) => {
              const isEditing = editingStageId === stage.id;

              return (
                <div
                  key={stage.id}
                  className={`rounded-xl border p-5 transition-all ${
                    isEditing
                      ? 'border-jade/40 bg-jade/5'
                      : 'border-neutral-800 bg-neutral-950/80'
                  }`}
                >
                  {/* Stage Header */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-start gap-3">
                      <span className="w-8 h-8 rounded-full bg-jade/20 text-jade text-sm flex items-center justify-center font-bold shrink-0">
                        {stage.number}
                      </span>
                      <div>
                        <h3 className="font-serif font-bold text-white">{stage.title}</h3>
                        <p className="text-neutral-500 text-xs">{stage.description}</p>
                        {stage.group && (
                          <p className="text-jade/60 text-xs mt-1 flex items-center gap-1">
                            <Users className="w-3 h-3" />
                            {stage.group.student1} y {stage.group.student2}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex gap-2 shrink-0 ml-4">
                      {!isEditing ? (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => startEditing(stage)}
                            className="border-neutral-700 text-neutral-400 hover:text-white hover:border-jade/50 h-8"
                          >
                            <Edit3 className="w-3.5 h-3.5 mr-1" />
                            Editar
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => resetStage(stage.id)}
                            className="border-neutral-700 text-red-400 hover:text-red-300 hover:border-red-500/50 h-8"
                          >
                            <Trash2 className="w-3.5 h-3.5 mr-1" />
                            Resetear
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button
                            size="sm"
                            onClick={() => saveEditing(stage.id)}
                            disabled={saving}
                            className="bg-jade hover:bg-jade-dark text-black h-8"
                          >
                            <Save className="w-3.5 h-3.5 mr-1" />
                            {saving ? 'Guardando...' : 'Guardar'}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={cancelEditing}
                            className="border-neutral-700 text-neutral-400 h-8"
                          >
                            <X className="w-3.5 h-3.5 mr-1" />
                            Cancelar
                          </Button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Content Preview or Editor */}
                  {isEditing ? (
                    <div className="space-y-4 mt-4 pt-4 border-t border-jade/20">
                      <div>
                        <label className="text-neutral-400 text-xs mb-1 block">Texto</label>
                        <Textarea
                          value={editText}
                          onChange={(e) => setEditText(e.target.value)}
                          className="min-h-[120px] bg-neutral-900 border-neutral-800 text-white focus:border-jade"
                        />
                      </div>

                      <div>
                        <label className="text-neutral-400 text-xs mb-1 block">Imagen</label>
                        {editImageUrl && (
                          <div className="relative group mb-2">
                            <img src={editImageUrl} alt="" className="max-h-40 rounded-lg object-contain bg-neutral-900" />
                            <button
                              onClick={() => setEditImageUrl(null)}
                              className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/70 text-red-400 hover:text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => fileInputRef.current?.click()}
                          className="border-neutral-700 text-neutral-400 hover:text-white hover:border-jade/50"
                        >
                          <ImagePlus className="w-3.5 h-3.5 mr-1" />
                          {editImageUrl ? 'Cambiar' : 'Subir'} imagen
                        </Button>
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          onChange={handleImageUpload}
                          className="hidden"
                        />
                      </div>

                      <div>
                        <label className="text-neutral-400 text-xs mb-1 block">Audio</label>
                        <AudioRecorder
                          onAudioRecorded={(base64) => setEditAudioData(base64)}
                          initialAudio={editAudioData || null}
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="mt-3 space-y-2">
                      <div className="flex flex-wrap gap-2">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs ${
                          stage.text ? 'bg-jade/15 text-jade' : 'bg-neutral-800 text-neutral-500'
                        }`}>
                          {stage.text ? '✓' : '✗'} Texto
                        </span>
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs ${
                          stage.imageUrl ? 'bg-jade/15 text-jade' : 'bg-neutral-800 text-neutral-500'
                        }`}>
                          {stage.imageUrl ? '✓' : '✗'} Imagen
                        </span>
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs ${
                          stage.audioData ? 'bg-jade/15 text-jade' : 'bg-neutral-800 text-neutral-500'
                        }`}>
                          {stage.audioData ? '✓' : '✗'} Audio
                        </span>
                      </div>

                      {stage.text && (
                        <p className="text-neutral-400 text-sm line-clamp-2">{stage.text}</p>
                      )}
                      {stage.imageUrl && (
                        <img src={stage.imageUrl} alt="" className="w-20 h-20 object-cover rounded-lg" />
                      )}
                      {stage.audioData && (
                        <button
                          onClick={() => playAudio(stage.id, stage.audioData!)}
                          className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-all ${
                            playingAudio === stage.id
                              ? 'bg-red-500/20 text-red-400'
                              : 'bg-jade/10 text-jade hover:bg-jade/20'
                          }`}
                        >
                          {playingAudio === stage.id ? (
                            <><Pause className="w-3 h-3" /> Pausar</>
                          ) : (
                            <><Volume2 className="w-3 h-3" /> Reproducir</>
                          )}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {activeTab === 'book' && (
          <div className="text-center py-12">
            <BookOpen className="w-16 h-16 mx-auto mb-4 text-jade/30" />
            <p className="text-neutral-400 mb-4">Vista previa del libro completo</p>
            <Button
              onClick={() => setView('book')}
              className="bg-jade hover:bg-jade-dark text-black font-semibold"
            >
              <BookOpen className="w-4 h-4 mr-2" />
              Abrir Libro
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

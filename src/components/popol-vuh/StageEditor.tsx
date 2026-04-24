'use client';

import { useState, useEffect, useRef } from 'react';
import { useAppStore } from '@/lib/store';
import { ArrowLeft, Save, ImagePlus, X, CheckCircle2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import AudioRecorder from './AudioRecorder';

export default function StageEditor() {
  const { stages, selectedStageId, setView, updateStage, group } = useAppStore();
  const stage = stages.find((s) => s.id === selectedStageId);

  const [text, setText] = useState('');
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [audioData, setAudioData] = useState<string>('');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (stage) {
      setText(stage.text || '');
      setImageUrl(stage.imageUrl || null);
      setAudioData(stage.audioData || '');
      if (stage.imageUrl) {
        setImagePreview(stage.imageUrl);
      }
    }
  }, [stage]);

  if (!stage) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center text-neutral-400">
        <p>Etapa no encontrada</p>
      </div>
    );
  }

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Por favor selecciona un archivo de imagen válido.');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      alert('La imagen es demasiado grande. El límite es 10MB.');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      setImageUrl(base64);
      setImagePreview(base64);
    };
    reader.readAsDataURL(file);
  };

  const removeImage = () => {
    setImageUrl(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);

    try {
      const res = await fetch(`/api/stages/${stage.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: text || null,
          imageUrl: imageUrl || null,
          audioData: audioData || null,
        }),
      });

      const updatedStage = await res.json();
      updateStage(updatedStage);
      setSaved(true);

      setTimeout(() => setSaved(false), 3000);
    } catch {
      alert('Error al guardar. Intenta de nuevo.');
    } finally {
      setSaving(false);
    }
  };

  const isComplete = text.trim() && imageUrl && audioData;

  return (
    <div className="min-h-screen bg-black text-white p-4 md:p-8">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <Button
            onClick={() => setView('stages')}
            variant="ghost"
            className="text-neutral-400 hover:text-white"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver a etapas
          </Button>

          <div className="flex items-center gap-3">
            {saved && (
              <span className="text-jade text-sm flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4" />
                Guardado
              </span>
            )}
            <Button
              onClick={handleSave}
              disabled={saving}
              className="bg-jade hover:bg-jade-dark text-black font-semibold transition-all"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Guardando...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Guardar
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Stage Title */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <span className="w-10 h-10 rounded-full bg-jade text-black flex items-center justify-center font-bold text-sm">
              {stage.number}
            </span>
            <div>
              <h1 className="text-2xl md:text-3xl font-serif font-bold text-white">
                {stage.title}
              </h1>
              <p className="text-neutral-500 text-sm">{stage.description}</p>
            </div>
          </div>
          {group && (
            <p className="text-jade/60 text-sm ml-13">
              Grupo: {group.student1} y {group.student2}
            </p>
          )}
        </div>

        {/* Content Sections */}
        <div className="space-y-8">
          {/* Text Section */}
          <div className="space-y-3">
            <label className="text-neutral-300 font-medium text-sm flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-jade/20 text-jade text-xs flex items-center justify-center font-bold">1</span>
              Escribe lo que sucedió en esta etapa
            </label>
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Describe los eventos principales de esta etapa del Popol Vuh..."
              className="min-h-[200px] bg-neutral-950 border-neutral-800 text-white placeholder:text-neutral-600 focus:border-jade focus:ring-jade/20 text-base leading-relaxed resize-y"
            />
            <p className="text-neutral-600 text-xs">
              {text.length} caracteres
            </p>
          </div>

          {/* Image Section */}
          <div className="space-y-3">
            <label className="text-neutral-300 font-medium text-sm flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-jade/20 text-jade text-xs flex items-center justify-center font-bold">2</span>
              Sube una imagen representativa
            </label>

            {imagePreview ? (
              <div className="relative group rounded-xl overflow-hidden border border-neutral-800">
                <img
                  src={imagePreview}
                  alt="Imagen representativa"
                  className="w-full max-h-80 object-contain bg-neutral-900"
                />
                <button
                  onClick={removeImage}
                  className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/70 text-red-400 hover:bg-red-600 hover:text-white flex items-center justify-center transition-all opacity-0 group-hover:opacity-100"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full h-48 border-2 border-dashed border-neutral-800 rounded-xl flex flex-col items-center justify-center text-neutral-500 hover:border-jade/40 hover:text-jade/60 transition-all group"
              >
                <ImagePlus className="w-10 h-10 mb-2 group-hover:scale-110 transition-transform" />
                <span className="text-sm">Haz clic para subir una imagen</span>
                <span className="text-xs text-neutral-700 mt-1">JPG, PNG, GIF (máx. 10MB)</span>
              </button>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
            />
            {imagePreview && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                className="border-neutral-800 text-neutral-400 hover:text-white hover:border-jade/50"
              >
                <ImagePlus className="w-4 h-4 mr-2" />
                Cambiar imagen
              </Button>
            )}
          </div>

          {/* Audio Section */}
          <div className="space-y-3">
            <label className="text-neutral-300 font-medium text-sm flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-jade/20 text-jade text-xs flex items-center justify-center font-bold">3</span>
              Graba la lectura de esta etapa
            </label>
            <div className="p-4 bg-neutral-950 border border-neutral-800 rounded-xl">
              <AudioRecorder
                onAudioRecorded={(base64) => setAudioData(base64)}
                initialAudio={audioData || null}
              />
            </div>
          </div>

          {/* Completion Status */}
          <div className={`p-4 rounded-xl border ${
            isComplete
              ? 'border-jade/30 bg-jade/5'
              : 'border-yellow-500/20 bg-yellow-500/5'
          }`}>
            <div className="flex items-center gap-3">
              {isComplete ? (
                <>
                  <CheckCircle2 className="w-5 h-5 text-jade" />
                  <div>
                    <p className="text-jade font-medium text-sm">Etapa completa</p>
                    <p className="text-jade/60 text-xs">Puedes guardar tu progreso</p>
                  </div>
                </>
              ) : (
                <div>
                  <p className="text-yellow-500 font-medium text-sm">Falta completar:</p>
                  <ul className="text-yellow-500/60 text-xs mt-1 space-y-1">
                    {!text.trim() && <li>- Escribe el texto descriptivo</li>}
                    {!imageUrl && <li>- Sube una imagen representativa</li>}
                    {!audioData && <li>- Graba la lectura en audio</li>}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

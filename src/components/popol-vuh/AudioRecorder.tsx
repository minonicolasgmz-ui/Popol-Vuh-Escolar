'use client';

import { useState, useRef, useCallback } from 'react';
import { Mic, Square, Play, Trash2, Pause } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface AudioRecorderProps {
  onAudioRecorded: (audioBase64: string) => void;
  initialAudio?: string | null;
}

export default function AudioRecorder({ onAudioRecorded, initialAudio }: AudioRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(initialAudio ? `data:audio/webm;base64,${initialAudio}` : null);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);

        // Convert to base64
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64 = (reader.result as string).split(',')[1];
          onAudioRecorded(base64);
        };
        reader.readAsDataURL(blob);

        // Stop all tracks
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);

      // Timer
      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } catch {
      alert('No se pudo acceder al micrófono. Verifica los permisos del navegador.');
    }
  }, [onAudioRecorded]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  }, [isRecording]);

  const playAudio = useCallback(() => {
    if (audioUrl) {
      if (isPlaying && audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
        setIsPlaying(false);
        return;
      }

      const audio = new Audio(audioUrl);
      audioRef.current = audio;
      audio.onended = () => setIsPlaying(false);
      audio.play();
      setIsPlaying(true);
    }
  }, [audioUrl, isPlaying]);

  const deleteAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setAudioUrl(null);
    setIsPlaying(false);
    onAudioRecorded('');
  }, [onAudioRecorded]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        {!isRecording ? (
          <Button
            type="button"
            onClick={startRecording}
            className="bg-jade hover:bg-jade-dark text-black font-semibold transition-all"
          >
            <Mic className="w-4 h-4 mr-2" />
            {audioUrl ? 'Grabar de nuevo' : 'Grabar lectura'}
          </Button>
        ) : (
          <Button
            type="button"
            onClick={stopRecording}
            className="bg-red-600 hover:bg-red-700 text-white font-semibold transition-all animate-pulse"
          >
            <Square className="w-4 h-4 mr-2" />
            Detener {formatTime(recordingTime)}
          </Button>
        )}

        {audioUrl && !isRecording && (
          <>
            <Button
              type="button"
              variant="outline"
              onClick={playAudio}
              className="border-neutral-700 text-neutral-300 hover:text-white hover:border-jade/50"
            >
              {isPlaying ? (
                <>
                  <Pause className="w-4 h-4 mr-2" />
                  Pausar
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 mr-2" />
                  Reproducir
                </>
              )}
            </Button>

            <Button
              type="button"
              variant="outline"
              onClick={deleteAudio}
              className="border-neutral-700 text-red-400 hover:text-red-300 hover:border-red-500/50"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Borrar
            </Button>
          </>
        )}
      </div>

      {isRecording && (
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
          <span className="text-red-400 text-sm">Grabando... {formatTime(recordingTime)}</span>
        </div>
      )}

      {audioUrl && !isRecording && (
        <p className="text-jade/60 text-xs">
          Audio grabado. Puedes reproducirlo para verificar, borrarlo y grabar de nuevo, o guardarlo.
        </p>
      )}
    </div>
  );
}

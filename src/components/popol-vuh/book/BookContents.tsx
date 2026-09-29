'use client';

import * as Dialog from '@radix-ui/react-dialog';
import { BookOpen, Image as ImageIcon, List, Mic, X } from 'lucide-react';
import { hasContribution } from '@/lib/book/build-book';
import type { BookChapter } from '@/lib/book/types';

export default function BookContents({ chapters, currentId, onSelect, onCover, disabled = false }: { chapters: BookChapter[]; currentId?: string; onSelect: (chapter: BookChapter) => void; onCover: () => void; disabled?: boolean }) {
  return (
    <Dialog.Root>
      <Dialog.Trigger asChild><button className="reader-button reader-index-trigger" disabled={disabled}><List size={19} /><span>Índice</span></button></Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="reader-dialog-overlay" />
        <Dialog.Content className="reader-contents-dialog">
          <header><div><p className="reader-overline">EL LIBRO DE LA CLASE</p><Dialog.Title>Elegí una historia</Dialog.Title></div><Dialog.Close asChild><button className="reader-icon-button" aria-label="Cerrar índice"><X size={22} /></button></Dialog.Close></header>
          <Dialog.Description>Los capítulos se completan con el trabajo de cada pareja.</Dialog.Description>
          <nav aria-label="Capítulos del libro"><Dialog.Close asChild><button className="reader-contents-cover" onClick={onCover}><BookOpen size={16} />Volver a la portada</button></Dialog.Close><ol>{chapters.map((chapter) => {
            const contributed = hasContribution(chapter);
            return <li key={chapter.id}><Dialog.Close asChild><button disabled={!contributed} aria-current={currentId === chapter.id ? 'location' : undefined} onClick={() => onSelect(chapter)}>
              <span className="reader-contents-number">{String(chapter.number).padStart(2, '0')}</span>
              <span className="reader-contents-label"><strong>{chapter.title}</strong><span>{chapter.authors || (contributed ? 'Una creación de la clase' : 'Todavía sin aportes')}</span><span className="reader-contents-media">{chapter.hasText && <span><BookOpen size={13} />Texto</span>}{chapter.hasImage && <span><ImageIcon size={13} />Imagen</span>}{chapter.hasAudio && <span><Mic size={13} />Voz</span>}{contributed && !(chapter.hasText && chapter.hasImage && chapter.hasAudio) && <span>En preparación</span>}</span></span>
            </button></Dialog.Close></li>;
          })}</ol></nav>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

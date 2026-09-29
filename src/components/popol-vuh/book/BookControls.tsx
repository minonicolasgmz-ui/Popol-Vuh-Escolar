import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { BookPage } from '@/lib/book/types';
import { visiblePageIndices } from '@/lib/book/build-book';

export default function BookControls({ pages, index, spread, busy, onPrevious, onNext }: { pages: BookPage[]; index: number; spread: boolean; busy: boolean; onPrevious: () => void; onNext: () => void }) {
  const visible = visiblePageIndices(index, pages.length, spread);
  const label = index === 0 ? 'Portada' : index === pages.length - 1 ? 'Contraportada' : visible.length > 1 ? `Páginas ${visible[0]}–${visible[1]}` : `Página ${index}`;
  return <footer className="reader-controls">
    <button className="reader-button" onClick={onPrevious} disabled={index === 0 || busy} aria-label="Página anterior"><ChevronLeft size={20} /><span>Anterior</span></button>
    <div className="reader-pagination" aria-live="polite" aria-atomic="true"><strong>{label}</strong><span>{pages.length - 2} páginas interiores</span><div className="reader-progress"><span style={{ width: `${index / Math.max(1, pages.length - 1) * 100}%` }} /></div></div>
    <button className="reader-button" onClick={onNext} disabled={visible[visible.length - 1] >= pages.length - 1 || busy} aria-label="Página siguiente"><span>{index === 0 ? 'Abrir' : 'Siguiente'}</span><ChevronRight size={20} /></button>
  </footer>;
}

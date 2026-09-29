export interface BookChapter {
  id: string;
  number: number;
  title: string;
  text: string;
  imageUrl: string | null;
  audioUrl: string | null;
  authors: string;
  version: string;
  hasText: boolean;
  hasImage: boolean;
  hasAudio: boolean;
}

export type BookAnchor =
  | { kind: 'cover' | 'contents' | 'credits' | 'back' }
  | { kind: 'text'; chapterId: string; offset: number }
  | { kind: 'image'; chapterId: string };

export type BookPageKind = 'cover' | 'title' | 'contents' | 'chapter' | 'continuation' | 'image' | 'credits' | 'courtesy' | 'back';

/** Each entry is one face, never a chapter or a physical leaf. */
export interface BookPage {
  id: string;
  kind: BookPageKind;
  anchor: BookAnchor;
  chapterId?: string;
  text?: string;
  start?: number;
  end?: number;
  entries?: BookChapter[];
  folio?: number;
}

export interface BookLayout {
  width: number;
  height: number;
  spread: boolean;
  fontSize: number;
}

export type BookEngineState = 'preparing' | 'ready' | 'dragging' | 'animating' | 'recomposing';

export interface TextFragment { text: string; start: number; end: number }
export type PageMeasurer = (chapter: BookChapter, text: string, first: boolean) => boolean;

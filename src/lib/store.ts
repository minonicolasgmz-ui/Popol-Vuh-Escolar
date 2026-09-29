import { create } from 'zustand';

export type ViewMode = 'landing' | 'stages' | 'editor' | 'book' | 'admin' | 'admin-login';
export interface GroupData { id: string; student1: string; student2: string; createdAt: string }
export interface StageData {
  id: string;
  number: number;
  title: string;
  description: string;
  text: string | null;
  imageUrl: string | null;
  audioData: string | null;
  groupId: string | null;
  group: GroupData | null;
  createdAt: string;
  updatedAt: string;
  hasText?: boolean;
  hasImage?: boolean;
  hasAudio?: boolean;
  detailLoaded?: boolean;
}

export function viewPath(view: ViewMode, stageId: string | null = null) {
  if (view === 'editor') return stageId ? `/capitulos/${encodeURIComponent(stageId)}/editar` : '/capitulos';
  return { landing: '/', stages: '/capitulos', book: '/libro', admin: '/docente', 'admin-login': '/docente/ingresar' }[view];
}

export function pathView(path: string): { view: ViewMode; stageId: string | null } {
  const editor = path.match(/^\/capitulos\/([^/]+)\/editar\/?$/);
  if (editor) return { view: 'editor', stageId: decodeURIComponent(editor[1]) };
  const views: Record<string, ViewMode> = { '/': 'landing', '/capitulos': 'stages', '/libro': 'book', '/docente': 'admin', '/docente/ingresar': 'admin-login' };
  return { view: views[path.replace(/\/$/, '') || '/'] || 'landing', stageId: null };
}

interface AppState {
  view: ViewMode;
  group: GroupData | null;
  stages: StageData[];
  selectedStageId: string | null;
  isAdmin: boolean;
  hydrated: boolean;
  sessionError: string | null;
  demo: boolean;
  setView: (view: ViewMode) => void;
  setGroup: (group: GroupData | null) => void;
  setStages: (stages: StageData[]) => void;
  setSelectedStageId: (id: string | null) => void;
  setIsAdmin: (isAdmin: boolean) => void;
  updateStage: (stage: StageData) => void;
  reset: () => Promise<void>;
  hydrate: () => Promise<void>;
}

let sessionRequest: Promise<void> | null = null;

export const useAppStore = create<AppState>((set, get) => ({
  view: 'landing', group: null, stages: [], selectedStageId: null, isAdmin: false, hydrated: false, sessionError: null, demo: false,
  setView: (view) => {
    const path = viewPath(view, get().selectedStageId);
    set({ view });
    if (typeof window !== 'undefined' && window.location.pathname !== path) {
      window.history.pushState(null, '', path);
      window.scrollTo({ top: 0, behavior: 'instant' });
    }
  },
  setGroup: (group) => set({ group, isAdmin: false, sessionError: null }),
  setIsAdmin: (isAdmin) => set({ isAdmin, group: isAdmin ? null : get().group, sessionError: null }),
  setSelectedStageId: (selectedStageId) => set({ selectedStageId }),
  setStages: (stages) => set((state) => ({ stages: stages.map((stage) => {
    const previous = state.stages.find((s) => s.id === stage.id);
    return previous?.detailLoaded && previous.updatedAt === stage.updatedAt && stage.text === null && stage.hasText
      ? { ...stage, text: previous.text, detailLoaded: true }
      : stage;
  }) })),
  updateStage: (stage) => set((state) => ({ stages: state.stages.some((s) => s.id === stage.id)
    ? state.stages.map((s) => s.id === stage.id ? { ...stage, detailLoaded: true } : s)
    : [...state.stages, { ...stage, detailLoaded: true }].sort((a, b) => a.number - b.number) })),
  reset: async () => {
    const response = await fetch('/api/session', { method: 'DELETE' });
    if (!response.ok) throw new Error('No pudimos cerrar la sesión. Intentá de nuevo.');
    set({ group: null, isAdmin: false, stages: [], selectedStageId: null, sessionError: null });
    try { localStorage.removeItem('popol-vuh-state'); } catch { /* The server cookie is authoritative. */ }
    get().setView('landing');
  },
  hydrate: () => {
    if (sessionRequest) return sessionRequest;
    sessionRequest = (async () => {
      try {
        const response = await fetch('/api/session', { cache: 'no-store' });
        if (!response.ok) throw new Error('No pudimos comprobar tu sesión. Revisá la conexión.');
        const session = await response.json();
        set({ group: session.group || null, isAdmin: session.isAdmin === true, demo: session.demo === true, sessionError: null });
      } catch (error) {
        set({ sessionError: error instanceof Error ? error.message : 'No pudimos conectar.' });
      } finally { set({ hydrated: true }); sessionRequest = null; }
    })();
    return sessionRequest;
  },
}));

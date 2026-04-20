import { create } from 'zustand';

export type ViewMode = 'landing' | 'stages' | 'editor' | 'book' | 'admin' | 'admin-login';

export interface GroupData {
  id: string;
  student1: string;
  student2: string;
  createdAt: string;
}

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
}

interface AppState {
  view: ViewMode;
  group: GroupData | null;
  stages: StageData[];
  selectedStageId: string | null;
  isAdmin: boolean;
  hydrated: boolean;

  setView: (view: ViewMode) => void;
  setGroup: (group: GroupData | null) => void;
  setStages: (stages: StageData[]) => void;
  setSelectedStageId: (id: string | null) => void;
  setIsAdmin: (isAdmin: boolean) => void;
  updateStage: (stage: StageData) => void;
  reset: () => void;
  hydrate: () => void;
}

const PERSIST_KEY = 'popol-vuh-state';

interface PersistedState {
  group: GroupData | null;
  isAdmin: boolean;
}

function loadPersistedState(): PersistedState | null {
  if (typeof window === 'undefined') return null;
  try {
    const saved = localStorage.getItem(PERSIST_KEY);
    if (saved) return JSON.parse(saved);
  } catch {
    // ignore
  }
  return null;
}

function savePersistedState(state: PersistedState) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(PERSIST_KEY, JSON.stringify(state));
  } catch {
    // ignore
  }
}

export const useAppStore = create<AppState>((set, get) => ({
  view: 'landing',
  group: null,
  stages: [],
  selectedStageId: null,
  isAdmin: false,
  hydrated: false,

  setView: (view) => set({ view }),
  setGroup: (group) => {
    set({ group });
    savePersistedState({ group, isAdmin: get().isAdmin });
  },
  setStages: (stages) => set({ stages }),
  setSelectedStageId: (id) => set({ selectedStageId: id }),
  setIsAdmin: (isAdmin) => {
    set({ isAdmin });
    savePersistedState({ group: get().group, isAdmin });
  },
  updateStage: (stage) =>
    set((state) => ({
      stages: state.stages.map((s) => (s.id === stage.id ? stage : s)),
    })),
  reset: () => {
    set({ view: 'landing', group: null, selectedStageId: null, isAdmin: false });
    if (typeof window !== 'undefined') {
      localStorage.removeItem(PERSIST_KEY);
    }
  },
  hydrate: () => {
    const persisted = loadPersistedState();
    if (persisted) {
      let view: ViewMode = 'landing';
      if (persisted.isAdmin) {
        view = 'admin';
      } else if (persisted.group) {
        view = 'stages';
      }
      set({ ...persisted, view, hydrated: true });
    } else {
      set({ hydrated: true });
    }
  },
}));

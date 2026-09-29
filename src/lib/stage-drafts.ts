export interface DraftContent {
  text: string;
  imageUrl: string | null;
  audioData: string | null;
}

export interface StageDraft extends DraftContent {
  key: string;
  baseUpdatedAt: string;
  savedAt: number;
}

interface StoredDraft extends Omit<StageDraft, 'imageUrl' | 'audioData'> {
  imageUrl: string | Blob | null;
  audioData: string | Blob | null;
}

const DATABASE = 'popol-vuh-drafts';
const STORE = 'chapters';
const pending = new Map<string, Promise<unknown>>();
// Cache only the current image and recording: typing must not decode the same
// large media again for every character. Files remain blobs in IndexedDB.
const mediaCache: { source: string; value: Promise<Blob> }[] = [];

export function draftKey(groupId: string, stageId: string) {
  return `${groupId}:${stageId}`;
}

export function sameDraftContent(a: DraftContent, b: DraftContent) {
  return a.text === b.text && a.imageUrl === b.imageUrl && a.audioData === b.audioData;
}

export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('No se pudo leer el archivo.'));
    reader.readAsDataURL(blob);
  });
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('Este navegador no permite guardar borradores en el dispositivo.'));
      return;
    }
    const request = indexedDB.open(DATABASE, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE, { keyPath: 'key' });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error('Cerrá las otras pestañas para habilitar los borradores.'));
  });
}

function serialize<T>(key: string, operation: () => Promise<T>): Promise<T> {
  const previous = pending.get(key) || Promise.resolve();
  const next = previous.catch(() => undefined).then(operation);
  pending.set(key, next);
  void next.finally(() => {
    if (pending.get(key) === next) pending.delete(key);
  }).catch(() => undefined);
  return next;
}

async function mediaToStored(source: string | null): Promise<Blob | string | null> {
  if (!source?.startsWith('data:')) return source;
  const cached = mediaCache.find((entry) => entry.source === source);
  if (cached) return cached.value;
  const value = fetch(source).then((response) => response.blob());
  mediaCache.push({ source, value });
  if (mediaCache.length > 2) mediaCache.shift();
  return value;
}

async function mediaFromStored(source: string | Blob | null): Promise<string | null> {
  return source instanceof Blob ? blobToDataUrl(source) : source;
}

export function readStageDraft(key: string): Promise<StageDraft | null> {
  return serialize(key, async () => {
    const db = await openDatabase();
    const stored = await new Promise<StoredDraft | undefined>((resolve, reject) => {
      const transaction = db.transaction(STORE, 'readonly');
      const request = transaction.objectStore(STORE).get(key);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
      transaction.oncomplete = () => db.close();
      transaction.onabort = () => { db.close(); reject(transaction.error); };
    });
    if (!stored) return null;
    const [imageUrl, audioData] = await Promise.all([
      mediaFromStored(stored.imageUrl), mediaFromStored(stored.audioData),
    ]);
    return { ...stored, imageUrl, audioData };
  });
}

export function writeStageDraft(draft: StageDraft): Promise<void> {
  return serialize(draft.key, async () => {
    const [imageUrl, audioData] = await Promise.all([
      mediaToStored(draft.imageUrl), mediaToStored(draft.audioData),
    ]);
    const db = await openDatabase();
    return new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(STORE, 'readwrite');
      transaction.objectStore(STORE).put({ ...draft, imageUrl, audioData } satisfies StoredDraft);
      transaction.oncomplete = () => { db.close(); resolve(); };
      transaction.onabort = () => { db.close(); reject(transaction.error); };
      transaction.onerror = () => reject(transaction.error);
    });
  });
}

export function removeStageDraft(key: string): Promise<void> {
  return serialize(key, async () => {
    const db = await openDatabase();
    return new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(STORE, 'readwrite');
      transaction.objectStore(STORE).delete(key);
      transaction.oncomplete = () => { db.close(); resolve(); };
      transaction.onabort = () => { db.close(); reject(transaction.error); };
      transaction.onerror = () => reject(transaction.error);
    });
  });
}

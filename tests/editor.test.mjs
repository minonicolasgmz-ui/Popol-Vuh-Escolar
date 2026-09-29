import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const testDirectory = path.dirname(fileURLToPath(import.meta.url));

function memoryIndexedDb() {
  const records = new Map();
  let failNextWrite = false;
  const db = {
    close() {},
    transaction(_store, mode) {
      const tx = { error: null };
      tx.objectStore = () => ({
        get(key) {
          const request = {};
          queueMicrotask(() => { request.result = records.get(key); request.onsuccess?.(); tx.oncomplete?.(); });
          return request;
        },
        put(value) {
          queueMicrotask(() => {
            if (failNextWrite) {
              failNextWrite = false; tx.error = new DOMException('Full', 'QuotaExceededError'); tx.onabort?.();
            } else { records.set(value.key, structuredClone(value)); tx.oncomplete?.(); }
          });
        },
        delete(key) { queueMicrotask(() => { records.delete(key); tx.oncomplete?.(); }); },
      });
      return tx;
    },
  };
  return {
    records,
    failWrite() { failNextWrite = true; },
    api: { open() { const request = {}; queueMicrotask(() => { request.result = db; request.onsuccess?.(); }); return request; } },
  };
}

function loadModules(indexedDb) {
  const cache = new Map();
  function load(file) {
    if (cache.has(file)) return cache.get(file);
    const compiled = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
    const loadedModule = { exports: {} };
    const context = {
      module: loadedModule, exports: loadedModule.exports, Blob, DOMException, indexedDB: indexedDb, fetch, Promise, setTimeout, clearTimeout,
      FileReader: class {
        readAsDataURL(blob) { blob.arrayBuffer().then((bytes) => { this.result = `data:${blob.type};base64,${Buffer.from(bytes).toString('base64')}`; this.onload?.(); }).catch(() => this.onerror?.()); }
      },
      require: (name) => load(path.resolve(path.dirname(file), `${name}.ts`)),
    };
    vm.runInNewContext(compiled, context, { filename: file });
    cache.set(file, loadedModule.exports);
    return loadedModule.exports;
  }
  return {
    drafts: load(path.resolve(testDirectory, '../src/lib/stage-drafts.ts')),
    images: load(path.resolve(testDirectory, '../src/lib/editor-image.ts')),
  };
}

const sample = (key, text) => ({ key, text, imageUrl: null, audioData: null, baseUpdatedAt: '2026-09-28T12:00:00Z', savedAt: Date.now() });

test('rapid drafts finish in order, and saving to the server cannot resurrect an old local draft', async () => {
  const memory = memoryIndexedDb(); const { drafts } = loadModules(memory.api);
  const key = drafts.draftKey('equipo-1', 'capitulo-1');
  await Promise.all([drafts.writeStageDraft(sample(key, 'Primero')), drafts.writeStageDraft(sample(key, 'Última edición'))]);
  assert.equal((await drafts.readStageDraft(key)).text, 'Última edición');
  await Promise.all([drafts.writeStageDraft(sample(key, 'Cambio pendiente')), drafts.removeStageDraft(key)]);
  assert.equal(await drafts.readStageDraft(key), null);
});

test('two teams never share a chapter draft and a quota failure does not block a later retry', async () => {
  const memory = memoryIndexedDb(); const { drafts } = loadModules(memory.api);
  const first = drafts.draftKey('equipo-1', 'capitulo-1'); const second = drafts.draftKey('equipo-2', 'capitulo-1');
  await drafts.writeStageDraft(sample(first, 'Solo del primer equipo'));
  assert.equal(await drafts.readStageDraft(second), null);
  memory.failWrite();
  await assert.rejects(drafts.writeStageDraft(sample(first, 'Sin espacio')), { name: 'QuotaExceededError' });
  assert.equal((await drafts.readStageDraft(first)).text, 'Solo del primer equipo');
  await drafts.writeStageDraft(sample(first, 'Reintento conservado'));
  assert.equal((await drafts.readStageDraft(first)).text, 'Reintento conservado');
});

test('recordings are stored as blobs with their actual MIME and restored without changing their bytes', async () => {
  const memory = memoryIndexedDb(); const { drafts } = loadModules(memory.api);
  const draft = { ...sample('equipo:audio', 'Nuestra lectura'), audioData: 'data:audio/mp4;base64,AAECAwQF' };
  await drafts.writeStageDraft(draft);
  assert.ok(memory.records.get(draft.key).audioData instanceof Blob);
  assert.equal(memory.records.get(draft.key).audioData.type, 'audio/mp4');
  assert.equal((await drafts.readStageDraft(draft.key)).audioData, draft.audioData);
});

test('phone photos retain their orientation ratio and small drawings are not enlarged', () => {
  const { images } = loadModules(memoryIndexedDb().api);
  const portrait = images.fitImageDimensions(3000, 4000);
  assert.equal(portrait.width, 1200); assert.equal(portrait.height, 1600);
  const landscape = images.fitImageDimensions(6000, 4000);
  assert.equal(landscape.width, 1600); assert.equal(landscape.height, 1067);
  const drawing = images.fitImageDimensions(320, 180);
  assert.equal(drawing.width, 320); assert.equal(drawing.height, 180);
  assert.throws(() => images.fitImageDimensions(0, 180));
});

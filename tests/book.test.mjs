import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import ts from 'typescript';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../src/lib/book');
const cache = new Map();
const storage = new Map();
function load(name) {
  const file = path.resolve(root, `${name}.ts`);
  if (cache.has(file)) return cache.get(file);
  const compiled = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const module = { exports: {} };
  vm.runInNewContext(compiled, {
    module, exports: module.exports,
    localStorage: { getItem: (key) => storage.get(key) || null, setItem: (key, value) => storage.set(key, value) },
    require: (relative) => load(relative.replace(/^\.\//, '')),
  }, { filename: file });
  cache.set(file, module.exports);
  return module.exports;
}
const { paginateText, BookLayoutError } = load('paginate');
const { buildBook, visiblePageIndices, adjacentPageIndex, hasContribution } = load('build-book');
const { findAnchorPage, loadReadingPosition, saveReadingPosition } = load('reading-position');
const { installManagedRenderLoop } = load('managed-render-loop');
const { toBookChapter } = load('chapter-data');
const chapter = (id, text, extra = {}) => ({ id, number: Number(id) || 1, title: 'Una historia con tildes', authors: 'Alma y Leo', text, hasText: !!text, hasImage: false, hasAudio: false, imageUrl: null, audioUrl: null, version: 'v1', ...extra });

test('pagination preserves every character, paragraph and emoji, even inside a very long word', () => {
  const text = `  Áéíóú, ñ y maíz. 🌽\n\n${'Una memoria compartida. '.repeat(55)}\n\n${'🌎'.repeat(310)}\nFin.  `;
  const pages = paginateText(chapter('1', text), (_chapter, fragment, first) => fragment.length <= (first ? 105 : 165));
  assert.ok(pages.length > 10);
  assert.equal(pages.map(p => p.text).join(''), text);
  let offset = 0;
  for (const page of pages) {
    assert.ok(page.text.length <= (page.start === 0 ? 105 : 165));
    assert.equal(page.start, offset); assert.equal(page.end, page.start + page.text.length);
    assert.ok(!/[\uD800-\uDBFF]$/.test(page.text));
    assert.ok(!/^[\uDC00-\uDFFF]/.test(page.text));
    offset = page.end;
  }
  assert.throws(() => paginateText(chapter('1', 'No cabe'), () => false), BookLayoutError);
});

test('book includes audio-only work, orders chapters, and keeps an independent back cover', () => {
  const chapters = [chapter('3', '', { hasAudio: true }), chapter('1', 'Primero.', { hasImage: true }), chapter('2', '')];
  const pages = buildBook(chapters, () => true);
  assert.equal(pages[0].kind, 'cover'); assert.equal(pages.at(-1).kind, 'back');
  assert.equal(pages.length % 2, 0);
  assert.equal(pages.find(p => p.kind === 'chapter').chapterId, '1');
  assert.ok(pages.some(p => p.kind === 'image' && p.chapterId === '1'));
  assert.ok(pages.some(p => p.kind === 'chapter' && p.chapterId === '3'));
  assert.ok(!pages.some(p => p.chapterId === '2'));
  assert.equal(hasContribution(chapters[0]), true);
  assert.equal(new Set(pages.map(p => p.id)).size, pages.length);
  const empty = buildBook([], () => true);
  assert.equal(empty.at(-1).kind, 'back');
});

test('single-page and spread navigation visit all leaves once and return to the cover', () => {
  for (const spread of [false, true]) {
    for (const count of [4, 6, 16, 30]) {
      let index = 0; const seen = [];
      while (true) {
        seen.push(...visiblePageIndices(index, count, spread));
        const next = adjacentPageIndex(index, count, spread, 1);
        if (next === index) break;
        index = next;
      }
      assert.deepEqual(Array.from(seen), Array.from({ length: count }, (_, i) => i));
      let safety = 0;
      while (index > 0 && safety++ < count) index = adjacentPageIndex(index, count, spread, -1);
      assert.equal(index, 0);
      assert.equal(adjacentPageIndex(0, count, spread, -1), 0);
    }
  }
});

test('reading anchor follows the same passage after text size changes', () => {
  const text = 'El maíz conserva nuestra memoria. '.repeat(70);
  const chapters = [chapter('1', text)];
  const first = buildBook(chapters, (_c, part) => part.length <= 400);
  const second = buildBook(chapters, (_c, part) => part.length <= 190);
  const anchor = { kind: 'text', chapterId: '1', offset: 1375 };
  for (const pages of [first, second]) {
    const page = pages[findAnchorPage(pages, anchor)];
    assert.ok(page.start <= anchor.offset && page.end > anchor.offset);
  }
  saveReadingPosition({ anchor, fontSize: 21, version: 'v1' });
  assert.equal(loadReadingPosition().anchor.offset, 1375);
  assert.equal(loadReadingPosition().fontSize, 21);
  storage.set('popol-vuh-reading-position-v2', '{invalid');
  assert.equal(loadReadingPosition(), null);
});

test('destroying the page engine cancels its frame loop and a late callback cannot restart it', () => {
  let counter = 0; const pending = new Map(); const canceled = [];
  const schedule = (callback) => { const id = ++counter; pending.set(id, callback); return id; };
  const cancel = (id) => { canceled.push(id); pending.delete(id); };
  const engine = {}; const stop = installManagedRenderLoop(engine, schedule, cancel);
  let renders = 0; let updates = 0;
  engine.render = { start() {}, update() { updates++; }, render() { renders++; } };
  engine.render.start();
  const first = pending.get(1); pending.delete(1); first(16);
  assert.equal(renders, 1); assert.equal(pending.size, 1);
  const late = pending.get(2); stop(); late(32); engine.render.update();
  assert.deepEqual(canceled, [2]); assert.equal(pending.size, 0); assert.equal(renders, 1); assert.equal(updates, 1);
});

test('legacy audio and URL media become playable chapters without losing an audio-only contribution', () => {
  const base = { id: '1', number: 1, title: 'La voz', text: null, imageUrl: null, updatedAt: 'v1', group: null };
  assert.match(toBookChapter({ ...base, audioData: 'AAEC' }).audioUrl, /^data:audio\/webm;base64,/);
  const modern = toBookChapter({ ...base, audioData: '/api/stages/1/media/audio', hasAudio: true });
  assert.equal(modern.audioUrl, '/api/stages/1/media/audio'); assert.equal(hasContribution(modern), true);
});

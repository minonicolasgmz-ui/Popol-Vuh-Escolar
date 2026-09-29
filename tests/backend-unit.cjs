/* eslint-disable @typescript-eslint/no-require-imports -- This isolated runner intentionally installs a CommonJS TypeScript hook without adding dependencies. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

// Use the repository's TypeScript compiler; no runner dependency and no generated files.
require.extensions['.ts'] = (module, filename) => {
  const source = fs.readFileSync(filename, 'utf8');
  const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true } });
  module._compile(output.outputText, filename);
};
process.env.NODE_ENV = 'test';
process.env.POPOL_VUH_DEMO = '1';
process.env.ADMIN_PASSWORD = 'unit-fixture-password';
const root = path.join(__dirname, '..', 'src', 'lib', 'server');
const { NextRequest, NextResponse } = require('next/server');
const auth = require(path.join(root, 'auth.ts'));
const { isDemo } = require(path.join(root, 'config.ts'));
const { decodeMedia, contentPatch, parseRange } = require(path.join(root, 'media.ts'));
const { assertVersion, readJson, studentName } = require(path.join(root, 'validation.ts'));
const repo = require(path.join(root, 'repository.ts'));

async function run() {
  const response = auth.issueSession(NextResponse.json({ ok: true }), 'group', 'unit-group');
  const cookie = response.headers.get('set-cookie').split(';')[0];
  const request = new NextRequest('http://localhost/api/stages', { headers: { cookie } });
  assert.equal(auth.requireSession(request).groupId, 'unit-group');
  assert.throws(() => auth.requireAdmin(request), e => e.status === 403);
  assert.equal(auth.getSession(new NextRequest('http://localhost', { headers: { cookie: `${cookie}x` } })), null);
  assert.equal(auth.verifyAdminPassword('wrong'), false);
  assert.equal(auth.verifyAdminPassword('unit-fixture-password'), true);
  assert.equal(studentName('  Alma   Lucía  '), 'Alma Lucía');
  assert.throws(() => studentName(' '), e => e.status === 400);
  assert.throws(() => assertVersion(new Date(1), new Date(2)), e => e.status === 409);
  assert.deepEqual(parseRange('bytes=0-3', 10), { start: 0, end: 3 });
  assert.deepEqual(parseRange('bytes=-3', 10), { start: 7, end: 9 });
  assert.deepEqual(parseRange('bytes=7-', 10), { start: 7, end: 9 });
  for (const value of ['bytes=100-', 'bytes=7-2', 'bytes=-0', 'bytes=0-1,3-5', 'potato']) assert.throws(() => parseRange(value, 10), e => e.status === 416);
  const stage = { id: 'unit-stage', text: null, imageUrl: 'old-data', audioData: null };
  assert.deepEqual(contentPatch({ imageUrl: '/api/stages/unit-stage/media/image?v=old' }, stage), {});
  assert.deepEqual(contentPatch({ imageUrl: null }, stage), { imageUrl: null });
  assert.throws(() => contentPatch({ imageUrl: '/api/stages/other/media/image' }, stage), e => e.status === 400);
  assert.throws(() => contentPatch({ imageUrl: 'data:image/svg+xml;base64,PHN2Zy8+' }, stage), e => e.status === 415);
  const png = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9Zl1sAAAAASUVORK5CYII=';
  assert.equal(decodeMedia(png, 'image', false, true).contentType, 'image/png');
  await assert.rejects(() => readJson(new Request('http://localhost/api', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ long: 'x'.repeat(100) }) }), 30), e => e.status === 413);
  await assert.rejects(() => readJson(new Request('http://localhost/api', { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: 'https://elsewhere.example' }, body: '{}' })), e => e.status === 403);
  assert.deepEqual(await readJson(new Request('http://localhost:3000/api', { method: 'POST', headers: { 'Content-Type': 'application/json', Host: '127.0.0.1:3000', Origin: 'http://127.0.0.1:3000' }, body: '{}' })), {});
  await assert.rejects(() => readJson(new Request('http://localhost:3000/api', { method: 'POST', headers: { 'Content-Type': 'application/json', Host: '127.0.0.1:3000', Origin: 'http://127.0.0.1:3001' }, body: '{}' })), e => e.status === 403);

  const a = await repo.createGroup('Unidad A', 'Unidad B'), b = await repo.createGroup('Unidad C', 'Unidad D');
  const meta = await repo.listStages(false), book = await repo.listStages(true);
  assert.ok(meta.every(s => s.text === null)); assert.ok(book.some(s => s.text));
  assert.ok(!JSON.stringify(book).includes('base64,'));
  const id = meta.find(s => !s.groupId).id;
  const outcomes = await Promise.allSettled([repo.claimStage(id, a.id), repo.claimStage(id, b.id)]);
  assert.equal(outcomes.filter(o => o.status === 'fulfilled').length, 1);
  assert.equal(outcomes.find(o => o.status === 'rejected').reason.status, 409);
  const claimed = outcomes.find(o => o.status === 'fulfilled').value;
  const saved = await repo.updateStage(id, new Date(claimed.updatedAt), { text: 'Texto conservado' }, { role: 'group', groupId: claimed.groupId });
  assert.equal(saved.text, 'Texto conservado');
  await assert.rejects(() => repo.updateStage(id, new Date(claimed.updatedAt), { text: 'Viejo' }, { role: 'group', groupId: claimed.groupId }), e => e.status === 409);
  await assert.rejects(() => repo.updateStage(id, new Date(saved.updatedAt), { text: 'Ajeno' }, { role: 'group', groupId: 'other' }), e => e.status === 403);
  const secondId = meta.filter(s => !s.groupId)[1].id;
  await assert.rejects(() => repo.claimStage(secondId, claimed.groupId), e => e.status === 409);
  process.env.NODE_ENV = 'production';
  assert.throws(() => isDemo(), e => e.status === 503);
  process.env.POPOL_VUH_DEMO = '0'; delete process.env.SESSION_SECRET;
  assert.throws(() => auth.assertSessionConfiguration(), e => e.status === 503);
  process.env.SESSION_SECRET = 'REPLACE_WITH_A_RANDOM_SECRET_OF_AT_LEAST_32_CHARACTERS';
  assert.throws(() => auth.assertSessionConfiguration(), e => e.status === 503);
  console.log('PASS: backend unit checks — signed sessions, role protection, validation, byte limits, ranges, media preservation, isolated fixtures, reservation races, versions and production fail-closed.');
}
run().catch(error => { console.error(error); process.exitCode = 1; });

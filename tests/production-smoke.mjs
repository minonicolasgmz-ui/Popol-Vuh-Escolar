import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';

// Deliberately unreachable test database. No class data or real credentials
// are used. This verifies the standalone packaging and fail-closed behavior.
const base = 'http://127.0.0.1:3001';
const server = spawn(process.execPath, ['.next/standalone/server.js'], {
  env: { ...process.env, NODE_ENV: 'production', PORT: '3001', HOSTNAME: '127.0.0.1', POPOL_VUH_DEMO: '0',
    SESSION_SECRET: 'standalone-smoke-isolated-secret-with-more-than-32-characters', ADMIN_PASSWORD: 'isolated-smoke-admin-password',
    DATABASE_URL: 'postgresql://unused:unused@127.0.0.1:1/isolated', DIRECT_URL: 'postgresql://unused:unused@127.0.0.1:1/isolated' },
  stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true,
});
let log = '';
server.stdout.on('data', chunk => { log += chunk; }); server.stderr.on('data', chunk => { log += chunk; });
try {
  let response;
  for (let attempt = 0; attempt < 60; attempt++) {
    if (server.exitCode !== null) throw new Error(`Standalone exited: ${log}`);
    try { response = await fetch(base); break; } catch { await delay(200); }
  }
  assert.ok(response, 'Standalone did not become ready.');
  assert.equal(response.status, 200);
  const html = await response.text();
  const assets = [...new Set(Array.from(html.matchAll(/(?:href|src)="([^" ]*\/_next\/static\/[^" ]+)"/g), match => match[1]))];
  assert.ok(assets.some(url => url.endsWith('.woff2')), 'Self-hosted fonts must be packaged.');
  const requests = await Promise.all(assets.map(async url => {
    const result = await fetch(new URL(url, base));
    assert.equal(result.status, 200, url);
    return { url, bytes: (await result.arrayBuffer()).byteLength };
  }));
  for (const route of ['/capitulos', '/libro', '/docente/ingresar']) assert.equal((await fetch(`${base}${route}`)).status, 200, route);
  const session = await fetch(`${base}/api/session`); assert.equal(session.status, 200);
  const data = await session.json(); assert.equal(data.group, null); assert.equal(data.isAdmin, false); assert.equal(data.demo, false);
  assert.equal((await fetch(`${base}/api/stages`)).status, 401);
  assert.equal((await fetch(`${base}/api/admin/stages`)).status, 401);
  const wrongOrigin = await fetch(`${base}/api/groups`, { method: 'POST', headers: { Origin: 'https://foreign.example', 'Content-Type': 'application/json' }, body: '{"student1":"Prueba","student2":"Prueba"}' });
  assert.equal(wrongOrigin.status, 403);
  console.log(`PASS: production standalone — routes, ${requests.length} local assets (${Math.round(requests.reduce((sum, item) => sum + item.bytes, 0) / 1024)} KiB before compression), fonts and protected APIs. No database access.`);
} finally {
  server.kill();
}

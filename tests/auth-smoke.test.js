import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { createServer } from 'node:net';

async function unusedPort() {
  return new Promise((resolvePort, reject) => {
    const socket = createServer();
    socket.once('error', reject);
    socket.listen(0, '127.0.0.1', () => {
      const port = socket.address().port;
      socket.close(() => resolvePort(port));
    });
  });
}

function waitForStartup(child) {
  return new Promise((resolveReady, reject) => {
    let log = '';
    const timeout = setTimeout(() => reject(new Error('Server startup timed out: ' + log)), 12000);
    child.stdout.on('data', chunk => {
      log += String(chunk);
      if (log.includes('AI Workbench is running')) {
        clearTimeout(timeout);
        resolveReady();
      }
    });
    child.stderr.on('data', chunk => { log += String(chunk); });
    child.once('error', err => { clearTimeout(timeout); reject(err); });
    child.once('exit', code => {
      clearTimeout(timeout);
      reject(new Error('Server exited before startup: ' + code + ' ' + log));
    });
  });
}

test('local auth smoke: register, protect routes, reject invalid login, logout', async () => {
  const root = resolve(import.meta.dirname, '..');
  const dataDir = mkdtempSync(join(tmpdir(), 'aiwb-smoke-'));
  const port = await unusedPort();
  const base = 'http://127.0.0.1:' + port;
  const child = spawn(process.execPath, ['server.js'], {
    cwd: root,
    env: { ...process.env, PORT: String(port), AI_WORKBENCH_DATA_DIR: dataDir },
    stdio: ['ignore', 'pipe', 'pipe']
  });
  try {
    await waitForStartup(child);
    const request = (route, options = {}) => fetch(base + route, options);
    const post = (route, body, cookie) => request(route, {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...(cookie ? { cookie } : {}) },
      body: JSON.stringify(body)
    });

    const initial = await request('/api/auth/state');
    assert.equal(initial.status, 200);
    assert.deepEqual(await initial.json(), { accountExists: false, signedIn: false, user: null });

    const unauthorized = await request('/api/tasks');
    assert.equal(unauthorized.status, 401);

    const invalid = await post('/api/auth/register', {
      name: 'Tester', email: 'tester@example.com', password: 'short'
    });
    assert.equal(invalid.status, 400);

    const registration = await post('/api/auth/register', {
      name: 'Tester', email: 'tester@example.com', password: 'example-pass-123'
    });
    assert.equal(registration.status, 201);
    const setCookie = registration.headers.get('set-cookie') || '';
    assert.match(setCookie, /HttpOnly/i);
    assert.match(setCookie, /SameSite/i);
    const cookie = setCookie.split(';')[0];
    assert.match(cookie, /^aiwb_session=/);

    const account = JSON.parse(readFileSync(join(dataDir, 'local-account.json'), 'utf8'));
    assert.ok(account.passwordHash);
    assert.equal(account.password, undefined);
    assert.ok(!JSON.stringify(account).includes('example-pass-123'));

    const secondRegistration = await post('/api/auth/register', {
      name: 'Another', email: 'another@example.com', password: 'another-pass-123'
    });
    assert.equal(secondRegistration.status, 409);

    const authed = await request('/api/tasks', { headers: { cookie } });
    assert.equal(authed.status, 200);
    assert.deepEqual(await authed.json(), []);

    const wrongLogin = await post('/api/auth/login', {
      email: 'tester@example.com', password: 'incorrect-password'
    });
    assert.equal(wrongLogin.status, 401);

    const logout = await request('/api/auth/logout', { method: 'POST', headers: { cookie } });
    assert.equal(logout.status, 200);
    const afterLogout = await request('/api/tasks', { headers: { cookie } });
    assert.equal(afterLogout.status, 401);
  } finally {
    child.kill();
    rmSync(dataDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  }
});

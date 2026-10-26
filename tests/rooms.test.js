import test from 'node:test';
import assert from 'node:assert';
import http from 'node:http';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import fs from 'node:fs';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.join(__dirname, '..');
const DATA_DIR = path.join(ROOT, 'data');
const ROOMS_FILE = path.join(DATA_DIR, 'rooms.json');
const MESSAGES_FILE = path.join(DATA_DIR, 'messages.json');

const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

test('Rooms and Messages API Integration', async (t) => {
  if (fs.existsSync(ROOMS_FILE)) fs.writeFileSync(ROOMS_FILE, '[]');
  if (fs.existsSync(MESSAGES_FILE)) fs.writeFileSync(MESSAGES_FILE, '[]');

  const testPort = 4174;
  const serverProcess = spawn('node', ['server.js'], {
    cwd: ROOT,
    stdio: 'ignore',
    env: { ...process.env, PORT: testPort }
  });
  await wait(2000);

  try {
    const request = (path, method = 'GET', body = null) => {
      return new Promise((resolve, reject) => {
        const req = http.request({
          hostname: '127.0.0.1',
          port: testPort,
          path,
          method,
          headers: body ? { 'Content-Type': 'application/json' } : {}
        }, (res) => {
          let data = '';
          res.on('data', chunk => data += chunk);
          res.on('end', () => resolve({ status: res.statusCode, data: JSON.parse(data || '{}') }));
        });
        req.on('error', reject);
        if (body) req.write(JSON.stringify(body));
        req.end();
      });
    };

    let res = await request('/api/rooms');
    assert.strictEqual(res.status, 200);
    assert.deepStrictEqual(res.data, []);

    res = await request('/api/rooms', 'POST', { name: 'Test Room' });
    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.data.name, 'Test Room');
    const roomId = res.data.id;

    res = await request('/api/rooms');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.length, 1);
    assert.strictEqual(res.data[0].id, roomId);

    res = await request(`/api/rooms/${roomId}/messages`, 'POST', { text: 'Hello, world!', author: 'User' });
    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.data.text, 'Hello, world!');

    // Testing mention dispatch (just testing that it's created, not wait for the CLI to run)
    res = await request(`/api/rooms/${roomId}/messages`, 'POST', { text: 'Hey @gemini do something', author: 'User' });
    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.data.text, 'Hey @gemini do something');

    res = await request(`/api/rooms/${roomId}/messages`);
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.length, 2);

    // No provider connection exists for @gpt: do not pretend it is running.
    res = await request(`/api/rooms/${roomId}/messages`, 'POST', {
      text: 'Please review @gpt', author: 'gpt'
    });
    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.data.author, 'User'); // Prevent spoofed AI replies.
    assert.ok(res.data.handoffTo);
    const handoffId = res.data.handoffTo;
    res = await request('/api/tasks');
    assert.strictEqual(res.status, 200);
    const gptTask = res.data.find(task => task.id === handoffId);
    assert.ok(gptTask);
    assert.strictEqual(gptTask.agent, 'gpt');
    assert.strictEqual(gptTask.status, 'handoff');
    assert.strictEqual(gptTask.connectionStatus, 'not_connected');
    assert.match(gptTask.blockedReason, /尚未接入/);

    res = await request(`/api/rooms/${roomId}/messages`, 'POST', { text: 42 });
    assert.strictEqual(res.status, 400);

  } finally {
    serverProcess.kill();
    if (fs.existsSync(ROOMS_FILE)) fs.writeFileSync(ROOMS_FILE, '[]');
    if (fs.existsSync(MESSAGES_FILE)) fs.writeFileSync(MESSAGES_FILE, '[]');
  }
});

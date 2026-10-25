import assert from 'node:assert';
import test from 'node:test';
import http from 'node:http';
import { spawn } from 'node:child_process';

const PORT = 4174; // Use a different port for testing

function request(options, bodyData) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ statusCode: res.statusCode, body: data ? JSON.parse(data) : null }));
    });
    req.on('error', reject);
    if (bodyData) {
      req.write(JSON.stringify(bodyData));
    }
    req.end();
  });
}

test('Jules State API operations', async (t) => {
  // Start server
  const serverProc = spawn('node', ['server.js'], {
    env: { ...process.env, PORT: PORT.toString() }
  });

  // Wait for server to start
  await new Promise(resolve => setTimeout(resolve, 1000));

  try {
    // 1. POST a new Jules event
    const event1 = {
      id: 'evt_123',
      gitSha: 'abcdef123456',
      checkpoint: 'initial-setup',
      type: 'activity',
      continuation: 'terminal'
    };

    let res = await request({
      hostname: '127.0.0.1',
      port: PORT,
      path: '/api/jules/events',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, event1);

    assert.strictEqual(res.statusCode, 201);
    assert.strictEqual(res.body.id, 'evt_123');
    assert.strictEqual(res.body.retryCount, 0);

    // 2. POST the same event again (Idempotency / Retry logic)
    res = await request({
      hostname: '127.0.0.1',
      port: PORT,
      path: '/api/jules/events',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, event1);

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.retryCount, 1);

    // 3. GET all events
    res = await request({
      hostname: '127.0.0.1',
      port: PORT,
      path: '/api/jules/events',
      method: 'GET'
    });

    assert.strictEqual(res.statusCode, 200);
    assert.ok(Array.isArray(res.body));

    const foundEvent = res.body.find(e => e.id === 'evt_123');
    assert.ok(foundEvent);
    assert.strictEqual(foundEvent.gitSha, 'abcdef123456');
    assert.strictEqual(foundEvent.checkpoint, 'initial-setup');
    assert.strictEqual(foundEvent.retryCount, 1);

  } finally {
    serverProc.kill();
  }
});

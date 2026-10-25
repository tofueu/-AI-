import { test } from 'node:test';
import assert from 'node:assert';
import { spawn } from 'node:child_process';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import crypto from 'node:crypto';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const TEST_DATA_FILE = `test-tasks-${crypto.randomUUID()}.json`;
const DATA_FILE = path.join(ROOT, '..', 'data', TEST_DATA_FILE);

function request(path, method = 'GET', body = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: '127.0.0.1',
      port: 4173,
      path,
      method,
      headers: body ? { 'Content-Type': 'application/json' } : {}
    };
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
        catch { resolve({ status: res.statusCode, body: data }); }
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

test('Integration Test', async (t) => {
  // Setup durable task data
  fs.mkdirSync(path.join(ROOT, '..', 'data'), { recursive: true });
  fs.writeFileSync(DATA_FILE, JSON.stringify([
    {
      id: "durable-test-task",
      agent: "gemini",
      status: "running",
      prompt: "Test durable",
      createdAt: new Date().toISOString()
    }
  ]));

  // Start server
  const serverProcess = spawn('node', ['server.js'], {
    stdio: 'pipe',
    env: { ...process.env, TEST_DATA_FILE }
  });

  // Wait for server to start, poll instead of arbitrary sleep
  let retries = 10;
  let serverReady = false;
  while (retries > 0) {
    try {
      const health = await request('/api/health');
      if (health.status === 200) {
        serverReady = true;
        break;
      }
    } catch (e) {
      // ignore
    }
    await sleep(500);
    retries--;
  }

  if (!serverReady) {
    serverProcess.kill();
    throw new Error('Server failed to start');
  }

  try {
    // 1. Check Health (Provider Auth/Capability Checks)
    const health = await request('/api/health');
    assert.strictEqual(health.status, 200);
    assert.ok('perplexity' in health.body, 'Perplexity capability should be reported');
    assert.ok('grok' in health.body, 'Grok capability should be reported');
    assert.strictEqual(typeof health.body.perplexity, 'boolean');
    assert.strictEqual(typeof health.body.grok, 'boolean');

    // 2. Verify Durable Task Lifecycle (running -> error on restart)
    const tasksResInit = await request('/api/tasks');
    assert.strictEqual(tasksResInit.status, 200);
    const durableTask = tasksResInit.body.find(t => t.id === 'durable-test-task');
    assert.ok(durableTask, 'Durable task should exist');
    assert.strictEqual(durableTask.status, 'error', 'Interrupted task should be marked as error');

    // 3. Create a Custom Task
    const createRes = await request('/api/tasks', 'POST', {
      agent: 'custom',
      prompt: 'Integration test task'
    });
    assert.strictEqual(createRes.status, 201);
    const taskId = createRes.body.id;

    // 4. Verify task is in handoff state
    const tasksRes = await request('/api/tasks');
    assert.strictEqual(tasksRes.status, 200);
    const task = tasksRes.body.find(t => t.id === taskId);
    assert.ok(task, 'Task should exist');
    assert.strictEqual(task.status, 'handoff');

  } finally {
    serverProcess.kill();
    if (fs.existsSync(DATA_FILE)) {
      fs.unlinkSync(DATA_FILE);
    }
  }
});

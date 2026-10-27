import { test } from 'node:test';
import assert from 'node:assert';
import { spawn } from 'node:child_process';
import http from 'node:http';

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
  // Start server
  const serverProcess = spawn('node', ['server.js'], { stdio: 'pipe' });

  // Wait for server to start
  await sleep(2000);

  try {
    // 1. Check Health (Provider Auth/Capability Checks)
    const health = await request('/api/health');
    assert.strictEqual(health.status, 200);
    assert.ok('perplexity' in health.body, 'Perplexity capability should be reported');
    assert.ok('grok' in health.body, 'Grok capability should be reported');
    assert.strictEqual(typeof health.body.perplexity, 'boolean');
    assert.strictEqual(typeof health.body.grok, 'boolean');

    // 2. Create a Custom Task
    const createRes = await request('/api/tasks', 'POST', {
      agent: 'custom',
      prompt: 'Integration test task'
    });
    assert.strictEqual(createRes.status, 201);
    const taskId = createRes.body.id;

    // 3. Verify task is in handoff state
    const tasksRes = await request('/api/tasks');
    assert.strictEqual(tasksRes.status, 200);
    const task = tasksRes.body.find(t => t.id === taskId);
    assert.ok(task, 'Task should exist');
    assert.strictEqual(task.status, 'handoff');

    // NOVA may select Codex without falsely claiming it is authenticated.
    const codexRes = await request('/api/tasks', 'POST', {
      agent: 'codex', prompt: 'NOVA Codex handoff test'
    });
    assert.strictEqual(codexRes.status, 201);
    assert.strictEqual(codexRes.body.agent, 'codex');
    assert.strictEqual(codexRes.body.status, 'handoff');
    assert.strictEqual(codexRes.body.response, '');

  } finally {
    serverProcess.kill();
  }
});

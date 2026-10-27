import { test } from 'node:test';
import assert from 'node:assert';
import { spawn } from 'node:child_process';
import http from 'node:http';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const TEST_PORT = 4174;

function request(path, method = 'GET', body = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: '127.0.0.1',
      port: TEST_PORT,
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
  const tempDir = mkdtempSync(path.join(tmpdir(), 'nova-api-test-'));
  const serverProcess = spawn(process.execPath, ['server.js'], {
    stdio: 'pipe',
    env: { ...process.env, PORT: String(TEST_PORT), TEST_DATA_FILE: path.join(tempDir, 'tasks.json') }
  });

  // Poll only the local task endpoint; external provider health may be offline.
  let ready = false;
  for (let attempt = 0; attempt < 40; attempt++) {
    try { const res = await request('/api/tasks'); if (res.status === 200) { ready = true; break; } }
    catch { /* server not yet listening */ }
    await sleep(100);
  }
  assert.ok(ready, 'Isolated workbench server must start');

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

    // Control panel and NOVA must share the same task API and allow a
    // per-task provider choice without falsely reporting authenticated models.
    const ui = await request('/');
    assert.strictEqual(ui.status, 200);
    assert.match(ui.body, /id="primaryAgent"/);
    const browserCode = await request('/app.js');
    assert.strictEqual(browserCode.status, 200);
    assert.match(browserCode.body, /\$\('#primaryAgent'\)\.value/);
    assert.match(browserCode.body, /網站可達・授權未驗證/);

    for (const provider of ['perplexity', 'grok']) {
      const selected = await request('/api/tasks', 'POST', {
        agent: provider, prompt: 'NOVA and console shared handoff'
      });
      assert.strictEqual(selected.status, 201);
      assert.strictEqual(selected.body.agent, provider);
      assert.strictEqual(selected.body.status, 'handoff');
      assert.strictEqual(selected.body.response, '', 'Do not invent a model response');
      const shared = await request('/api/tasks');
      assert.ok(shared.body.some(t => t.id === selected.body.id && t.agent === provider));
    }

    const noGeminiWorkspace = await request('/api/tasks', 'POST', {
      agent: 'gemini', prompt: 'Must not launch without workspace'
    });
    assert.strictEqual(noGeminiWorkspace.status, 400);

  } finally {
    serverProcess.kill();
    rmSync(tempDir, { recursive: true, force: true });
  }
});

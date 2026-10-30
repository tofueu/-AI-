import { test } from 'node:test';
import assert from 'node:assert';
import { spawn } from 'node:child_process';
import http from 'node:http';
import { mkdtempSync, rmSync, readFileSync, writeFileSync } from 'node:fs';
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

    // 1b. Check Named Account Slots (/api/accounts)
    const accounts = await request('/api/accounts');
    assert.strictEqual(accounts.status, 200);
    assert.ok(Array.isArray(accounts.body.accounts), 'Accounts list should be an array');
    assert.ok(accounts.body.accounts.some(a => a.id === 'gemini_a'), 'Gemini A account slot must exist');
    assert.ok(accounts.body.accounts.some(a => a.id === 'gemini_b'), 'Gemini B account slot must exist');
    assert.ok(accounts.body.accounts.some(a => a.id === 'codex'), 'ChatGPT / Codex account slot must exist');

    const accountLogin = await request('/api/accounts/gemini_a/login', 'POST');
    assert.strictEqual(accountLogin.status, 200);
    assert.ok(accountLogin.body.oauthUrl.includes('accounts.google.com'), 'Must return official OAuth redirect URL without storing credentials');

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

    // Manual results are only allowed for external AI tasks in handoff state.
    // In particular, they cannot forge completion of a Gemini CLI task.
    const team = await request('/api/tasks', 'POST', {
      mode: 'team', agent: 'gemini', workspace: tempDir,
      prompt: 'Test real state transitions'
    });
    assert.strictEqual(team.status, 201);
    const research = team.body.children.find(t => t.agent === 'perplexity');
    const implementation = team.body.children.find(t => t.agent === 'gemini');
    assert.strictEqual(research.status, 'planned');
    assert.strictEqual(implementation.status, 'blocked');

    const earlyResult = await request('/api/tasks/' + research.id + '/result',
      'POST', { response: 'Unverified answer' });
    assert.strictEqual(earlyResult.status, 409);
    const blockedDispatch = await request('/api/tasks/' + implementation.id + '/dispatch', 'POST');
    assert.strictEqual(blockedDispatch.status, 409);
    const forgedGeminiResult = await request('/api/tasks/' + implementation.id + '/result',
      'POST', { response: 'Pretend Gemini finished' });
    assert.strictEqual(forgedGeminiResult.status, 409);

    const handedOff = await request('/api/tasks/' + research.id + '/dispatch', 'POST');
    assert.strictEqual(handedOff.status, 200);
    assert.strictEqual(handedOff.body.task.status, 'handoff');
    const pasted = await request('/api/tasks/' + research.id + '/result',
      'POST', { response: 'Actual manually supplied research' });
    assert.strictEqual(pasted.status, 200);
    const duplicatePaste = await request('/api/tasks/' + research.id + '/result',
      'POST', { response: 'Overwrite finished work' });
    assert.strictEqual(duplicatePaste.status, 409);
    const reopenFinished = await request('/api/tasks/' + research.id + '/dispatch', 'POST');
    assert.strictEqual(reopenFinished.status, 409);

  } finally {
    serverProcess.kill();
    rmSync(tempDir, { recursive: true, force: true });
  }
});

// The NOVA overlay and control panel share this durable file. A malformed
// ledger must fail startup without replacing prior tasks with an empty list.
test('Corrupted task ledger fails closed without overwriting data', async () => {
  for (const [label, raw] of [
    ['invalid-json', '{"tasks":'],
    ['wrong-shape', '{"tasks":[]}'],
    ['invalid-task', '[null]']
  ]) {
    const tempDir = mkdtempSync(path.join(tmpdir(), 'nova-corrupt-ledger-'));
    const dataPath = path.join(tempDir, 'tasks.json');
    writeFileSync(dataPath, raw, 'utf8');
    const child = spawn(process.execPath, ['server.js'], {
      stdio: 'ignore',
      env: { ...process.env, PORT: '4175', TEST_DATA_FILE: dataPath }
    });
    try {
      const exit = await Promise.race([
        new Promise((resolve, reject) => {
          child.once('exit', code => resolve(code));
          child.once('error', reject);
        }),
        sleep(5000).then(() => null)
      ]);
      assert.notStrictEqual(exit, null, label + ': server must not keep running');
      assert.notStrictEqual(exit, 0, label + ': startup must fail');
      assert.strictEqual(readFileSync(dataPath, 'utf8'), raw,
        label + ': task history must remain untouched');
    } finally {
      child.kill();
      rmSync(tempDir, { recursive: true, force: true });
    }
  }
});

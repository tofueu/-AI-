import test from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { mkdtempSync, rmSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { PersistentQueue } from '../lib/dispatcher.js';
import { runOneLocalJob, runNodeTests } from '../lib/worker.js';

async function withQueue(fn) {
  const dir = mkdtempSync(join(tmpdir(), 'aiwb-worker-'));
  try { return await fn(new PersistentQueue(join(dir, 'queue.json')), dir); }
  finally { rmSync(dir, { recursive: true, force: true }); }
}

test('local worker completes allowlisted test job and leaves it for review', async () => withQueue(async q => {
  q.enqueue('test:1', { task: 'ci-smoke' });
  const result = await runOneLocalJob(q, { runner: async () => ({
    ok: true, exitCode: 0, output: 'tests passed'
  }) });
  assert.equal(result.status, 'READY_FOR_REVIEW');
  const job = q.list()[0];
  assert.equal(job.status, 'READY_FOR_REVIEW');
  assert.equal(job.result.kind, 'local-test-only');
  assert.equal(job.checkpoint.finished, true);
  assert.equal((await runOneLocalJob(q)).status, 'IDLE');
}));

test('unrecognized task is blocked, never executed', async () => withQueue(async q => {
  q.enqueue('test:2', { task: 'rm-rf' });
  let executed = false;
  const result = await runOneLocalJob(q, { runner: async () => { executed = true; } });
  assert.equal(result.status, 'BLOCKED');
  assert.equal(executed, false);
  assert.equal(q.list()[0].status, 'BLOCKED');
}));

test('failed local tests preserve checkpoint and do not mark review ready', async () => withQueue(async q => {
  q.enqueue('test:3', { task: 'dispatcher-test' });
  const result = await runOneLocalJob(q, { runner: async () => ({
    ok: false, exitCode: 1, output: 'assertion failed'
  }) });
  assert.equal(result.status, 'BLOCKED');
  assert.equal(q.list()[0].checkpoint.exitCode, 1);
}));

test('local worker records execution errors without pretending success', async () => withQueue(async q => {
  q.enqueue('test:4', { task: 'ci-smoke' });
  const result = await runOneLocalJob(q, { runner: async () => { throw new Error('missing executable'); } });
  assert.equal(result.status, 'BLOCKED');
  assert.match(q.list()[0].checkpoint.reason, /missing executable/);
}));

test('real node test runner executes isolated fixture without a shell', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'aiwb-runner-fixture-'));
  try {
    mkdirSync(join(dir, 'tests'));
    writeFileSync(join(dir, 'tests', 'fixture.test.js'), "const test = require('node:test'); test('fixture', () => {});\n");
    const result = await runNodeTests({ cwd: dir, timeoutMs: 10000 });
    assert.equal(result.ok, true, result.output);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('local test subprocess strips daemon credentials and arbitrary inherited environment', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'aiwb-runner-env-'));
  try {
    mkdirSync(join(dir, 'tests'));
    writeFileSync(join(dir, 'tests', 'fixture.test.js'), "import test from 'node:test'; test('fixture', () => {});\n");
    let launched;
    const spawnImpl = (_command, _args, options) => {
      launched = options;
      const child = new EventEmitter();
      child.stdout = new EventEmitter();
      child.stderr = new EventEmitter();
      child.kill = () => {};
      queueMicrotask(() => child.emit('close', 0, null));
      return child;
    };
    const result = await runNodeTests({
      cwd: dir, timeoutMs: 10000, spawnImpl,
      env: {
        PATH: '/usr/bin', CI: 'true',
        GITHUB_TOKEN: 'github-secret', GH_TOKEN: 'gh-secret',
        GEMINI_API_KEY: 'model-secret', ANTHROPIC_API_KEY: 'other-secret',
        CUSTOM_SECRET: 'arbitrary-secret', NODE_OPTIONS: '--require ./unsafe.js'
      }
    });
    assert.equal(result.ok, true);
    assert.equal(launched.shell, false);
    assert.equal(launched.env.PATH, '/usr/bin');
    assert.equal(launched.env.CI, 'true');
    for (const name of ['GITHUB_TOKEN', 'GH_TOKEN', 'GEMINI_API_KEY',
      'ANTHROPIC_API_KEY', 'CUSTOM_SECRET', 'NODE_OPTIONS']) {
      assert.equal(launched.env[name], undefined, name);
    }
    assert.equal(Object.values(launched.env).some(v => v.includes('secret')), false);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

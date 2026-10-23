import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
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

test('real node test runner executes repository tests without a shell', async () => {
  const result = await runNodeTests({ timeoutMs: 120000 });
  assert.equal(result.ok, true, result.output);
});

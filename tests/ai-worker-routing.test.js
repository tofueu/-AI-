import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { PersistentQueue } from '../lib/dispatcher.js';
import { runOneLocalJob } from '../lib/worker.js';

async function withQueue(fn) {
  const dir = mkdtempSync(join(tmpdir(), 'aiwb-ai-routing-'));
  try { return await fn(new PersistentQueue(join(dir, 'queue.json'))); }
  finally { rmSync(dir, { recursive: true, force: true }); }
}

test('authorized AI job without CLI auth stays WAITING_FOR_AUTH', async () => withQueue(async q => {
  q.enqueue('ai:1', { task: 'aiwb-dispatcher' });
  const result = await runOneLocalJob(q, {
    aiRunner: async () => ({ status: 'WAITING_FOR_AUTH', reason: 'No local CLI login' })
  });
  assert.equal(result.status, 'WAITING_FOR_AUTH');
  assert.equal(q.list()[0].status, 'WAITING_FOR_AUTH');
  assert.equal(q.list()[0].checkpoint.reason, 'local-ai-cli-authorization-required');
}));

test('AI CLI exit alone cannot mark a coding task as reviewed or verified', async () => withQueue(async q => {
  q.enqueue('ai:2', { task: 'aiwb-dispatcher' });
  const result = await runOneLocalJob(q, {
    aiRunner: async () => ({ status: 'EXECUTED_UNVERIFIED', reason: 'needs commit and PR' })
  });
  assert.equal(result.status, 'BLOCKED');
  assert.equal(q.list()[0].checkpoint.reason, 'commit-pr-verification-required');
  assert.notEqual(q.list()[0].status, 'READY_FOR_REVIEW');
}));

test('malformed AI adapter results fail closed and preserve a blocked checkpoint', async () => {
  for (const invalid of [null, undefined, '', 0, {}]) {
    await withQueue(async q => {
      q.enqueue('ai:malformed', { task: 'aiwb-dispatcher' });
      const result = await runOneLocalJob(q, { aiRunner: async () => invalid });
      assert.equal(result.status, 'BLOCKED');
      const job = q.list()[0];
      assert.equal(job.status, 'BLOCKED');
      assert.equal(job.checkpoint.reason, 'commit-pr-verification-required');
      assert.equal(job.checkpoint.adapterStatus, 'BLOCKED');
      assert.match(job.error, /invalid result/);
      assert.notEqual(job.status, 'READY_FOR_REVIEW');
    });
  }
});

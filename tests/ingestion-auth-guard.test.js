import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { PersistentQueue } from '../lib/dispatcher.js';
import { DispatcherDaemon } from '../lib/daemon.js';

test('daemon leaves previously queued jobs untouched when GitHub token expires', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'aiwb-auth-expired-'));
  try {
    const daemon = new DispatcherDaemon({
      queueFile: join(dir, 'queue.json'),
      repo: 'tofueu/-AI-',
      issue: 2,
      token: '',
      allowedActors: ['owner'],
      intervalMs: 100
    });
    const { job } = daemon.queue.enqueue('already-approved', { task: 'unsupported' });
    const result = await daemon.runCycle();
    assert.equal(result.ingestion.status, 'WAITING_FOR_AUTH');
    assert.equal(result.status, 'WAITING_FOR_AUTH');
    assert.equal(result.worker.status, 'SKIPPED');
    assert.deepEqual(result.reports, []);
    assert.equal(daemon.queue.list().find(j => j.id === job.id).status, 'QUEUED');
    assert.ok(daemon.currentBackoff > daemon.intervalMs);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('single-cycle CLI exits nonzero and does not claim queued jobs without GitHub token', () => {
  const dir = mkdtempSync(join(tmpdir(), 'aiwb-cycle-auth-expired-'));
  try {
    const queue = new PersistentQueue(join(dir, 'dispatcher-queue.json'));
    const { job } = queue.enqueue('already-approved', { task: 'unsupported' });
    const result = spawnSync(process.execPath, ['scripts/dispatch-cycle.js'], {
      cwd: process.cwd(),
      encoding: 'utf8',
      timeout: 10000,
      env: {
        ...process.env,
        GITHUB_TOKEN: '',
        AIWB_ALLOWED_GITHUB_ACTORS: 'owner',
        AI_WORKBENCH_DATA_DIR: dir
      }
    });
    assert.equal(result.error, undefined);
    assert.equal(result.status, 2, result.stderr || result.stdout);
    const output = JSON.parse(result.stdout);
    assert.equal(output.ingestion.status, 'WAITING_FOR_AUTH');
    assert.equal(output.status, 'WAITING_FOR_AUTH');
    assert.equal(output.worker.status, 'SKIPPED');
    assert.deepEqual(output.reports, []);
    assert.equal(queue.list().find(j => j.id === job.id).status, 'QUEUED');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

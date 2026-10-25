import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { DispatcherDaemon } from '../lib/daemon.js';

test('daemon fails closed when trusted GitHub actors are missing', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'aiwb-actor-guard-'));
  try {
    const daemon = new DispatcherDaemon({
      queueFile: join(dir, 'queue.json'),
      repo: 'tofueu/-AI-',
      issue: 2,
      token: 'fake-token',
      allowedActors: []
    });
    const { job } = daemon.queue.enqueue('blocked-actor-guard', { task: 'unsupported' });
    const result = await daemon.runCycle();
    assert.equal(result.ingestion.status, 'BLOCKED');
    assert.equal(result.status, 'BLOCKED');
    assert.equal(result.worker.status, 'SKIPPED');
    assert.deepEqual(result.reports, []);
    assert.equal(daemon.queue.list().find(j => j.id === job.id).status, 'QUEUED');
    assert.ok(daemon.currentBackoff > daemon.intervalMs);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('single-cycle CLI exits nonzero and does not claim work without trusted actors', () => {
  const dir = mkdtempSync(join(tmpdir(), 'aiwb-cycle-guard-'));
  try {
    const result = spawnSync(process.execPath, ['scripts/dispatch-cycle.js'], {
      cwd: process.cwd(),
      encoding: 'utf8',
      timeout: 10000,
      env: {
        ...process.env,
        GITHUB_TOKEN: 'fake-token',
        AIWB_ALLOWED_GITHUB_ACTORS: '',
        AI_WORKBENCH_DATA_DIR: dir
      }
    });
    assert.equal(result.error, undefined);
    assert.equal(result.status, 2, result.stderr || result.stdout);
    const output = JSON.parse(result.stdout);
    assert.equal(output.ingestion.status, 'BLOCKED');
    assert.equal(output.status, 'BLOCKED');
    assert.equal(output.worker.status, 'SKIPPED');
    assert.deepEqual(output.reports, []);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

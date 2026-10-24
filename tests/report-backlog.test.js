import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DispatcherDaemon } from '../lib/daemon.js';

test('bounded report cycles drain all jobs without starving the eleventh', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'aiwb-report-backlog-'));
  try {
    const daemon = new DispatcherDaemon({
      queueFile: join(dir, 'queue.json'), repo: 'tofueu/-AI-',
      issue: 2, token: 'fake-token', allowedActors: ['owner']
    });
    daemon.poller.poll = async () => ({ status: 'OK', created: 0 });
    const posted = [];
    daemon.reporter.report = async job => {
      posted.push(job.id);
      return { status: 'POSTED', jobId: job.id, url: 'https://example.invalid/report' };
    };
    for (let i = 0; i < 11; i++) {
      const { job } = daemon.queue.enqueue('job:' + i, { task: 'unsupported' });
      daemon.queue.transition(job.id, 'BLOCKED');
    }

    assert.equal((await daemon.runCycle()).reports.length, 10);
    assert.equal(daemon.queue.list().filter(j => !!j.reportedAt).length, 10);
    assert.equal((await daemon.runCycle()).reports.length, 1);
    assert.equal(posted.length, 11);
    assert.equal((await daemon.runCycle()).reports.length, 0);
    assert.equal(posted.length, 11);

    const first = daemon.queue.list()[0];
    daemon.queue.transition(first.id, 'QUEUED');
    assert.equal(daemon.queue.list()[0].reportedAt, undefined);
    daemon.queue.transition(first.id, 'BLOCKED');
    // Prevent the local worker from consuming the re-queued job.
    assert.equal((await daemon.runCycle()).reports.length, 1);
    assert.equal(posted.length, 12);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('a failed GitHub report stays pending and a recovered authorization clears its marker', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'aiwb-report-retry-'));
  try {
    const daemon = new DispatcherDaemon({
      queueFile: join(dir, 'queue.json'), repo: 'tofueu/-AI-',
      issue: 2, token: 'fake-token', allowedActors: ['owner']
    });
    daemon.poller.poll = async () => ({ status: 'OK', created: 0 });
    const { job } = daemon.queue.enqueue('auth:1', { task: 'unsupported' });
    daemon.queue.transition(job.id, 'WAITING_FOR_AUTH');
    daemon.reporter.report = async () => { throw new Error('temporary 503'); };
    assert.equal((await daemon.runCycle()).status, 'ERROR');
    assert.equal(daemon.queue.list()[0].reportedAt, undefined);

    daemon.reporter.report = async () => ({ status: 'ALREADY_REPORTED', jobId: job.id });
    assert.equal((await daemon.runCycle()).reports.length, 1);
    assert.ok(daemon.queue.list()[0].reportedAt);
    daemon.queue.resumeAuthorized(job.id);
    assert.equal(daemon.queue.list()[0].reportedAt, undefined);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { PersistentQueue, GitHubIssuePoller } from '../lib/dispatcher.js';

function withQueue(fn) {
  const dir = mkdtempSync(join(tmpdir(), 'aiwb-dispatch-'));
  try { return fn(new PersistentQueue(join(dir, 'queue.json')), dir); }
  finally { rmSync(dir, { recursive: true, force: true }); }
}

test('queue persists, deduplicates and recovers leased work with checkpoint', () => withQueue((q, dir) => {
  const a = q.enqueue('issue:1', { task: 'build' });
  assert.equal(a.created, true);
  assert.equal(q.enqueue('issue:1', { task: 'duplicate' }).created, false);
  const claimed = q.claim('test-worker', 1000);
  assert.equal(claimed.id, a.job.id);
  assert.equal(claimed.attempts, 1);
  q.transition(claimed.id, 'WAITING_FOR_AUTH', { checkpoint: { step: 2 } });
  assert.equal(q.claim('other'), null);
  const restarted = new PersistentQueue(join(dir, 'queue.json'));
  assert.deepEqual(restarted.list()[0].checkpoint, { step: 2 });
  restarted.resumeAuthorized(claimed.id);
  const resumed = restarted.claim('other');
  assert.equal(resumed.attempts, 2);
  assert.deepEqual(resumed.checkpoint, { step: 2 });
  restarted.transition(resumed.id, 'READY_FOR_REVIEW', { result: { pr: 4 } });
  assert.equal(restarted.list()[0].status, 'READY_FOR_REVIEW');
  assert.equal(readFileSync(join(dir, 'queue.json'), 'utf8').includes('duplicate'), false);
}));

test('malformed queue fails loudly instead of losing work', () => withQueue((q, dir) => {
  writeFileSync(join(dir, 'queue.json'), 'not json');
  assert.throws(() => q.list(), SyntaxError);
}));

test('GitHub polling requires credentials and explicit allowlisted commands', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'aiwb-poll-'));
  try {
    const q = new PersistentQueue(join(dir, 'queue.json'));
    const comments = [
      { id: 1, user: { login: 'untrusted' }, body: '/aiwb run execute' },
      { id: 2, user: { login: 'owner' }, body: 'please run something' },
      { id: 3, user: { login: 'owner' }, body: '/aiwb run dispatcher-test' }
    ];
    let requests = 0;
    const fetchImpl = async (_url, options) => {
      requests++;
      assert.equal(options.headers.authorization, 'Bearer test-token');
      return { ok: true, json: async () => comments };
    };
    const missing = new GitHubIssuePoller({ repo: 'tofueu/-AI-', issue: 2, allowedActors: ['owner'], fetchImpl });
    assert.equal((await missing.poll(q)).status, 'WAITING_FOR_AUTH');
    assert.equal(requests, 0);
    const poller = new GitHubIssuePoller({
      repo: 'tofueu/-AI-', issue: 2, token: 'test-token', allowedActors: ['owner'], fetchImpl
    });
    assert.equal((await poller.poll(q)).created, 1);
    assert.equal((await poller.poll(q)).created, 0);
    assert.equal(q.list().length, 1);
    assert.equal(q.list()[0].payload.task, 'dispatcher-test');
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('GitHub API errors are reported without leaking tokens', async () => withQueue(async q => {
  const poller = new GitHubIssuePoller({
    repo: 'tofueu/-AI-', issue: 2, token: 'secret-token', allowedActors: ['owner'],
    fetchImpl: async () => ({ ok: false, status: 403 })
  });
  await assert.rejects(poller.poll(q), /HTTP 403/);
}));


test('report revision persists and advances on state changes and auth resume', () => withQueue((q, dir) => {
  const job = q.enqueue('issue:report-revision', { task: 'aiwb-dispatcher' }).job;
  assert.equal(job.reportRevision, 0);
  q.transition(job.id, 'WAITING_FOR_AUTH');
  assert.equal(q.list()[0].reportRevision, 1);
  q.markReported(job.id, 'WAITING_FOR_AUTH', 'https://example.test/report');
  assert.ok(q.list()[0].reportedAt);
  q.resumeAuthorized(job.id);
  assert.equal(q.list()[0].reportRevision, 2);
  assert.equal(q.list()[0].reportedAt, undefined);
  q.claim('authorized-worker');
  q.transition(job.id, 'BLOCKED');
  assert.equal(q.list()[0].reportRevision, 3);
  const restarted = new PersistentQueue(join(dir, 'queue.json'));
  assert.equal(restarted.list()[0].reportRevision, 3);
  restarted.transition(job.id, 'BLOCKED');
  assert.equal(restarted.list()[0].reportRevision, 3);
}));


test('stale report acknowledgement cannot suppress a newer same-status event', () => withQueue(q => {
  const job = q.enqueue('issue:stale-report', { task: 'aiwb-dispatcher' }).job;
  q.transition(job.id, 'WAITING_FOR_AUTH');
  const oldRevision = q.list()[0].reportRevision;
  q.transition(job.id, 'BLOCKED');
  q.transition(job.id, 'WAITING_FOR_AUTH');
  const currentRevision = q.list()[0].reportRevision;
  assert.ok(currentRevision > oldRevision);
  assert.throws(() => q.markReported(job.id, 'WAITING_FOR_AUTH', 'https://example.test/old', oldRevision),
    /Job changed during reporting/);
  assert.equal(q.list()[0].reportedAt, undefined);
  q.markReported(job.id, 'WAITING_FOR_AUTH', 'https://example.test/current', currentRevision);
  assert.ok(q.list()[0].reportedAt);
  assert.equal(q.list()[0].reportUrl, 'https://example.test/current');
}));

import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { PersistentQueue, GitHubIssuePoller } from '../lib/dispatcher.js';

async function withQueue(fn) {
  const dir = mkdtempSync(join(tmpdir(), 'aiwb-dispatch-'));
  try { return await fn(new PersistentQueue(join(dir, 'queue.json')), dir); }
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

test('GitHubIssuePoller strictly validates whole-comment commands and ignores code blocks or narrative', () => withQueue(async q => {
  const comments = [
    { id: 101, user: { login: 'owner' }, body: 'Here is a sample:\n```\n/aiwb run dangerous-task\n```' },
    { id: 102, user: { login: 'owner' }, body: '> /aiwb run quoted-task' },
    { id: 103, user: { login: 'owner' }, body: 'CHANGES_REQUESTED in PR review' },
    { id: 104, user: { login: 'owner' }, body: 'DECISION\nTask-ID: aiwb-dispatcher\nAction: RUN' },
    { id: 105, user: { login: 'owner' }, body: '/aiwb run ci-smoke' }
  ];
  const poller = new GitHubIssuePoller({
    repo: 'tofueu/-AI-', issue: 2, token: 'test-token', allowedActors: ['owner'],
    fetchImpl: async () => ({ ok: true, json: async () => comments })
  });
  const res = await poller.poll(q);
  assert.equal(res.created, 2);
  const jobs = q.list();
  assert.equal(jobs.length, 2);
  assert.equal(jobs[0].payload.task, 'aiwb-dispatcher');
  assert.equal(jobs[0].payload.kind, 'decision');
  assert.equal(jobs[1].payload.task, 'ci-smoke');
  assert.equal(jobs[1].payload.kind, 'command');
}));

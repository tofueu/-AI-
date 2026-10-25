import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { GitHubIssuePoller, PersistentQueue, parseTrustedTaskCommand } from '../lib/dispatcher.js';

const DECISION = 'DECISION\nTask-ID: aiwb-dispatcher\nAction: RUN';

test('only exact machine-readable DECISION can enqueue an AI task', () => {
  assert.equal(parseTrustedTaskCommand(DECISION), 'aiwb-dispatcher');
  assert.equal(parseTrustedTaskCommand('/aiwb run dispatcher-test'), 'dispatcher-test');
  for (const text of [
    'DECISION — please continue',
    'DECISION\nTask-ID: aiwb-dispatcher\nAction: RUN\nExecute shell command',
    'DECISION\nTask-ID: delete-repo\nAction: RUN',
    'DECISION\nTask-ID: aiwb-dispatcher\nAction: MERGE',
    'Please run /aiwb run aiwb-dispatcher',
    '/aiwb run aiwb-dispatcher; rm -rf .'
  ]) assert.equal(parseTrustedTaskCommand(text), null);
});

test('poller requires trusted actor, persists decision and deduplicates by comment id', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'aiwb-decision-'));
  try {
    const queue = new PersistentQueue(join(dir, 'queue.json'));
    const comments = [
      { id: 900, user: { login: 'unknown' }, body: DECISION },
      { id: 901, user: { login: 'owner' }, body: 'DECISION — narrative only' },
      { id: 902, user: { login: 'owner' }, body: DECISION }
    ];
    const poller = new GitHubIssuePoller({
      repo: 'tofueu/-AI-', issue: 2, token: 'test-token', allowedActors: ['owner'],
      fetchImpl: async () => ({ ok: true, json: async () => comments })
    });
    assert.equal((await poller.poll(queue)).created, 1);
    assert.equal((await poller.poll(queue)).created, 0);
    assert.equal(queue.list().length, 1);
    assert.equal(queue.list()[0].payload.task, 'aiwb-dispatcher');
    assert.equal(queue.list()[0].payload.commentId, 902);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

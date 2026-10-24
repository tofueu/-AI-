import test from 'node:test';
import assert from 'node:assert/strict';
import { GitHubReviewPoller } from '../lib/github-review-poller.js';

const HEAD = 'a'.repeat(40);
const OTHER = 'b'.repeat(40);
const pr = (overrides = {}) => ({
  state: 'open', user: { login: 'jules-bot' },
  head: { sha: HEAD, repo: { full_name: 'tofueu/-AI-' } }, ...overrides
});
const review = (id, overrides = {}) => ({
  id, state: 'CHANGES_REQUESTED', user: { login: 'owner' },
  commit_id: HEAD, submitted_at: '2026-10-25T00:00:00Z',
  body: 'Please add regression tests', ...overrides
});
function queue() {
  const keys = new Set();
  const jobs = [];
  return {
    jobs,
    enqueue(key, payload) {
      if (keys.has(key)) return { created: false };
      keys.add(key);
      jobs.push({ key, payload });
      return { created: true };
    }
  };
}
function makeFetch(pull, reviews) {
  return async (url, options) => {
    assert.equal(options.headers.authorization, 'Bearer fake-token');
    if (url.includes('/reviews?')) return { ok: true, json: async () => reviews };
    if (url.endsWith('/pulls/5')) return { ok: true, json: async () => pull };
    throw new Error('Unexpected URL: ' + url);
  };
}

test('trusted CHANGES_REQUESTED on current PR head is idempotently enqueued without review body', async () => {
  const q = queue();
  const poller = new GitHubReviewPoller({
    repo: 'tofueu/-AI-', prNumbers: [5], token: 'fake-token',
    allowedReviewers: ['owner'],
    fetchImpl: makeFetch(pr(), [review(100)])
  });
  assert.deepEqual(await poller.poll(q), { status: 'OK', created: 1 });
  assert.deepEqual(await poller.poll(q), { status: 'OK', created: 0 });
  assert.equal(q.jobs.length, 1);
  assert.deepEqual(q.jobs[0].payload, {
    task: 'aiwb-pr-review-fix', kind: 'verified-pr-review',
    pr: 5, reviewId: 100, reviewer: 'owner', headSha: HEAD
  });
  assert.equal(JSON.stringify(q.jobs).includes('Please add regression tests'), false);
});

test('ignores untrusted, self, stale, comment-only, and unsubmitted reviews', async () => {
  const q = queue();
  const poller = new GitHubReviewPoller({
    repo: 'tofueu/-AI-', prNumbers: [5], token: 'fake-token',
    allowedReviewers: ['owner', 'jules-bot'],
    fetchImpl: makeFetch(pr(), [
      review(1, { user: { login: 'stranger' } }),
      review(2, { user: { login: 'jules-bot' } }),
      review(3, { commit_id: OTHER }),
      review(4, { state: 'COMMENTED' }),
      review(5, { submitted_at: null }),
      review(6, { id: -1 })
    ])
  });
  assert.equal((await poller.poll(q)).created, 0);
  assert.deepEqual(q.jobs, []);
});

test('closed or forked PR cannot create repair tasks', async () => {
  for (const p of [pr({ state: 'closed' }), pr({ head: { sha: HEAD, repo: { full_name: 'fork/-AI-' } } })]) {
    const q = queue();
    const poller = new GitHubReviewPoller({
      repo: 'tofueu/-AI-', prNumbers: [5], token: 'fake-token',
      allowedReviewers: ['owner'], fetchImpl: makeFetch(p, [review(7)])
    });
    assert.equal((await poller.poll(q)).created, 0);
  }
});

test('fails closed for missing token, missing reviewer allowlist, malformed API, and HTTP errors', async () => {
  const q = queue();
  const base = { repo: 'tofueu/-AI-', prNumbers: [5], allowedReviewers: ['owner'] };
  assert.equal((await new GitHubReviewPoller(base).poll(q)).status, 'WAITING_FOR_AUTH');
  assert.equal((await new GitHubReviewPoller({
    ...base, token: 'fake-token', allowedReviewers: []
  }).poll(q)).status, 'BLOCKED');
  await assert.rejects(new GitHubReviewPoller({
    ...base, token: 'fake-token', fetchImpl: async () => ({ ok: false, status: 403 })
  }).poll(q), /HTTP 403/);
  await assert.rejects(new GitHubReviewPoller({
    ...base, token: 'fake-token', fetchImpl: makeFetch(pr(), { error: 'not array' })
  }).poll(q), /Invalid GitHub reviews response/);
  assert.deepEqual(q.jobs, []);
});

test('no PR allowlist means disabled and no API calls', async () => {
  const poller = new GitHubReviewPoller({
    repo: 'tofueu/-AI-', prNumbers: [], token: 'fake-token',
    allowedReviewers: ['owner'], fetchImpl: async () => { throw Error('Unexpected network call'); }
  });
  assert.equal((await poller.poll(queue())).status, 'DISABLED');
  assert.throws(() => new GitHubReviewPoller({ repo: 'tofueu/-AI-', prNumbers: [0] }), /Invalid PR allowlist/);
});

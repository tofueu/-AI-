import test from 'node:test';
import assert from 'node:assert/strict';
import { GitHubIssueReporter } from '../lib/github-reporter.js';

const id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
const job = { id, status: 'READY_FOR_REVIEW', payload: { task: 'ci-smoke' } };

test('missing GitHub token does not make any network calls', async () => {
  let calls = 0;
  const reporter = new GitHubIssueReporter({
    repo: 'tofueu/-AI-', issue: 2,
    fetchImpl: async () => { calls++; throw new Error('unexpected'); }
  });
  assert.equal((await reporter.report(job)).status, 'WAITING_FOR_AUTH');
  assert.equal(calls, 0);
});

test('result is written to GitHub once and includes honest local-only provenance', async () => {
  const comments = [];
  let writes = 0;
  const reporter = new GitHubIssueReporter({
    repo: 'tofueu/-AI-', issue: 2, token: 'test-token',
    fetchImpl: async (_url, options) => {
      assert.equal(options.headers.authorization, 'Bearer test-token');
      if (options.method === 'POST') {
        writes++;
        const body = JSON.parse(options.body).body;
        assert.match(body, /not\*\* Gemini\/Jules autonomous execution/);
        assert.doesNotMatch(body, /test-token/);
        comments.push({ body, html_url: 'https://github.com/tofueu/-AI-/issues/2#issuecomment-100' });
        return { ok: true, json: async () => comments.at(-1) };
      }
      return { ok: true, json: async () => comments };
    }
  });
  assert.equal((await reporter.report(job)).status, 'POSTED');
  assert.equal((await reporter.report(job)).status, 'ALREADY_REPORTED');
  assert.equal(writes, 1);
});

test('unapproved statuses and invalid job IDs cannot be posted', async () => {
  const reporter = new GitHubIssueReporter({ repo: 'tofueu/-AI-', issue: 2, token: 'x' });
  await assert.rejects(reporter.report({ ...job, status: 'RUNNING' }), /not reportable/);
  await assert.rejects(reporter.report({ ...job, id: 'bad-id' }), /not reportable/);
});

test('GitHub errors are reported without disclosing credentials', async () => {
  const reporter = new GitHubIssueReporter({
    repo: 'tofueu/-AI-', issue: 2, token: 'secret-token',
    fetchImpl: async () => ({ ok: false, status: 403 })
  });
  await assert.rejects(reporter.report(job), /HTTP 403/);
});

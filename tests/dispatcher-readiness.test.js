import test from 'node:test';
import assert from 'node:assert/strict';
import { inspectDispatcherReadiness } from '../lib/dispatcher-readiness.js';

test('missing token, actor and CLI fail closed without making network requests', async () => {
  let networkCalls = 0;
  const result = await inspectDispatcherReadiness({
    env: {}, fetchImpl: async () => { networkCalls++; throw new Error('unexpected'); },
    branchProbe: () => 'main', cliProbe: () => { throw new Error('ENOENT'); }
  });
  assert.equal(result.status, 'BLOCKED');
  assert.equal(networkCalls, 0);
  assert.deepEqual(result.blockers.sort(), [
    'AGY_CLI_UNAVAILABLE', 'CLI_OPT_IN_MISSING', 'GITHUB_TOKEN_MISSING',
    'ISOLATED_BRANCH_NOT_VERIFIED', 'TRUSTED_ACTORS_MISSING'
  ].sort());
  assert.equal(result.checks.subscriptionLogin, 'UNVERIFIED');
});

test('valid read-only GitHub check never claims login, deployment, or E2E', async () => {
  let called = 0;
  const result = await inspectDispatcherReadiness({
    env: { GITHUB_TOKEN: 'secret-token', AIWB_ALLOWED_GITHUB_ACTORS: 'tofueu',
      AIWB_ENABLE_AGY_CLI: '1' },
    fetchImpl: async (url, opts) => {
      called++;
      assert.match(url, /\/issues\/2$/);
      assert.equal(opts.headers.authorization, 'Bearer secret-token');
      return { ok: true, status: 200 };
    },
    branchProbe: () => 'aiwb/daemon-cli-recovery-20261024',
    cliProbe: () => 'agy 1.0'
  });
  assert.equal(called, 1);
  assert.equal(result.status, 'PREREQUISITES_PRESENT_E2E_UNVERIFIED');
  assert.equal(result.checks.githubRead, 'VERIFIED_READ_ONLY');
  assert.equal(result.checks.githubWritePermission, 'UNVERIFIED');
  assert.equal(result.checks.subscriptionLogin, 'UNVERIFIED');
  assert.equal(result.checks.codingCommitPrReviewE2E, 'UNVERIFIED');
  assert.ok(!JSON.stringify(result).includes('secret-token'));
});

test('invalid GitHub token is a blocker even with installed CLI', async () => {
  const result = await inspectDispatcherReadiness({
    env: { GITHUB_TOKEN: 'bad', AIWB_ALLOWED_GITHUB_ACTORS: 'tofueu',
      AIWB_ENABLE_AGY_CLI: '1' },
    fetchImpl: async () => ({ ok: false, status: 401 }),
    branchProbe: () => 'aiwb/test', cliProbe: () => 'agy'
  });
  assert.equal(result.status, 'BLOCKED');
  assert.equal(result.checks.githubRead, 'HTTP_401');
  assert.ok(result.blockers.includes('GITHUB_READ_NOT_VERIFIED'));
});

test('GitHub network error and detached HEAD are blocked without leaking details', async () => {
  const result = await inspectDispatcherReadiness({
    env: { GITHUB_TOKEN: 'sensitive', AIWB_ALLOWED_GITHUB_ACTORS: 'tofueu',
      AIWB_ENABLE_AGY_CLI: '1' },
    fetchImpl: async () => { throw new Error('sensitive'); },
    branchProbe: () => { throw new Error('detached'); }, cliProbe: () => 'agy'
  });
  assert.equal(result.status, 'BLOCKED');
  assert.equal(result.checks.githubRead, 'NETWORK_ERROR');
  assert.equal(result.checks.featureBranch, 'UNVERIFIED');
  assert.ok(!JSON.stringify(result).includes('sensitive'));
});

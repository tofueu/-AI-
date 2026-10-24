// Read-only diagnostics for the GitHub -> authorized CLI dispatcher.
// Presence of a token or CLI is never proof of subscription login or E2E execution.
import { execFileSync } from 'node:child_process';

export async function inspectDispatcherReadiness({
  env = process.env,
  fetchImpl = fetch,
  branchProbe = () => execFileSync('git', ['symbolic-ref', '--quiet', '--short', 'HEAD'],
    { encoding: 'utf8', timeout: 5000, windowsHide: true }).trim(),
  cliProbe = () => execFileSync('agy', ['--version'],
    { encoding: 'utf8', timeout: 5000, windowsHide: true }).trim()
} = {}) {
  const blockers = [];
  const checks = {};
  const repo = env.AIWB_GITHUB_REPO || 'tofueu/-AI-';
  const issue = Number(env.AIWB_GITHUB_ISSUE || 2);
  const token = env.GITHUB_TOKEN || '';
  const actors = String(env.AIWB_ALLOWED_GITHUB_ACTORS || '').split(',').map(s => s.trim()).filter(Boolean);
  if (!/^[\\w.-]+\\/[\\w.-]+$/.test(repo) || !Number.isInteger(issue) || issue < 1) {
    checks.githubTarget = 'INVALID';
    blockers.push('INVALID_GITHUB_TARGET');
  } else {
    checks.githubTarget = 'VALID_FORMAT';
  }
  if (!token) {
    checks.githubRead = 'WAITING_FOR_AUTH';
    blockers.push('GITHUB_TOKEN_MISSING');
  } else if (checks.githubTarget === 'VALID_FORMAT') {
    try {
      const response = await fetchImpl(`https://api.github.com/repos/${repo}/issues/${issue}`, {
        headers: { accept: 'application/vnd.github+json', authorization: `Bearer ${token}`,
          'user-agent': 'ai-workbench-readiness' }
      });
      checks.githubRead = response.ok ? 'VERIFIED_READ_ONLY' : `HTTP_${response.status}`;
      if (!response.ok) blockers.push('GITHUB_READ_NOT_VERIFIED');
    } catch (_) {
      checks.githubRead = 'NETWORK_ERROR';
      blockers.push('GITHUB_READ_NOT_VERIFIED');
    }
  }
  checks.actorAllowlist = actors.length ? 'CONFIGURED_UNVERIFIED' : 'MISSING';
  if (!actors.length) blockers.push('TRUSTED_ACTORS_MISSING');
  checks.cliOptIn = env.AIWB_ENABLE_AGY_CLI === '1' ? 'ENABLED' : 'DISABLED';
  if (checks.cliOptIn !== 'ENABLED') blockers.push('CLI_OPT_IN_MISSING');
  try {
    const branch = branchProbe();
    checks.featureBranch = typeof branch === 'string' && /^aiwb\\/[A-Za-z0-9._/-]+$/.test(branch)
      && branch !== 'aiwb/' ? 'VERIFIED' : 'BLOCKED';
  } catch (_) {
    checks.featureBranch = 'UNVERIFIED';
  }
  if (checks.featureBranch !== 'VERIFIED') blockers.push('ISOLATED_BRANCH_NOT_VERIFIED');
  try {
    checks.agyBinary = cliProbe() ? 'FOUND' : 'UNVERIFIED';
  } catch (_) {
    checks.agyBinary = 'MISSING_OR_UNAVAILABLE';
  }
  if (checks.agyBinary !== 'FOUND') blockers.push('AGY_CLI_UNAVAILABLE');
  // Deliberately do not trigger a billable model request, OAuth or PR write.
  checks.subscriptionLogin = 'UNVERIFIED';
  checks.githubWritePermission = 'UNVERIFIED';
  checks.daemonDeployment = 'UNVERIFIED';
  checks.codingCommitPrReviewE2E = 'UNVERIFIED';
  return {
    status: blockers.length ? 'BLOCKED' : 'PREREQUISITES_PRESENT_E2E_UNVERIFIED',
    checks, blockers,
    note: 'Read-only diagnostics only. No model request, OAuth bypass, GitHub write, or deployment occurred.'
  };
}

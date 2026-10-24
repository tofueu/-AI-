// Explicitly opt-in Antigravity (Google Pro login) coding adapter. Never treats a GitHub comment as a shell command.
import { spawn, execFileSync } from 'node:child_process';

const PROMPTS = Object.freeze({
  'aiwb-dispatcher': [
    'Improve the existing AI Workbench GitHub-to-authorized-worker-to-GitHub dispatcher.',
    'Work only in the current feature branch. Do not merge, push, alter main, purchase APIs,',
    'bypass OAuth/2FA, or claim tests you did not run. Prefer small tested changes.',
    'Record what was changed and what remains blocked. Do not request user approval for',
    'ordinary non-destructive technical decisions.'
  ].join(' ')
});
export const APPROVED_AI_TASK_IDS = Object.freeze(Object.keys(PROMPTS));

export async function runApprovedAgyTask({
  task, cwd = process.cwd(), enabled = process.env.AIWB_ENABLE_AGY_CLI === '1',
  spawnImpl = spawn, timeoutMs = 180000,
  branchProbe = dir => execFileSync('git', ['symbolic-ref', '--quiet', '--short', 'HEAD'],
    { cwd: dir, encoding: 'utf8', timeout: 5000, windowsHide: true }).trim()
} = {}) {
  if (!Object.hasOwn(PROMPTS, task)) return { status: 'BLOCKED', reason: 'AI task is not allowlisted' };
  if (!enabled) return { status: 'WAITING_FOR_AUTH', reason: 'Antigravity CLI worker is not explicitly enabled or authorized' };
  // A prompt cannot enforce "do not modify main". Fail closed unless the actual
  // working tree is on an isolated AI Workbench feature branch. Detached HEAD,
  // main/master, non-git directories and failed probes must never launch the CLI.
  let currentBranch;
  try { currentBranch = branchProbe(cwd); }
  catch (_) { return { status: 'BLOCKED', reason: 'Cannot verify an isolated AI Workbench Git branch' }; }
  if (typeof currentBranch !== 'string' || !/^aiwb\\/[a-zA-Z0-9._/-]+$/.test(currentBranch)) {
    return { status: 'BLOCKED', reason: 'AI coding requires an aiwb/ feature branch; main and detached HEAD are forbidden' };
  }
  // Subscription-based local login only. Never silently fall back to billable API keys.
  const env = { ...process.env };
  for (const key of ['GITHUB_TOKEN', 'GH_TOKEN', 'GEMINI_API_KEY', 'GOOGLE_API_KEY',
    'GOOGLE_GENAI_USE_VERTEXAI', 'GOOGLE_APPLICATION_CREDENTIALS',
    'OPENAI_API_KEY', 'ANTHROPIC_API_KEY']) delete env[key];
  return await new Promise(resolveResult => {
    let settled = false;
    let child;
    let timer;
    const finish = result => {
      if (settled) return;
      settled = true;
      if (timer) clearTimeout(timer);
      resolveResult(result);
    };
    try {
      child = spawnImpl('agy', [
        '-p', PROMPTS[task], '--output-format', 'json',
        '--add-dir', cwd, '--sandbox', '--disable-slash-commands'
      ], { cwd, shell: false, stdio: ['ignore', 'pipe', 'pipe'], env });
    } catch (_) {
      return finish({ status: 'WAITING_FOR_AUTH', reason: 'Antigravity CLI is unavailable' });
    }
    // Never publish stdout/stderr: they can contain code, user data or credentials.
    child.stdout?.resume?.();
    child.stderr?.resume?.();
    child.on('error', () => finish({ status: 'WAITING_FOR_AUTH', reason: 'Antigravity CLI failed to start' }));
    child.on('close', (code, signal) => finish(code === 0 && !signal
      ? { status: 'EXECUTED_UNVERIFIED', reason: 'CLI exited successfully; Git commit/PR and independent review are still required' }
      : { status: 'BLOCKED', reason: 'Antigravity CLI exited without verified success', exitCode: code }));
    timer = setTimeout(() => {
      child.kill?.('SIGKILL');
      finish({ status: 'BLOCKED', reason: 'Antigravity CLI timed out; checkpoint required' });
    }, timeoutMs);
  });
}

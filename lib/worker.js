// A deliberately restricted local worker. It does NOT impersonate Gemini or Jules.
import { spawn } from 'node:child_process';
import { readdirSync } from 'node:fs';
import { resolve } from 'node:path';

const SAFE_TASKS = new Set(['ci-smoke', 'dispatcher-test']);

export function runNodeTests({ cwd = process.cwd(), timeoutMs = 120000, spawnImpl = spawn } = {}) {
  const testDir = resolve(cwd, 'tests');
  const files = readdirSync(testDir).filter(name => name.endsWith('.test.js')).sort()
    .map(name => resolve(testDir, name));
  if (!files.length) throw new Error('No test files; refusing to mark task successful');
  return new Promise((resolveResult, reject) => {
    const child = spawnImpl(process.execPath, ['--test', ...files], {
      cwd, shell: false, stdio: ['ignore', 'pipe', 'pipe'], env: process.env
    });
    let output = '';
    let settled = false;
    const append = chunk => { output = (output + String(chunk)).slice(-8192); };
    child.stdout?.on('data', append);
    child.stderr?.on('data', append);
    const timer = setTimeout(() => child.kill('SIGKILL'), timeoutMs);
    const finish = (err, result) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (err) reject(err);
      else resolveResult(result);
    };
    child.on('error', err => finish(err));
    child.on('close', (code, signal) => finish(null, {
      ok: code === 0 && !signal, exitCode: code, signal: signal || null, output
    }));
  });
}

// Only trusted, explicit task IDs are executable. No issue comment is ever run as a shell command.
export async function runOneLocalJob(queue, {
  worker = 'local-smoke-worker', cwd = process.cwd(), runner = runNodeTests
} = {}) {
  const job = queue.claim(worker, 180000);
  if (!job) return { status: 'IDLE' };
  const task = job.payload?.task;
  if (!SAFE_TASKS.has(task)) {
    queue.transition(job.id, 'BLOCKED', {
      error: 'Unsupported task; no AI execution adapter is configured',
      checkpoint: { task, reason: 'unsupported-task' }
    });
    return { status: 'BLOCKED', id: job.id, task };
  }
  try {
    const result = await runner({ cwd });
    if (!result.ok) {
      queue.transition(job.id, 'BLOCKED', {
        error: 'Local test runner failed; inspect bounded local result',
        checkpoint: { task, exitCode: result.exitCode, output: result.output }
      });
      return { status: 'BLOCKED', id: job.id, task, exitCode: result.exitCode };
    }
    queue.transition(job.id, 'READY_FOR_REVIEW', {
      result: { task, kind: 'local-test-only', exitCode: 0, output: result.output },
      checkpoint: { task, finished: true }
    });
    return { status: 'READY_FOR_REVIEW', id: job.id, task };
  } catch (err) {
    queue.transition(job.id, 'BLOCKED', {
      error: 'Worker execution error',
      checkpoint: { task, reason: String(err?.message || err).slice(0, 300) }
    });
    return { status: 'BLOCKED', id: job.id, task };
  }
}

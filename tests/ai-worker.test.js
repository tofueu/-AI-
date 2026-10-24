import test from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { runApprovedAgyTask, APPROVED_AI_TASK_IDS } from '../lib/ai-worker.js';

test('unknown AI task is rejected without executing anything', async () => {
  let called = false;
  const result = await runApprovedAgyTask({ task: 'arbitrary-command', enabled: true,
    spawnImpl: () => { called = true; } });
  assert.equal(result.status, 'BLOCKED');
  assert.equal(called, false);
});

test('authorized task is WAITING_FOR_AUTH without explicit local CLI opt-in', async () => {
  assert.ok(APPROVED_AI_TASK_IDS.includes('aiwb-dispatcher'));
  assert.equal((await runApprovedAgyTask({ task: 'aiwb-dispatcher', enabled: false })).status, 'WAITING_FOR_AUTH');
});

test('headless adapter uses shell:false, sandbox, safe prompt, and strips billable keys', async () => {
  let args, options;
  const fakeSpawn = (_cmd, a, o) => {
    args = a; options = o;
    const child = new EventEmitter();
    child.stdout = { resume() {} };
    child.stderr = { resume() {} };
    child.kill = () => {};
    queueMicrotask(() => child.emit('close', 0, null));
    return child;
  };
  const r = await runApprovedAgyTask({ task: 'aiwb-dispatcher', enabled: true, branchProbe: () => 'aiwb/isolated-test', spawnImpl: fakeSpawn });
  assert.equal(r.status, 'EXECUTED_UNVERIFIED');
  assert.equal(options.shell, false);
  assert.equal(options.env.GITHUB_TOKEN, undefined);
  assert.equal(options.env.GEMINI_API_KEY, undefined);
  assert.ok(args.includes('--sandbox'));
  assert.ok(args.includes('--add-dir'));
  assert.ok(!args.includes('--dangerously-skip-permissions'));
  assert.ok(args.includes('-p'));
});

test('missing binary reports authorization blocker, not success', async () => {
  const fakeSpawn = () => {
    const child = new EventEmitter();
    child.stdout = { resume() {} }; child.stderr = { resume() {} };
    queueMicrotask(() => child.emit('error', new Error('ENOENT')));
    return child;
  };
  const r = await runApprovedAgyTask({ task: 'aiwb-dispatcher', enabled: true, branchProbe: () => 'aiwb/isolated-test', spawnImpl: fakeSpawn });
  assert.equal(r.status, 'WAITING_FOR_AUTH');
});


test('AI worker rejects main, master, detached HEAD and unrelated branches before launching CLI', async () => {
  for (const branch of ['main', 'master', 'HEAD', 'codex/feature', '', 'aiwb/']) {
    let launched = false;
    const result = await runApprovedAgyTask({
      task: 'aiwb-dispatcher', enabled: true, branchProbe: () => branch,
      spawnImpl: () => { launched = true; throw new Error('should never launch'); }
    });
    assert.equal(result.status, 'BLOCKED', branch);
    assert.equal(launched, false, branch);
  }
});

test('AI worker refuses non-git or unverifiable worktrees without executing CLI', async () => {
  let launched = false;
  const result = await runApprovedAgyTask({
    task: 'aiwb-dispatcher', enabled: true,
    branchProbe: () => { throw new Error('fatal: not a git repository'); },
    spawnImpl: () => { launched = true; throw new Error('should never launch'); }
  });
  assert.equal(result.status, 'BLOCKED');
  assert.match(result.reason, /Cannot verify/);
  assert.equal(launched, false);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const entry = resolve('scripts/dispatch-once.js');

function runWithoutAuthorization({ token, actors }) {
  const dir = mkdtempSync(join(tmpdir(), 'aiwb-once-auth-'));
  try {
    const child = spawnSync(process.execPath, [entry], {
      env: {
        ...process.env,
        GITHUB_TOKEN: token,
        AIWB_ALLOWED_GITHUB_ACTORS: actors,
        AI_WORKBENCH_DATA_DIR: dir
      },
      encoding: 'utf8',
      timeout: 5000
    });
    assert.equal(child.error, undefined);
    return { exitCode: child.status, stdout: JSON.parse(child.stdout) };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

test('one-shot dispatcher exits nonzero without a GitHub token', () => {
  const result = runWithoutAuthorization({ token: '', actors: 'tofueu' });
  assert.equal(result.exitCode, 2);
  assert.equal(result.stdout.status, 'WAITING_FOR_AUTH');
  assert.equal(result.stdout.created, 0);
  assert.equal(result.stdout.queue, 0);
});

test('one-shot dispatcher exits nonzero without trusted GitHub actors', () => {
  const result = runWithoutAuthorization({ token: 'fake-token', actors: '' });
  assert.equal(result.exitCode, 2);
  assert.equal(result.stdout.status, 'BLOCKED');
  assert.equal(result.stdout.created, 0);
  assert.equal(result.stdout.queue, 0);
});

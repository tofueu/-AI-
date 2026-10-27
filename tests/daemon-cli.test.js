import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';

const entry = resolve('scripts/run-dispatcher-daemon.js');

test('daemon CLI refuses to start without GitHub authorization', () => {
  const child = spawnSync(process.execPath, [entry], {
    env: { ...process.env, GITHUB_TOKEN: '', AIWB_ALLOWED_GITHUB_ACTORS: 'tofueu' },
    encoding: 'utf8', timeout: 5000
  });
  assert.equal(child.status, 2);
  const result = JSON.parse(child.stdout.trim());
  assert.equal(result.status, 'WAITING_FOR_AUTH');
  assert.equal(result.worker, 'local-test-only');
});

test('daemon CLI refuses to start without trusted GitHub actors', () => {
  const child = spawnSync(process.execPath, [entry], {
    env: { ...process.env, GITHUB_TOKEN: 'dummy-token', AIWB_ALLOWED_GITHUB_ACTORS: '' },
    encoding: 'utf8', timeout: 5000
  });
  assert.equal(child.status, 2);
  const result = JSON.parse(child.stdout.trim());
  assert.equal(result.status, 'BLOCKED');
  assert.match(result.reason, /AIWB_ALLOWED_GITHUB_ACTORS/);
});

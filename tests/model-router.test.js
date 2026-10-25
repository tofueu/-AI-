import test from 'node:test';
import assert from 'node:assert/strict';
import { ModelRouter, publicError, safeModelId } from '../lib/model-router.js';

test('unknown quota is never advertised as free or unlimited', async () => {
  const router = new ModelRouter({ env: { NVIDIA_API_KEY: 'fake' }, fetchImpl: async () => ({
    ok: true, json: async () => ({ data: [{ id: 'model/from-live-endpoint' }] })
  }) });
  assert.deepEqual(await router.discover('nvidia'), {
    provider: 'nvidia', state: 'DISCOVERED_NOT_PROBED', models: ['model/from-live-endpoint'], quota: 'UNKNOWN'
  });
});
test('no key means no outbound API request', async () => {
  const router = new ModelRouter({ env: {}, fetchImpl: () => { throw Error('network called'); } });
  assert.equal((await router.discover('deepseek')).state, 'AUTH_REQUIRED');
});
test('OpenCode CLI discovery does not claim authentication', async () => {
  const router = new ModelRouter({ runCli: async (_cmd, args) => args[0] === '--version' ? '1.0.0' : 'a/free\nb/other\n' });
  const data = await router.discover('opencode');
  assert.equal(data.state, 'DISCOVERED_NOT_AUTH_VERIFIED');
  assert.deepEqual(data.models, ['a/free','b/other']);
});
test('missing OpenCode CLI is shown as missing', async () => {
  const router = new ModelRouter({ runCli: async () => { throw Object.assign(new Error('missing'), { code: 'ENOENT' }); } });
  assert.equal((await router.discover('opencode')).state, 'MISSING');
});
test('429 moves to next provider without disclosing keys or replaying first provider', async () => {
  let calls = 0;
  const router = new ModelRouter({ env: { DEEPSEEK_API_KEY: 'sensitive-secret', NVIDIA_API_KEY: 'other-secret' }, fetchImpl: async (_url, options) => {
    calls++;
    if (calls === 1) return { ok: false, status: 429, headers: { get: () => '60' } };
    assert.equal(options.headers.authorization, 'Bearer other-secret');
    return { ok: true, json: async () => ({ choices: [{ message: { content: 'done' } }] }) };
  }, now: () => 10000 });
  const result = await router.failover({ candidates: [
    { provider: 'deepseek', model: 'live-model-a' }, { provider: 'nvidia', model: 'live-model-b' }
  ], prompt: 'Test', checkpoint: 'git-sha' });
  assert.equal(result.verified, true);
  assert.equal(result.provider, 'nvidia');
  assert.equal(result.events[0].checkpoint, 'git-sha');
  assert.equal(result.events[1].code, 'RATE_LIMITED');
  assert.equal(JSON.stringify(result).includes('sensitive-secret'), false);
  assert.equal(calls, 2);
});
test('local coding task is never replayed after unknown CLI failure', async () => {
  let calls = 0;
  const router = new ModelRouter({ env: { NVIDIA_API_KEY: 'key' }, runCli: async () => { calls++; throw Error('code may have changed'); }, fetchImpl: () => { throw Error('unexpected'); } });
  const result = await router.failover({ candidates: [{ provider: 'opencode', model: 'a/free' }, { provider: 'nvidia', model: 'live-model' }], prompt: 'edit files' });
  assert.equal(result.state, 'NEEDS_ATTENTION');
  assert.equal(calls, 1);
});
test('401, 402, 429 and timeout are classified without secret leakage', () => {
  assert.equal(publicError({ status: 401 }).code, 'AUTH_REQUIRED');
  assert.equal(publicError({ status: 402 }).code, 'QUOTA_EXHAUSTED');
  assert.equal(publicError({ status: 429 }).code, 'RATE_LIMITED');
  assert.equal(publicError({ name: 'AbortError' }).code, 'TIMEOUT');
});
test('model identifiers cannot be shell injected', () => {
  assert.equal(safeModelId('nvidia/model-name'), true);
  assert.equal(safeModelId('model;rm -rf /'), false);
});

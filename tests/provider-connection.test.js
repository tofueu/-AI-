import test from 'node:test';
import assert from 'node:assert/strict';
import { ProviderConnectionRegistry, codexAdapter } from '../lib/provider-connection.js';

function fixture({ runtime = { kind: 'exit', code: 0 },
  auth = { kind: 'exit', code: 0 }, probe = null,
  platform = 'win32', ttlMs = 1000 } = {}) {
  let clock = 100_000;
  const calls = [];
  const registry = new ProviderConnectionRegistry({
    platform, ttlMs, now: () => clock
  });
  const adapter = codexAdapter({
    run: async (command, args) => {
      calls.push([command, args]);
      return args[0] === '--version' ? runtime : auth;
    }
  });
  adapter.probeCapability = probe;
  registry.register(adapter);
  return { registry, calls, advance: ms => { clock += ms; } };
}

test('missing executable fails closed; no auth attempt', async () => {
  const f = fixture({ runtime: { kind: 'missing' } });
  assert.equal((await f.registry.verify('codex')).status, 'MISSING');
  assert.equal(f.calls.length, 1);
});

test('signed-out Codex cannot be marked connected', async () => {
  const f = fixture({ auth: { kind: 'exit', code: 1, output: 'Please log in' } });
  assert.equal((await f.registry.verify('codex')).status, 'AUTH_REQUIRED');
  assert.deepEqual(f.calls[1][1], ['login', 'status']);
});

test('CLI auth success is not a verified model execution', async () => {
  const f = fixture();
  const status = await f.registry.verify('codex');
  assert.equal(status.status, 'AUTH_VERIFIED');
  assert.equal(status.capability, 'UNVERIFIED');
  assert.notEqual(status.status, 'CAPABILITY_VERIFIED');
});

test('explicit real capability probe is needed for capability verified', async () => {
  const f = fixture({ probe: async () => ({ kind: 'exit', code: 0 }) });
  assert.equal((await f.registry.verify('codex', { probe: true })).status,
    'CAPABILITY_VERIFIED');
});

test('failed model probe never claims connected', async () => {
  const f = fixture({ probe: async () => ({ kind: 'exit', code: 1 }) });
  assert.equal((await f.registry.verify('codex', { probe: true })).status, 'ERROR');
});

test('historical successful auth expires after TTL', async () => {
  const f = fixture();
  await f.registry.verify('codex');
  f.advance(1001);
  assert.equal(f.registry.status('codex').status, 'UNVERIFIED');
});

test('unsupported OS never invokes CLI', async () => {
  const f = fixture({ platform: 'freebsd' });
  assert.equal((await f.registry.verify('codex')).status, 'UNSUPPORTED');
  assert.equal(f.calls.length, 0);
});

test('timeout or unexpected runner error cannot imply auth', async () => {
  const f = fixture({ auth: { kind: 'timeout' } });
  assert.equal((await f.registry.verify('codex')).status, 'ERROR');
});

test('missing capability probe leaves auth verified, not model verified', async () => {
  const f = fixture();
  assert.equal((await f.registry.verify('codex', { probe: true })).status,
    'AUTH_VERIFIED');
});

test('duplicate adapter and unknown provider are rejected', async () => {
  const f = fixture();
  assert.throws(() => f.registry.register(codexAdapter()), /Duplicate/);
  await assert.rejects(() => f.registry.verify('other'), /Unknown/);
});

test('parallel checks share a single in-flight operation', async () => {
  const f = fixture();
  const [a, b] = await Promise.all([
    f.registry.verify('codex'), f.registry.verify('codex')
  ]);
  assert.deepEqual(a, b);
  assert.equal(f.calls.length, 2);
});

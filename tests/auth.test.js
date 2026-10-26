import test from 'node:test';
import assert from 'node:assert';
import { checkProviderAuth, redactSecrets, createCachedAuthChecker } from '../auth.js';

test('auth.js', async (t) => {

  await t.test('redactSecrets removes sensitive tokens', () => {
    const log1 = 'Success! Token is ya29.a0AfB_12345XYZ and it worked.';
    const log2 = 'Using Bearer sk-ant-api03-1234567890abcdef1234567890abcdef1234567890abcdef1234567890-test';
    const log3 = 'Here is a long token: abcdef1234567890abcdef123456789012345';
    const log4 = 'Normal text without secrets';

    assert.strictEqual(redactSecrets(log1), 'Success! Token is [REDACTED] and it worked.');
    assert.strictEqual(redactSecrets(log2), 'Using Bearer [REDACTED]');
    assert.strictEqual(redactSecrets(log3), 'Here is a long token: [REDACTED]');
    assert.strictEqual(redactSecrets(log4), 'Normal text without secrets');
  });

  await t.test('checkProviderAuth handles missing CLI (ENOENT)', async () => {
    const mockExec = async () => {
      const err = new Error('spawn agy ENOENT');
      err.code = 'ENOENT';
      throw err;
    };

    const result = await checkProviderAuth('agy', mockExec);
    assert.strictEqual(result.available, false);
    assert.strictEqual(result.status, 'missing');
    assert.ok(result.message.includes('CLI not found'));
  });

  await t.test('checkProviderAuth handles expired login', async () => {
    const mockExec = async (cmd, args) => {
      if (args.includes('--version')) return { stdout: 'v1.0.0' };
      if (args.includes('status')) return { stdout: 'Token expired. Please login again.' };
    };

    const result = await checkProviderAuth('agy', mockExec);
    assert.strictEqual(result.available, false);
    assert.strictEqual(result.status, 'expired_login');
    assert.strictEqual(result.version, 'v1.0.0');
  });

  await t.test('checkProviderAuth handles auth pending', async () => {
    const mockExec = async (cmd, args) => {
      if (args.includes('--version')) return { stdout: 'v1.0.0' };
      if (args.includes('status')) return { stdout: 'Pending interactive authorization in browser...' };
    };

    const result = await checkProviderAuth('agy', mockExec);
    assert.strictEqual(result.available, false);
    assert.strictEqual(result.status, 'auth_pending');
  });

  await t.test('checkProviderAuth handles configured but not authenticated', async () => {
    const mockExec = async (cmd, args) => {
      if (args.includes('--version')) return { stdout: 'v1.0.0' };
      if (args.includes('status')) return { stdout: 'CLI is configured but not authenticated.' };
    };

    const result = await checkProviderAuth('agy', mockExec);
    assert.strictEqual(result.available, false);
    assert.strictEqual(result.status, 'configured_but_not_authenticated');
  });

  await t.test('checkProviderAuth handles failed probe', async () => {
    const mockExec = async (cmd, args) => {
      if (args.includes('--version')) return { stdout: 'v1.0.0' };
      if (args.includes('status')) {
        const err = new Error('Network timeout');
        throw err;
      }
    };

    const result = await checkProviderAuth('agy', mockExec);
    assert.strictEqual(result.available, false);
    assert.strictEqual(result.status, 'failed_probe');
    assert.strictEqual(result.message, 'CLI authentication status check failed; see local diagnostics.');
  });

  await t.test('checkProviderAuth handles authenticated state and paid api', async () => {
    const mockExec = async (cmd, args) => {
      if (args.includes('--version')) return { stdout: 'v1.0.0' };
      if (args.includes('status')) return { stdout: 'Logged in as user@example.com, api enabled' };
      if (args.includes('ping')) return { stdout: 'pong' };
    };

    const result = await checkProviderAuth('agy', mockExec);
    assert.strictEqual(result.available, true);
    assert.strictEqual(result.status, 'authenticated');
    assert.strictEqual(result.version, 'v1.0.0');
    assert.strictEqual(result.isSubscription, false);
  });

  await t.test('checkProviderAuth handles authenticated state and subscription', async () => {
    const mockExec = async (cmd, args) => {
      if (args.includes('--version')) return { stdout: 'v1.0.0' };
      if (args.includes('status')) return { stdout: 'Logged in as user@example.com, subscription active' };
      if (args.includes('ping')) return { stdout: 'pong' };
    };

    const result = await checkProviderAuth('agy', mockExec);
    assert.strictEqual(result.available, true);
    assert.strictEqual(result.status, 'authenticated');
    assert.strictEqual(result.isSubscription, true);
  });

  await t.test('checkProviderAuth handles failed inference probe', async () => {
    const mockExec = async (cmd, args) => {
      if (args.includes('--version')) return { stdout: 'v1.0.0' };
      if (args.includes('status')) return { stdout: 'Logged in as user@example.com' };
      if (args.includes('ping')) throw new Error('Inference error');
    };

    const result = await checkProviderAuth('agy', mockExec);
    assert.strictEqual(result.available, false);
    assert.strictEqual(result.status, 'failed_probe');
    assert.ok(result.message.includes('Inference probe failed'));
  });
});


test('health probe is read-only and requires a real model reply', async () => {
  const calls = [];
  const execFn = async (_cmd, args) => {
    calls.push(args);
    if (args.includes('--version')) return { stdout: 'v1' };
    if (args.includes('status')) return { stdout: 'Logged in' };
    if (args.includes('-p')) return { stdout: 'pong' };
    throw new Error('unexpected command');
  };
  const result = await checkProviderAuth('agy', execFn);
  assert.equal(result.available, true);
  assert.ok(calls.some(args => args.includes('-p')));
  assert.ok(calls.every(args => !args.some(arg => /accept-edits|yolo|auto-approve/i.test(arg))));
});

test('successful CLI exit with no verified model reply is not connected', async () => {
  for (const reply of ['', 'CLI help: usage agy -p', 'ping']) {
    const execFn = async (_cmd, args) => {
      if (args.includes('--version')) return { stdout: 'v1' };
      if (args.includes('status')) return { stdout: 'Logged in' };
      return { stdout: reply };
    };
    const result = await checkProviderAuth('agy', execFn);
    assert.equal(result.available, false);
    assert.equal(result.status, 'failed_probe');
  }
});

test('browser health responses never contain raw CLI error credentials', async () => {
  const execFn = async (_cmd, args) => {
    if (args.includes('--version')) return { stdout: 'v1' };
    if (args.includes('status')) return { stdout: 'Logged in' };
    throw Object.assign(new Error('Bearer secret123'), { stderr: 'api_key=abc123' });
  };
  const result = await checkProviderAuth('agy', execFn);
  assert.equal(result.available, false);
  assert.ok(!/secret123|abc123/.test(JSON.stringify(result)));
  assert.equal(redactSecrets('refresh_token: abc123'), '[REDACTED_CREDENTIAL]');
});

test('concurrent health polls share one probe and cache successful auth', async () => {
  let clock = 1_000_000;
  let calls = 0;
  const check = createCachedAuthChecker(async () => {
    calls++;
    return { available: true, status: 'authenticated' };
  }, 300_000, () => clock);
  await Promise.all([check(), check(), check()]);
  assert.equal(calls, 1);
  clock += 100_000;
  assert.equal((await check()).cached, true);
  assert.equal(calls, 1);
  clock += 200_000;
  assert.equal((await check()).cached, false);
  assert.equal(calls, 2);
});

test('failed auth retries after 30 seconds instead of 5 minutes', async () => {
  let clock = 1_000;
  let calls = 0;
  const check = createCachedAuthChecker(async () => {
    calls++;
    return { available: false, status: 'missing' };
  }, 300_000, () => clock);
  await check();
  clock += 29_000;
  await check();
  assert.equal(calls, 1);
  clock += 1_000;
  await check();
  assert.equal(calls, 2);
});

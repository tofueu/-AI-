import test from 'node:test';
import assert from 'node:assert';
import { checkProviderAuth, redactSecrets } from '../auth.js';

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
    assert.strictEqual(result.message, 'Network timeout');
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

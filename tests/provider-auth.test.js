import { test } from 'node:test';
import assert from 'node:assert/strict';
import { unlinkSync } from 'node:fs';
import { resolve } from 'node:path';
import { ProviderAuthManager, PROVIDERS, AUTH_STATES } from '../lib/provider-auth.js';

test('ProviderAuthManager tracks provider authentication states correctly', () => {
  const tmpPath = resolve(process.cwd(), 'tests/tmp-provider-auth.json');
  try {
    const authManager = new ProviderAuthManager(tmpPath);

    // Initial status should be UNAUTHORIZED for all providers
    const list = authManager.listStatuses();
    for (const p of PROVIDERS) {
      assert.equal(list[p].status, 'UNAUTHORIZED');
    }

    // Update state to CONNECTED
    authManager.updateProviderStatus('gemini', 'CONNECTED', { account: 'test@example.com' });
    const geminiStatus = authManager.getProviderStatus('gemini');
    assert.equal(geminiStatus.status, 'CONNECTED');
    assert.equal(geminiStatus.details.account, 'test@example.com');

    // Update state to WAITING_FOR_AUTH
    authManager.updateProviderStatus('perplexity', 'WAITING_FOR_AUTH', { reason: 'OAuth required' });
    assert.equal(authManager.getProviderStatus('perplexity').status, 'WAITING_FOR_AUTH');

    assert.throws(() => authManager.updateProviderStatus('invalid_provider', 'CONNECTED'), /Unknown provider/);
    assert.throws(() => authManager.updateProviderStatus('gemini', 'INVALID_STATE'), /Invalid auth state/);
  } finally {
    try { unlinkSync(tmpPath); } catch {}
  }
});

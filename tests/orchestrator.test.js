import { test } from 'node:test';
import assert from 'node:assert/strict';
import { unlinkSync } from 'node:fs';
import { resolve } from 'node:path';
import { ProviderAuthManager } from '../lib/provider-auth.js';
import { PersistentQueue } from '../lib/dispatcher.js';
import { MultiAiOrchestrator, ROLES } from '../lib/orchestrator.js';

test('MultiAiOrchestrator maps roles, checks provider auth and handles pipeline step dispatching', () => {
  const tmpAuthPath = resolve(process.cwd(), 'tests/tmp-orchestrator-auth.json');
  const tmpQueuePath = resolve(process.cwd(), 'tests/tmp-orchestrator-queue.json');

  try {
    const authManager = new ProviderAuthManager(tmpAuthPath);
    const queue = new PersistentQueue(tmpQueuePath);
    const orchestrator = new MultiAiOrchestrator({ providerAuthManager: authManager, persistentQueue: queue });

    // Local test runner role can always execute
    assert.equal(orchestrator.canExecuteRole('TESTER'), true);

    // DEVELOPER role mapped to Gemini defaults to false when not connected
    assert.equal(orchestrator.canExecuteRole('DEVELOPER'), false);

    // Update Gemini status to CONNECTED
    authManager.updateProviderStatus('gemini', 'CONNECTED');
    assert.equal(orchestrator.canExecuteRole('DEVELOPER'), true);

    // Dispatch step when provider is connected
    const res1 = orchestrator.dispatchPipelineStep('test-job-1', { role: 'DEVELOPER', task: 'ci-smoke' });
    assert.equal(res1.created, true);

    // Dispatch step when provider is not connected (PLANNER / chatgpt)
    const res2 = orchestrator.dispatchPipelineStep('test-job-2', { role: 'PLANNER', task: 'plan-task' });
    assert.equal(res2.created, true);
    assert.equal(res2.job.payload.status, 'WAITING_FOR_AUTH');

    assert.throws(() => orchestrator.getRoleProvider('INVALID_ROLE'), /Unknown agent role/);
  } finally {
    try { unlinkSync(tmpAuthPath); } catch {}
    try { unlinkSync(tmpQueuePath); } catch {}
  }
});

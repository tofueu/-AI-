export const ROLES = ['PLANNER', 'DEVELOPER', 'TESTER', 'REVIEWER'];

export class MultiAiOrchestrator {
  constructor({ providerAuthManager, persistentQueue }) {
    this.providerAuthManager = providerAuthManager;
    this.persistentQueue = persistentQueue;
    this.agentRoles = {
      PLANNER: 'chatgpt',
      DEVELOPER: 'gemini',
      TESTER: 'local-test-runner',
      REVIEWER: 'chatgpt'
    };
  }

  getRoleProvider(role) {
    if (!ROLES.includes(role)) throw new Error(`Unknown agent role: ${role}`);
    return this.agentRoles[role];
  }

  setRoleProvider(role, provider) {
    if (!ROLES.includes(role)) throw new Error(`Unknown agent role: ${role}`);
    this.agentRoles[role] = provider;
  }

  canExecuteRole(role) {
    const provider = this.getRoleProvider(role);
    if (provider === 'local-test-runner') return true;
    if (!this.providerAuthManager) return false;
    const status = this.providerAuthManager.getProviderStatus(provider);
    return status.status === 'CONNECTED';
  }

  dispatchPipelineStep(jobKey, taskPayload) {
    if (!this.canExecuteRole(taskPayload.role)) {
      if (this.persistentQueue) {
        return this.persistentQueue.enqueue(jobKey, {
          ...taskPayload,
          status: 'WAITING_FOR_AUTH',
          reason: `Provider ${this.getRoleProvider(taskPayload.role)} is not CONNECTED`
        });
      }
      return { created: false, reason: 'WAITING_FOR_AUTH' };
    }

    if (this.persistentQueue) {
      return this.persistentQueue.enqueue(jobKey, taskPayload);
    }
    return { created: true, jobKey };
  }
}

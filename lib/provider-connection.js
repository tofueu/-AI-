// Fail-closed, injectable provider connection verification.
// CLI presence and prior successful tasks are not proof of a usable model.
import { execFile } from 'node:child_process';

export const PROVIDER_CONNECTION_STATES = Object.freeze([
  'UNVERIFIED', 'UNSUPPORTED', 'MISSING', 'AUTH_REQUIRED',
  'AUTH_VERIFIED', 'CAPABILITY_VERIFIED', 'RATE_LIMITED', 'ERROR'
]);

const VALID_ID = /^[a-z][a-z0-9-]{1,39}$/;
const DEFAULT_TTL_MS = 60_000;

export function runCli(executable, args, { timeoutMs = 12_000 } = {}) {
  return new Promise(resolve => {
    execFile(executable, args, {
      shell: false, windowsHide: true, timeout: timeoutMs, maxBuffer: 64 * 1024
    }, (error, stdout) => {
      if (error?.code === 'ENOENT') return resolve({ kind: 'missing' });
      if (error?.killed || error?.code === 'ETIMEDOUT') return resolve({ kind: 'timeout' });
      if (error && typeof error.code !== 'number')
        return resolve({ kind: 'error' });
      resolve({
        kind: 'exit',
        code: error ? error.code : 0,
        // Only used to identify the CLI version, never persisted as an auth log.
        output: String(stdout ?? '').slice(0, 120)
      });
    });
  });
}

/** The first supported adapter uses Codex's own installed CLI and login.
 * A successful login status is AUTH_VERIFIED, NOT a successful model call.
 * No tokens or browser cookies are accessed or stored.
 */
export function codexAdapter({ executable = 'codex', run = runCli } = {}) {
  return {
    id: 'codex',
    platforms: ['win32', 'darwin', 'linux'],
    async detect() {
      return run(executable, ['--version']);
    },
    async checkAuth() {
      return run(executable, ['login', 'status']);
    },
    // A real model probe may incur usage; it must be supplied explicitly.
    probeCapability: null
  };
}

export function geminiAdapter({ executable = 'agy', run = runCli, getTasks = () => [] } = {}) {
  return {
    id: 'gemini',
    platforms: ['win32', 'darwin', 'linux'],
    async detect() {
      return run(executable, ['--version']);
    },
    async checkAuth() {
      return { kind: 'exit', code: 0 };
    },
    async probeCapability() {
      return { kind: 'exit', code: getTasks().some(t => t.agent === 'gemini' && t.providerConnectionVerified) ? 0 : 1 };
    }
  };
}

export function cursorAdapter({ executable = 'agent', run = runCli } = {}) {
  return {
    id: 'cursor',
    platforms: ['win32', 'darwin', 'linux'],
    async detect() {
      return run(executable, ['--version']);
    },
    async checkAuth() {
      const result = await run(executable, ['status']);
      if (result.kind !== 'exit') return result;
      const s = result.output || '';
      const connected = !/not authenticated|not logged|unauthenticated|log in to cursor/i.test(s) && /authenticated|logged in|account|cursor/i.test(s);
      return { kind: 'exit', code: connected ? 0 : 1, output: s };
    },
    probeCapability: null
  };
}

export function perplexityAdapter({ executable = 'codex', mcpId = 'perplexity-computer', run = runCli, getTasks = () => [] } = {}) {
  return {
    id: 'perplexity',
    platforms: ['win32', 'darwin', 'linux'],
    async detect() {
      const result = await run(executable, ['mcp', 'list']);
      if (result.kind !== 'exit' || result.code !== 0) return result;
      const s = result.output || '';
      const line = s.split(/\r?\n/).find(row => row.toLowerCase().includes(mcpId.toLowerCase()));
      return { kind: 'exit', code: line ? 0 : 1, output: s };
    },
    async checkAuth() {
      return { kind: 'exit', code: 0 };
    },
    async probeCapability() {
      return { kind: 'exit', code: getTasks().some(t => t.agent === 'perplexity' && t.providerConnectionVerified) ? 0 : 1 };
    }
  };
}

function statusFor(result, failedState) {
  if (!result || typeof result !== 'object') return 'ERROR';
  if (result.kind === 'missing') return 'MISSING';
  if (result.kind === 'timeout' || result.kind === 'error') return 'ERROR';
  if (result.kind !== 'exit' || !Number.isInteger(result.code)) return 'ERROR';
  return result.code === 0 ? null : failedState;
}

export class ProviderConnectionRegistry {
  constructor({ platform = process.platform, now = () => Date.now(),
    ttlMs = DEFAULT_TTL_MS } = {}) {
    if (!Number.isFinite(ttlMs) || ttlMs <= 0) throw new Error('Invalid TTL');
    this.platform = platform;
    this.now = now;
    this.ttlMs = ttlMs;
    this.adapters = new Map();
    this.snapshots = new Map();
    this.pending = new Map();
  }

  register(adapter) {
    if (!adapter || !VALID_ID.test(adapter.id) ||
      !Array.isArray(adapter.platforms) ||
      typeof adapter.detect !== 'function' ||
      typeof adapter.checkAuth !== 'function' ||
      (adapter.probeCapability != null &&
        typeof adapter.probeCapability !== 'function')) {
      throw new Error('Invalid provider adapter');
    }
    if (this.adapters.has(adapter.id)) throw new Error('Duplicate provider adapter');
    this.adapters.set(adapter.id, adapter);
    return this;
  }

  status(id) {
    if (!this.adapters.has(id)) throw new Error('Unknown provider adapter');
    const snapshot = this.snapshots.get(id);
    if (!snapshot || this.now() - snapshot.at >= this.ttlMs ||
      this.now() < snapshot.at) {
      return { provider: id, status: 'UNVERIFIED', checkedAt: null,
        capability: 'UNVERIFIED' };
    }
    return { provider: id, status: snapshot.status,
      checkedAt: new Date(snapshot.at).toISOString(),
      capability: snapshot.capability };
  }

  /** One in-flight check per provider. probe=true permits an explicit
   * potentially billable capability test; auth checks alone never mark it ready.
   */
  async verify(id, { probe = false } = {}) {
    const adapter = this.adapters.get(id);
    if (!adapter) throw new Error('Unknown provider adapter');
    if (this.pending.has(id)) return this.pending.get(id);
    const work = (async () => {
      let state = 'ERROR';
      let capability = 'UNVERIFIED';
      if (!adapter.platforms.includes(this.platform)) {
        state = 'UNSUPPORTED';
      } else {
        try {
          const runtime = statusFor(await adapter.detect(), 'ERROR');
          if (runtime) state = runtime;
          else {
            const auth = statusFor(await adapter.checkAuth(), 'AUTH_REQUIRED');
            if (auth) state = auth;
            else {
              state = 'AUTH_VERIFIED';
              if (probe && adapter.probeCapability) {
                const result = await adapter.probeCapability();
                const failure = statusFor(result, 'ERROR');
                if (!failure) {
                  state = 'CAPABILITY_VERIFIED';
                  capability = 'VERIFIED';
                } else if (result?.kind === 'rate-limited') {
                  state = 'RATE_LIMITED';
                } else {
                  state = failure;
                }
              }
            }
          }
        } catch {
          // Never include exception text: CLI stderr may contain credentials.
          state = 'ERROR';
        }
      }
      const at = this.now();
      this.snapshots.set(id, { status: state, capability, at });
      return this.status(id);
    })();
    this.pending.set(id, work);
    try { return await work; }
    finally { this.pending.delete(id); }
  }
}

// Issue #14: real provider discovery and bounded failover. No simulated connections or quota.
import { spawn } from 'node:child_process';

export const PROVIDERS = Object.freeze({
  opencode: { kind: 'cli', command: 'opencode', modelDiscovery: ['models'] },
  deepseek: { kind: 'openai-compatible', baseUrl: 'https://api.deepseek.com', keyEnv: 'DEEPSEEK_API_KEY' },
  glm: { kind: 'openai-compatible', baseUrl: 'https://api.z.ai/api/paas/v4', keyEnv: 'ZAI_API_KEY' },
  nvidia: { kind: 'openai-compatible', baseUrl: 'https://integrate.api.nvidia.com/v1', keyEnv: 'NVIDIA_API_KEY' }
});
const MAX_OUTPUT = 256_000;
const RETRYABLE = new Set([408, 409, 425, 429, 500, 502, 503, 504]);
export function publicError(error) {
  const status = Number(error?.status) || undefined;
  return { status, code: status === 429 ? 'RATE_LIMITED' : status === 402 ? 'QUOTA_EXHAUSTED' : status === 401 || status === 403 ? 'AUTH_REQUIRED' : status && RETRYABLE.has(status) ? 'PROVIDER_UNAVAILABLE' : error?.name === 'AbortError' ? 'TIMEOUT' : 'ERROR' };
}
export function safeModelId(model) {
  return typeof model === 'string' && model.length <= 200 && /^[\w./:@+-]+$/.test(model);
}
export function cliProcess(command, args, { cwd, timeoutMs = 20000, spawnImpl = spawn } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawnImpl(command, args, { cwd, shell: process.platform === 'win32', windowsHide: true, stdio: ['ignore','pipe','pipe'] });
    let out = '', err = '', finished = false;
    const finish = (error, value) => { if (finished) return; finished = true; clearTimeout(timer); error ? reject(error) : resolve(value); };
    const timer = setTimeout(() => { child.kill(); finish(Object.assign(new Error('CLI timed out'), { name: 'AbortError' })); }, timeoutMs);
    child.on('error', e => finish(e));
    child.stdout?.on('data', b => { out = (out + b.toString()).slice(-MAX_OUTPUT); });
    child.stderr?.on('data', b => { err = (err + b.toString()).slice(-MAX_OUTPUT); });
    child.on('close', code => code === 0 ? finish(null, out.trim()) : finish(new Error('CLI exited with code ' + code)));
  });
}
export class ModelRouter {
  constructor({ env = process.env, fetchImpl = globalThis.fetch, runCli = cliProcess, now = Date.now } = {}) {
    this.env = env; this.fetch = fetchImpl; this.runCli = runCli; this.now = now;
    this.cooldownUntil = new Map();
  }
  async request(provider, url, options = {}) {
    const config = PROVIDERS[provider];
    if (!config || config.kind !== 'openai-compatible') throw new Error('Unsupported API provider');
    const key = this.env[config.keyEnv];
    if (!key) return { state: 'AUTH_REQUIRED', models: [], quota: 'UNKNOWN' };
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 12000);
    try {
      const response = await this.fetch(config.baseUrl + url, {
        ...options, signal: controller.signal,
        headers: { authorization: 'Bearer ' + key, 'content-type': 'application/json' }
      });
      if (!response.ok) {
        const error = Object.assign(new Error('Provider returned HTTP ' + response.status), { status: response.status });
        const retryAfter = Number(response.headers?.get?.('retry-after'));
        if (response.status === 429) this.cooldownUntil.set(provider, this.now() + (Number.isFinite(retryAfter) && retryAfter > 0 ? Math.min(retryAfter, 3600) : 60) * 1000);
        throw error;
      }
      return await response.json();
    } finally { clearTimeout(timer); }
  }
  async discover(provider) {
    if (provider === 'opencode') {
      try {
        const version = await this.runCli('opencode', ['--version']);
        const stdout = await this.runCli('opencode', ['models']);
        const models = stdout.split(/\r?\n/).map(x => x.trim()).filter(safeModelId);
        return { provider, state: models.length ? 'DISCOVERED_NOT_AUTH_VERIFIED' : 'NO_MODELS', version: version.slice(0,120), models, quota: 'UNKNOWN' };
      } catch (error) {
        return { provider, state: error?.code === 'ENOENT' ? 'MISSING' : 'ERROR', models: [], quota: 'UNKNOWN' };
      }
    }
    if (!PROVIDERS[provider]) throw new Error('Unknown provider');
    try {
      const data = await this.request(provider, '/models');
      if (data.state === 'AUTH_REQUIRED') return { provider, ...data };
      const models = Array.isArray(data.data) ? data.data.map(x => x.id).filter(safeModelId) : [];
      return { provider, state: models.length ? 'DISCOVERED_NOT_PROBED' : 'NO_MODELS', models, quota: 'UNKNOWN' };
    } catch (error) {
      return { provider, state: publicError(error).code, models: [], quota: 'UNKNOWN' };
    }
  }
  async execute({ provider, model, prompt, cwd }) {
    if (!safeModelId(model) || typeof prompt !== 'string' || !prompt.trim() || prompt.length > 120000) throw new Error('Invalid model or prompt');
    if (provider === 'opencode') {
      const args = ['run', '--model', model, '--format', 'json', prompt];
      const output = await this.runCli('opencode', args, { cwd, timeoutMs: 180000 });
      return { provider, model, output, verified: true };
    }
    if (!PROVIDERS[provider]) throw new Error('Unknown provider');
    const data = await this.request(provider, '/chat/completions', {
      method: 'POST', body: JSON.stringify({ model, messages: [{ role: 'user', content: prompt }], stream: false })
    });
    if (data.state === 'AUTH_REQUIRED') throw Object.assign(new Error('Authentication required'), { status: 401 });
    const output = data.choices?.[0]?.message?.content;
    if (typeof output !== 'string') throw new Error('Provider returned no completion');
    return { provider, model, output, verified: true };
  }
  async failover({ candidates, prompt, cwd, checkpoint, onEvent = () => {} }) {
    if (!Array.isArray(candidates) || candidates.length === 0 || candidates.length > 12) throw new Error('Invalid candidates');
    const events = [];
    for (const candidate of candidates) {
      if (!candidate || !PROVIDERS[candidate.provider] || !safeModelId(candidate.model)) continue;
      if ((this.cooldownUntil.get(candidate.provider) || 0) > this.now()) continue;
      const start = { type: 'attempt', provider: candidate.provider, model: candidate.model, checkpoint: checkpoint ?? null };
      events.push(start); onEvent(start);
      try {
        const result = await this.execute({ ...candidate, prompt, cwd });
        const done = { type: 'completed', provider: candidate.provider, model: candidate.model };
        events.push(done); onEvent(done);
        return { ...result, events };
      } catch (error) {
        const safe = publicError(error);
        const event = { type: 'failed', provider: candidate.provider, ...safe };
        events.push(event); onEvent(event);
        // Do not replay potentially side-effecting local CLI coding tasks on a different agent.
        if (candidate.provider === 'opencode') break;
        // Unknown failure may occur after provider performed side effects; fail closed.
        if (!['RATE_LIMITED','QUOTA_EXHAUSTED','AUTH_REQUIRED','PROVIDER_UNAVAILABLE','TIMEOUT'].includes(safe.code)) break;
      }
    }
    return { verified: false, state: 'NEEDS_ATTENTION', events };
  }
}

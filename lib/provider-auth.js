import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

export const PROVIDERS = ['gemini', 'chatgpt', 'perplexity', 'cursor'];
export const AUTH_STATES = ['CONNECTED', 'UNAUTHORIZED', 'EXPIRED', 'QUOTA_LIMITED', 'WAITING_FOR_AUTH'];

export class ProviderAuthManager {
  constructor(storagePath) {
    this.storagePath = storagePath;
    mkdirSync(dirname(storagePath), { recursive: true });
    if (!existsSync(storagePath)) {
      this._save({ providers: {} });
    }
  }

  _read() {
    return JSON.parse(readFileSync(this.storagePath, 'utf8'));
  }

  _save(data) {
    writeFileSync(this.storagePath, JSON.stringify(data, null, 2), { mode: 0o600 });
  }

  getProviderStatus(provider) {
    if (!PROVIDERS.includes(provider)) throw new Error(`Unknown provider: ${provider}`);
    const data = this._read();
    return data.providers[provider] || { status: 'UNAUTHORIZED', updatedAt: new Date().toISOString() };
  }

  updateProviderStatus(provider, status, details = {}) {
    if (!PROVIDERS.includes(provider)) throw new Error(`Unknown provider: ${provider}`);
    if (!AUTH_STATES.includes(status)) throw new Error(`Invalid auth state: ${status}`);

    const data = this._read();
    data.providers[provider] = {
      status,
      details,
      updatedAt: new Date().toISOString()
    };
    this._save(data);
    return data.providers[provider];
  }

  listStatuses() {
    const data = this._read();
    const result = {};
    for (const p of PROVIDERS) {
      result[p] = data.providers[p] || { status: 'UNAUTHORIZED', updatedAt: null };
    }
    return result;
  }
}

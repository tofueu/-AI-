export function redactSecrets(text) {
  if (typeof text !== 'string') return text;
  return text
    .replace(/ya29\.[a-zA-Z0-9._-]+/g, '[REDACTED]')
    .replace(/Bearer\s+\S+/gi, 'Bearer [REDACTED]')
    .replace(/\b(?:api[_-]?key|access[_-]?token|refresh[_-]?token|authorization|x-api-key)\s*[:=]\s*[^\s,;]+/gi, '[REDACTED_CREDENTIAL]')
    .replace(/\bsk-[A-Za-z0-9_-]{12,}\b/g, '[REDACTED]')
    .replace(/\b[A-Za-z0-9_-]{35,}\b/g, '[REDACTED]');
}

export async function checkProviderAuth(cliName, execFn) {
  let version = null;
  try {
    const versionResult = await execFn(cliName, ['--version'], { timeout: 5000, windowsHide: true });
    version = redactSecrets(String(versionResult?.stdout || '').trim()).slice(0, 100);
  } catch (error) {
    if (error?.code === 'ENOENT') {
      return { available: false, status: 'missing', version: null, message: 'CLI not installed. Install it and complete login locally.' };
    }
    return { available: false, status: 'failed_probe', version: null, message: 'CLI version check failed; see local diagnostics.' };
  }

  let statusText;
  try {
    const result = await execFn(cliName, ['status'], { timeout: 5000, windowsHide: true });
    statusText = `${result?.stdout || ''}\n${result?.stderr || ''}`.toLowerCase();
  } catch {
    return { available: false, status: 'failed_probe', version, message: 'CLI authentication status check failed; see local diagnostics.' };
  }

  if (/(token expired|login expired|session expired)/.test(statusText)) {
    return { available: false, status: 'expired_login', version, message: 'Login expired. Re-authenticate locally.' };
  }
  if (/(pending interactive authorization|auth pending|waiting for authentication)/.test(statusText)) {
    return { available: false, status: 'auth_pending', version, message: 'Complete authorization in the official login flow.' };
  }
  if (/(configured but not authenticated|not authenticated|not logged in)/.test(statusText)) {
    return { available: false, status: 'configured_but_not_authenticated', version, message: 'CLI configured but not authenticated.' };
  }

  // A version or status command is NOT proof of a working model connection.
  // Never use auto-accept/edit flags for a background health probe.
  try {
    const result = await execFn(cliName, ['-p', 'ping'], { timeout: 8000, windowsHide: true });
    const reply = String(result?.stdout || '');
    if (!/\bpong\b/i.test(reply)) {
      return { available: false, status: 'failed_probe', version, message: 'No verified model reply to the read-only probe.' };
    }
  } catch {
    // Do not return CLI stderr/exception text to a browser: it may contain secrets.
    return { available: false, status: 'failed_probe', version, message: 'Inference probe failed; see local diagnostics.' };
  }
  return {
    available: true,
    status: 'authenticated',
    version,
    message: 'Live model response verified.',
    isSubscription: statusText.includes('subscription') && !statusText.includes('api')
  };
}

// /api/health is polled frequently by the UI. Deduplicate concurrent checks
// and cache the real inference result to avoid consuming paid quota every poll.
export function createCachedAuthChecker(checkFn, ttlMs = 300_000, now = () => Date.now()) {
  let lastResult = null;
  let lastCheckedAt = 0;
  let pending = null;
  return async function cachedCheck() {
    const ttl = lastResult?.available ? ttlMs : Math.min(ttlMs, 30_000);
    if (lastResult && now() - lastCheckedAt < ttl) {
      return { ...lastResult, checkedAt: new Date(lastCheckedAt).toISOString(), cached: true };
    }
    if (!pending) {
      pending = Promise.resolve().then(checkFn).then(result => {
        lastResult = result;
        lastCheckedAt = now();
        return result;
      }).finally(() => { pending = null; });
    }
    const result = await pending;
    return { ...result, checkedAt: new Date(lastCheckedAt).toISOString(), cached: false };
  };
}

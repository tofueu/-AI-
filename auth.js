export function redactSecrets(text) {
  if (typeof text !== 'string') return text;
  // Redact Bearer tokens, google oauth tokens (ya29.*), and generic long tokens (30+ alphanumeric chars)
  return text.replace(/ya29\.[a-zA-Z0-9_-]+/g, '[REDACTED]')
             .replace(/Bearer\s+[a-zA-Z0-9_.-]+/gi, 'Bearer [REDACTED]')
             .replace(/\b[A-Za-z0-9_-]{35,}\b/g, '[REDACTED]');
}

export async function checkProviderAuth(cliName, execFn) {
  try {
    // 1. Check if CLI exists and get version
    const { stdout: versionOut } = await execFn(cliName, ['--version'], { timeout: 5000, windowsHide: true });
    const version = versionOut.trim();

    // 2. Probe connection status
    try {
      const { stdout: statusOut, stderr: statusErr } = await execFn(cliName, ['status'], { timeout: 5000, windowsHide: true });
      const statusText = (statusOut || '') + '\n' + (statusErr || '');
      const lowerStatus = statusText.toLowerCase();

      if (lowerStatus.includes('token expired') || lowerStatus.includes('login expired') || lowerStatus.includes('session expired')) {
        return { available: false, status: 'expired_login', version, message: 'Login expired. Please re-authenticate via CLI.' };
      }
      if (lowerStatus.includes('pending interactive authorization') || lowerStatus.includes('auth pending') || lowerStatus.includes('waiting for authentication')) {
        return { available: false, status: 'auth_pending', version, message: 'Authentication pending. Please complete login in your browser.' };
      }
      if (lowerStatus.includes('configured but not authenticated') || lowerStatus.includes('not authenticated') || lowerStatus.includes('not logged in')) {
        return { available: false, status: 'configured_but_not_authenticated', version, message: 'CLI configured but not authenticated.' };
      }
      let isSubscription = false;
      if (lowerStatus.includes('subscription') && !lowerStatus.includes('api')) {
        isSubscription = true;
      }

      // 3. Real capability/inference probe
      try {
        await execFn(cliName, ['-p', 'ping', '--mode=accept-edits'], { timeout: 8000, windowsHide: true });
      } catch (inferenceError) {
        return { available: false, status: 'failed_probe', version, message: 'Inference probe failed: ' + (inferenceError.stderr || inferenceError.message).trim() };
      }

      // If none of the negative states matched and it exited cleanly, assume authenticated.
      return { available: true, status: 'authenticated', version, message: 'Authenticated', isSubscription };
    } catch (probeError) {
      // probing failed
      return { available: false, status: 'failed_probe', version, message: probeError.message || 'Probe failed' };
    }

  } catch (error) {
    if (error.code === 'ENOENT') {
      return { available: false, status: 'missing', version: null, message: `CLI not found: ${cliName}. Please install and log in.` };
    }
    return { available: false, status: 'failed_probe', version: null, message: (error.stderr || error.message).trim() };
  }
}

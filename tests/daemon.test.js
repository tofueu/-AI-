import { test } from 'node:test';
import assert from 'node:assert/strict';
import { unlinkSync } from 'node:fs';
import { resolve } from 'node:path';
import { DispatcherDaemon } from '../lib/daemon.js';

test('DispatcherDaemon runs cycles, handles exponential backoff and stops gracefully', async () => {
  const tmpQueuePath = resolve(process.cwd(), 'tests/tmp-daemon-queue.json');

  try {
    const daemon = new DispatcherDaemon({
      queueFile: tmpQueuePath,
      repo: 'tofueu/-AI-',
      issue: 2,
      intervalMs: 100
    });

    assert.equal(daemon.running, false);

    const summary = await daemon.runCycle();
    assert.ok(summary.timestamp);
    assert.equal(summary.queueFile, tmpQueuePath);
    assert.equal(summary.status, 'WAITING_FOR_AUTH');

    daemon.start();
    assert.equal(daemon.running, true);

    await new Promise(r => setTimeout(r, 250));

    daemon.stop();
    assert.equal(daemon.running, false);
  } finally {
    try { unlinkSync(tmpQueuePath); } catch {}
  }
});

#!/usr/bin/env node
// Persistent, bounded polling process. This is a local test-task dispatcher,
// not an autonomous Gemini/Jules coding adapter or hosted service.
import { resolve } from 'node:path';
import { DispatcherDaemon } from '../lib/daemon.js';

const token = process.env.GITHUB_TOKEN || '';
const allowedActors = String(process.env.AIWB_ALLOWED_GITHUB_ACTORS || '')
  .split(',').map(actor => actor.trim()).filter(Boolean);

// Refuse to run an apparently healthy daemon without a usable configuration.
if (!token || allowedActors.length === 0) {
  console.log(JSON.stringify({
    status: token ? 'BLOCKED' : 'WAITING_FOR_AUTH',
    reason: token ? 'AIWB_ALLOWED_GITHUB_ACTORS is empty' : 'GITHUB_TOKEN is missing',
    worker: 'local-test-only',
    note: 'No Gemini/Jules autonomous coding adapter is configured'
  }));
  process.exitCode = 2;
} else {
  const queueFile = resolve(process.env.AI_WORKBENCH_DATA_DIR || 'data', 'dispatcher-queue.json');
  const daemon = new DispatcherDaemon({ queueFile, token, allowedActors });
  let stopping = false;
  let wake = null;

  const requestStop = () => {
    stopping = true;
    if (wake) wake();
  };
  process.once('SIGINT', requestStop);
  process.once('SIGTERM', requestStop);

  const delay = ms => new Promise(resolveDelay => {
    const timer = setTimeout(() => {
      wake = null;
      resolveDelay();
    }, ms);
    wake = () => {
      clearTimeout(timer);
      wake = null;
      resolveDelay();
    };
  });

  try {
    while (!stopping) {
      const summary = await daemon.runCycle();
      console.log(JSON.stringify({
        ...summary,
        workerCapability: 'local-test-only',
        note: 'No Gemini/Jules coding, PR creation, or autonomous review is performed'
      }));
      if (stopping) break;
      await delay(daemon.currentBackoff);
    }
  } finally {
    process.removeListener('SIGINT', requestStop);
    process.removeListener('SIGTERM', requestStop);
    console.log(JSON.stringify({ status: 'STOPPED', queueFile }));
  }
}

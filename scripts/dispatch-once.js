#!/usr/bin/env node
// Safe, single-shot ingestion. This intentionally does NOT pretend to execute Gemini/Jules.
import { resolve } from 'node:path';
import { PersistentQueue, GitHubIssuePoller } from '../lib/dispatcher.js';

const file = resolve(process.env.AI_WORKBENCH_DATA_DIR || 'data', 'dispatcher-queue.json');
const queue = new PersistentQueue(file);
const poller = new GitHubIssuePoller({
  repo: process.env.AIWB_GITHUB_REPO || 'tofueu/-AI-',
  issue: Number(process.env.AIWB_GITHUB_ISSUE || 2),
  token: process.env.GITHUB_TOKEN,
  allowedActors: String(process.env.AIWB_ALLOWED_GITHUB_ACTORS || '').split(',').map(x => x.trim()).filter(Boolean)
});
try {
  const result = await poller.poll(queue);
  console.log(JSON.stringify({ ...result, queue: queue.list().length, file }, null, 2));
  // Missing credentials is also a failed authorization gate, not a successful dispatch.
  // An exit code of zero would mislead supervisors into treating the worker as healthy.
  if (result.status !== 'OK') process.exitCode = 2;
} catch (error) {
  console.error(JSON.stringify({ status: 'BLOCKED', error: error.message }));
  process.exitCode = 1;
}

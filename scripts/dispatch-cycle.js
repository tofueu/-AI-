#!/usr/bin/env node
// Single bounded GitHub -> local allowlisted worker -> GitHub cycle.
// Requires a separately deployed scheduler and GITHUB_TOKEN. NOT an AI agent.
import { resolve } from 'node:path';
import { PersistentQueue, GitHubIssuePoller } from '../lib/dispatcher.js';
import { GitHubIssueReporter } from '../lib/github-reporter.js';
import { runOneLocalJob } from '../lib/worker.js';

const queueFile = resolve(process.env.AI_WORKBENCH_DATA_DIR || 'data', 'dispatcher-queue.json');
const repo = process.env.AIWB_GITHUB_REPO || 'tofueu/-AI-';
const issue = Number(process.env.AIWB_GITHUB_ISSUE || 2);
const token = process.env.GITHUB_TOKEN;
const queue = new PersistentQueue(queueFile);
const poller = new GitHubIssuePoller({
  repo, issue, token,
  allowedActors: String(process.env.AIWB_ALLOWED_GITHUB_ACTORS || '')
    .split(',').map(s => s.trim()).filter(Boolean)
});
const reporter = new GitHubIssueReporter({ repo, issue, token });
const summary = { queueFile, ingestion: null, worker: null, reports: [], limitations: [
  'Single cycle only: requires a separately deployed scheduler',
  'Allowlisted local test tasks only: not Gemini/Jules autonomous coding'
] };
try {
  summary.ingestion = await poller.poll(queue);
  if (summary.ingestion.status !== 'OK') {
    // Both missing GitHub credentials and a missing actor allowlist must
    // prevent claims of already queued work. Polling is an authorization gate.
    summary.status = summary.ingestion.status;
    summary.worker = { status: 'SKIPPED', reason: summary.ingestion.status === 'WAITING_FOR_AUTH'
      ? 'GitHub token is missing; queued work remains untouched'
      : 'Trusted GitHub actor allowlist is missing' };
    process.exitCode = 2;
  } else {
    summary.worker = await runOneLocalJob(queue);
    for (const job of queue.list().filter(j =>
      j.status === 'READY_FOR_REVIEW' || j.status === 'BLOCKED' ||
      j.status === 'WAITING_FOR_AUTH').filter(j => !j.reportedAt).slice(0, 10)) {
      const result = await reporter.report(job);
      if (result.status === 'POSTED' || result.status === 'ALREADY_REPORTED') {
        queue.markReported(job.id, job.status, result.url);
      }
      summary.reports.push(result);
      if (result.status === 'WAITING_FOR_AUTH') break;
    }
    if (summary.ingestion.status === 'WAITING_FOR_AUTH' ||
        summary.reports.some(r => r.status === 'WAITING_FOR_AUTH')) {
      summary.status = 'WAITING_FOR_AUTH';
      process.exitCode = 2;
    }
  }
} catch (error) {
  summary.error = String(error?.message || error).slice(0, 300);
  process.exitCode = 1;
}
console.log(JSON.stringify(summary, null, 2));

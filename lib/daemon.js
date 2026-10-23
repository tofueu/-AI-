// Daemon / continuous runner for dispatcher cycles with graceful shutdown and exponential backoff.
import { resolve } from 'node:path';
import { PersistentQueue, GitHubIssuePoller } from './dispatcher.js';
import { GitHubIssueReporter } from './github-reporter.js';
import { runOneLocalJob } from './worker.js';

export class DispatcherDaemon {
  constructor({
    queueFile,
    repo = process.env.AIWB_GITHUB_REPO || 'tofueu/-AI-',
    issue = Number(process.env.AIWB_GITHUB_ISSUE || 2),
    token = process.env.GITHUB_TOKEN,
    allowedActors = process.env.AIWB_ALLOWED_GITHUB_ACTORS || '',
    intervalMs = 30000,
    maxBackoffMs = 300000
  }) {
    this.queueFile = queueFile;
    this.repo = repo;
    this.issue = issue;
    this.token = token;
    this.allowedActors = typeof allowedActors === 'string'
      ? allowedActors.split(',').map(s => s.trim()).filter(Boolean)
      : allowedActors;
    this.intervalMs = intervalMs;
    this.maxBackoffMs = maxBackoffMs;
    this.queue = new PersistentQueue(queueFile);
    this.poller = new GitHubIssuePoller({
      repo: this.repo,
      issue: this.issue,
      token: this.token,
      allowedActors: this.allowedActors
    });
    this.reporter = new GitHubIssueReporter({
      repo: this.repo,
      issue: this.issue,
      token: this.token
    });
    this.running = false;
    this.timer = null;
    this.currentBackoff = intervalMs;
  }

  async runCycle() {
    const summary = {
      timestamp: new Date().toISOString(),
      queueFile: this.queueFile,
      ingestion: null,
      worker: null,
      reports: [],
      status: 'OK'
    };

    try {
      summary.ingestion = await this.poller.poll(this.queue);
      summary.worker = await runOneLocalJob(this.queue);

      for (const job of this.queue.list().filter(j =>
        j.status === 'READY_FOR_REVIEW' || j.status === 'BLOCKED' ||
        j.status === 'WAITING_FOR_AUTH').slice(0, 10)) {
        const result = await this.reporter.report(job);
        summary.reports.push(result);
        if (result.status === 'WAITING_FOR_AUTH') break;
      }

      if (!this.token) {
        summary.status = 'WAITING_FOR_AUTH';
      }

      // Reset backoff on successful cycle execution
      this.currentBackoff = this.intervalMs;
    } catch (error) {
      summary.status = 'ERROR';
      summary.error = String(error?.message || error).slice(0, 300);
      // Exponential backoff
      this.currentBackoff = Math.min(this.currentBackoff * 2, this.maxBackoffMs);
    }

    return summary;
  }

  start() {
    if (this.running) return;
    this.running = true;

    const loop = async () => {
      if (!this.running) return;
      await this.runCycle();
      if (!this.running) return;
      this.timer = setTimeout(loop, this.currentBackoff);
    };

    loop();
  }

  stop() {
    this.running = false;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }
}

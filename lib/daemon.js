// Daemon / continuous runner for dispatcher cycles with graceful shutdown and exponential backoff.
import { resolve } from 'node:path';
import { PersistentQueue, GitHubIssuePoller } from './dispatcher.js';
import { GitHubIssueReporter } from './github-reporter.js';
import { GitHubReviewPoller } from './github-review-poller.js';
import { runOneLocalJob } from './worker.js';

export class DispatcherDaemon {
  constructor({
    queueFile,
    repo = process.env.AIWB_GITHUB_REPO || 'tofueu/-AI-',
    issue = Number(process.env.AIWB_GITHUB_ISSUE || 2),
    token = process.env.GITHUB_TOKEN,
    allowedActors = process.env.AIWB_ALLOWED_GITHUB_ACTORS || '',
    reviewPrNumbers = process.env.AIWB_REVIEW_PR_NUMBERS || '',
    allowedReviewers = process.env.AIWB_ALLOWED_PR_REVIEWERS || '',
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
    // Optional, explicit PR allowlist: ordinary issue comments cannot request code repair.
    const reviewNumbers = typeof reviewPrNumbers === 'string'
      ? (reviewPrNumbers ? reviewPrNumbers.split(',').map(n => Number(n.trim())) : [])
      : reviewPrNumbers;
    const reviewers = typeof allowedReviewers === 'string'
      ? allowedReviewers.split(',').map(n => n.trim()).filter(Boolean)
      : allowedReviewers;
    this.reviewPoller = new GitHubReviewPoller({
      repo: this.repo, prNumbers: reviewNumbers, token: this.token,
      allowedReviewers: reviewers
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
      reviewIngestion: null,
      worker: null,
      reports: [],
      status: 'OK'
    };

    try {
      summary.ingestion = await this.poller.poll(this.queue);
      // Fail closed whenever ingestion cannot authenticate and authorize the
      // source. Existing queued jobs must not execute with a missing token,
      // even if they were accepted during an earlier authorized cycle.
      if (summary.ingestion.status !== 'OK') {
        summary.status = summary.ingestion.status;
        summary.worker = { status: 'SKIPPED', reason: summary.ingestion.status === 'WAITING_FOR_AUTH'
          ? 'GitHub token is missing; queued work remains untouched'
          : 'Trusted GitHub actor allowlist is missing' };
        this.currentBackoff = Math.min(this.currentBackoff * 2, this.maxBackoffMs);
        return summary;
      }
      summary.reviewIngestion = await this.reviewPoller.poll(this.queue);
      if (!['OK', 'DISABLED'].includes(summary.reviewIngestion.status)) {
        summary.status = summary.reviewIngestion.status;
        summary.worker = { status: 'SKIPPED', reason: 'Trusted PR review ingestion not authorized' };
        this.currentBackoff = Math.min(this.currentBackoff * 2, this.maxBackoffMs);
        return summary;
      }
      summary.worker = await runOneLocalJob(this.queue);

      for (const job of this.queue.list().filter(j =>
        j.status === 'READY_FOR_REVIEW' || j.status === 'BLOCKED' ||
        j.status === 'WAITING_FOR_AUTH').filter(j => !j.reportedAt).slice(0, 10)) {
        const result = await this.reporter.report(job);
        if (result.status === 'POSTED' || result.status === 'ALREADY_REPORTED') {
          this.queue.markReported(job.id, job.status, result.url, job.reportRevision || 0);
        }
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

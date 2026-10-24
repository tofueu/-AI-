import { mkdirSync, existsSync, readFileSync, writeFileSync, renameSync, rmSync } from 'node:fs';
import { dirname } from 'node:path';
import { randomUUID } from 'node:crypto';

const STATES = new Set(['QUEUED', 'RUNNING', 'WAITING_FOR_AUTH', 'BLOCKED', 'READY_FOR_REVIEW', 'VERIFIED']);
const now = () => new Date().toISOString();

// Only an exact, trusted machine-readable DECISION may enqueue an AI task.
// Ordinary prose DECISIONs and PR reviews are not executable instructions.
export function parseTrustedTaskCommand(body) {
  const command = String(body || '').trim();
  const direct = command.match(/^\/aiwb run ([a-zA-Z0-9_.-]{1,64})$/);
  if (direct) return direct[1];
  const decision = command.match(/^DECISION\nTask-ID: (aiwb-dispatcher)\nAction: RUN$/);
  return decision ? decision[1] : null;
}

export class PersistentQueue {
  constructor(filename) {
    this.filename = filename;
    mkdirSync(dirname(filename), { recursive: true });
    if (!existsSync(filename)) this._save({ version: 1, jobs: [] });
    this._read(); // Malformed data must fail loudly, not reset the queue.
  }
  _read() {
    const state = JSON.parse(readFileSync(this.filename, 'utf8'));
    if (state.version !== 1 || !Array.isArray(state.jobs)) throw new Error('Invalid queue format');
    return state;
  }
  _save(state) {
    const tmp = this.filename + '.' + randomUUID() + '.tmp';
    try {
      writeFileSync(tmp, JSON.stringify(state, null, 2), { encoding: 'utf8', mode: 0o600 });
      renameSync(tmp, this.filename);
    } finally {
      rmSync(tmp, { force: true });
    }
  }
  // One process per queue file. Multi-process workers require an external transactional DB.
  _change(fn) {
    const state = this._read();
    const result = fn(state);
    this._save(state);
    return result;
  }
  list() { return this._read().jobs; }
  enqueue(key, payload) {
    if (typeof key !== 'string' || !key || key.length > 200) throw new Error('Invalid job key');
    return this._change(state => {
      const existing = state.jobs.find(j => j.key === key);
      if (existing) return { job: existing, created: false };
      const job = { id: randomUUID(), key, payload, status: 'QUEUED', attempts: 0, reportRevision: 0,
        checkpoint: null, error: null, createdAt: now(), updatedAt: now() };
      state.jobs.push(job);
      return { job, created: true };
    });
  }
  transition(id, status, fields = {}) {
    if (!STATES.has(status)) throw new Error('Unknown status');
    return this._change(state => {
      const job = state.jobs.find(j => j.id === id);
      if (!job) throw new Error('Unknown job');
      const safe = {};
      for (const k of ['checkpoint', 'error', 'result', 'worker', 'leaseUntil']) {
        if (Object.hasOwn(fields, k)) safe[k] = fields[k];
      }
      // A new state is a new reportable event, even for a previously reported job.
      if (job.status !== status) {
        job.reportRevision = (job.reportRevision || 0) + 1;
        delete job.reportedAt;
        delete job.reportUrl;
      }
      Object.assign(job, safe, { status, updatedAt: now() });
      return job;
    });
  }
  claim(worker, leaseMs = 60000) {
    if (!worker || !Number.isFinite(leaseMs) || leaseMs < 1000) throw new Error('Invalid lease');
    return this._change(state => {
      const time = Date.now();
      const job = state.jobs.find(j => j.status === 'QUEUED' ||
        (j.status === 'RUNNING' && Date.parse(j.leaseUntil) <= time));
      if (!job) return null;
      job.status = 'RUNNING';
      job.worker = worker;
      job.attempts += 1;
      job.leaseUntil = new Date(time + leaseMs).toISOString();
      job.updatedAt = now();
      return job;
    });
  }
  // Persist successful GitHub writeback so the oldest ten jobs cannot starve new jobs.
  // Do not mark a job reported before POST succeeds or an existing marker is found.
  markReported(id, expectedStatus, url = null, expectedRevision = null) {
    if (!STATES.has(expectedStatus)) throw new Error('Invalid report status');
    return this._change(state => {
      const job = state.jobs.find(j => j.id === id);
      if (!job || job.status !== expectedStatus ||
          (expectedRevision !== null && (job.reportRevision || 0) !== expectedRevision)) {
        throw new Error('Job changed during reporting');
      }
      job.reportedAt = now();
      job.reportUrl = typeof url === 'string' ? url.slice(0, 500) : null;
      job.updatedAt = now();
      return job;
    });
  }
  resumeAuthorized(id) {
    return this._change(state => {
      const job = state.jobs.find(j => j.id === id);
      if (!job || job.status !== 'WAITING_FOR_AUTH') throw new Error('Job not awaiting auth');
      delete job.reportedAt;
      delete job.reportUrl;
      job.reportRevision = (job.reportRevision || 0) + 1;
      job.status = 'QUEUED';
      job.updatedAt = now();
      return job;
    });
  }
}

export class GitHubIssuePoller {
  constructor({ repo, issue, token, allowedActors, fetchImpl = fetch }) {
    if (!/^[\w.-]+\/[\w.-]+$/.test(repo || '')) throw new Error('Invalid repo');
    if (!Number.isInteger(issue) || issue < 1) throw new Error('Invalid issue');
    this.repo = repo;
    this.issue = issue;
    this.token = token;
    this.allowedActors = new Set(allowedActors || []);
    this.fetchImpl = fetchImpl;
  }
  async poll(queue) {
    if (!this.token) return { status: 'WAITING_FOR_AUTH', created: 0 };
    if (!this.allowedActors.size) return { status: 'BLOCKED', reason: 'Set an allowed GitHub actor', created: 0 };
    let created = 0;
    for (let page = 1; page <= 10; page++) {
      const url = `https://api.github.com/repos/${this.repo}/issues/${this.issue}/comments?per_page=100&page=${page}`;
      const response = await this.fetchImpl(url, { headers: {
        accept: 'application/vnd.github+json',
        authorization: `Bearer ${this.token}`,
        'user-agent': 'ai-workbench-dispatcher'
      } });
      if (!response.ok) throw new Error(`GitHub issue poll failed (HTTP ${response.status})`);
      const comments = await response.json();
      if (!Array.isArray(comments)) throw new Error('Invalid GitHub response');
      for (const comment of comments) {
        if (!this.allowedActors.has(comment.user?.login)) continue;
        const task = parseTrustedTaskCommand(comment.body);
        if (!task) continue;
        const outcome = queue.enqueue(`github-comment:${this.repo}:${comment.id}`, {
          task, commentId: comment.id, issue: this.issue, actor: comment.user.login
        });
        if (outcome.created) created++;
      }
      if (comments.length < 100) return { status: 'OK', created };
    }
    throw new Error('Pagination limit reached; increase page cap before polling more comments');
  }
}

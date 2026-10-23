// GitHub status writeback for the bounded local worker. This is NOT a Gemini/Jules adapter.
const VALID_REPO = /^[\w.-]+\/[\w.-]+$/;
const VALID_JOB_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const REPORTABLE = new Set(['READY_FOR_REVIEW', 'BLOCKED', 'WAITING_FOR_AUTH']);

export class GitHubIssueReporter {
  constructor({ repo, issue, token, fetchImpl = fetch }) {
    if (!VALID_REPO.test(repo || '')) throw new Error('Invalid repo');
    if (!Number.isInteger(issue) || issue < 1) throw new Error('Invalid issue');
    this.repo = repo;
    this.issue = issue;
    this.token = token;
    this.fetchImpl = fetchImpl;
  }

  async report(job) {
    if (!job || !VALID_JOB_ID.test(job.id || '') || !REPORTABLE.has(job.status)) {
      throw new Error('Job is not reportable');
    }
    if (!this.token) return { status: 'WAITING_FOR_AUTH', jobId: job.id };
    const base = `https://api.github.com/repos/${this.repo}/issues/${this.issue}/comments`;
    const headers = {
      accept: 'application/vnd.github+json',
      authorization: `Bearer ${this.token}`,
      'user-agent': 'ai-workbench-dispatcher'
    };
    const marker = `<!-- aiwb-worker-job:${job.id} -->`;
    // Read before write so a restarted cycle does not repeat an already posted report.
    for (let page = 1; page <= 10; page++) {
      const response = await this.fetchImpl(`${base}?per_page=100&page=${page}`, { headers });
      if (!response.ok) throw new Error(`GitHub report lookup failed (HTTP ${response.status})`);
      const comments = await response.json();
      if (!Array.isArray(comments)) throw new Error('Invalid GitHub comments response');
      const prior = comments.find(c => String(c.body || '').includes(marker));
      if (prior) return { status: 'ALREADY_REPORTED', jobId: job.id, url: prior.html_url || null };
      if (comments.length < 100) break;
      if (page === 10) throw new Error('GitHub report lookup exceeded pagination limit');
    }
    const task = String(job.payload?.task || 'unknown').replace(/[^a-zA-Z0-9_.-]/g, '').slice(0, 64);
    const body = [
      '## AI Workbench local worker result',
      '',
      `- Task: \`${task}\``,
      `- State: \`${job.status}\``,
      `- Job ID: \`${job.id}\``,
      '- Evidence: local allowlisted worker only; **not** Gemini/Jules autonomous execution.',
      ...(job.status === 'WAITING_FOR_AUTH' ? [
        '- Blocker: official CLI authorization or explicit worker opt-in is not verified.',
        '- Next: configure a legally authorized worker; do not bypass OAuth/2FA or purchase API credits.'
      ] : []),
      '',
      marker
    ].join('\n');
    const response = await this.fetchImpl(base, {
      method: 'POST',
      headers: { ...headers, 'content-type': 'application/json' },
      body: JSON.stringify({ body })
    });
    if (!response.ok) throw new Error(`GitHub report write failed (HTTP ${response.status})`);
    const comment = await response.json();
    return { status: 'POSTED', jobId: job.id, url: comment.html_url || null };
  }
}

// Ingest real GitHub PR reviews, never issue-comment text or quoted examples.
// This creates durable repair *requests*, not autonomous code execution.
const SHA = /^[0-9a-f]{40}$/i;
const REPO = /^[\w.-]+\/[\w.-]+$/;

export class GitHubReviewPoller {
  constructor({ repo, prNumbers = [], token, allowedReviewers = [], fetchImpl = fetch }) {
    if (!REPO.test(repo || '')) throw new Error('Invalid repository');
    if (!Array.isArray(prNumbers) || prNumbers.length > 20 ||
        prNumbers.some(n => !Number.isSafeInteger(n) || n < 1)) {
      throw new Error('Invalid PR allowlist');
    }
    this.repo = repo;
    this.prNumbers = [...new Set(prNumbers)];
    this.token = token;
    this.allowedReviewers = new Set(allowedReviewers);
    this.fetchImpl = fetchImpl;
  }

  async getJson(path) {
    const response = await this.fetchImpl(`https://api.github.com/repos/${this.repo}${path}`, {
      headers: {
        accept: 'application/vnd.github+json',
        authorization: `Bearer ${this.token}`,
        'user-agent': 'ai-workbench-review-poller'
      }
    });
    if (!response.ok) throw new Error(`GitHub review lookup failed (HTTP ${response.status})`);
    return response.json();
  }

  async poll(queue) {
    if (!this.prNumbers.length) return { status: 'DISABLED', created: 0 };
    if (!this.token) return { status: 'WAITING_FOR_AUTH', created: 0 };
    if (!this.allowedReviewers.size) return { status: 'BLOCKED', reason: 'No trusted PR reviewers configured', created: 0 };
    let created = 0;
    for (const number of this.prNumbers) {
      const pr = await this.getJson(`/pulls/${number}`);
      if (!pr || typeof pr !== 'object' || !pr.head || !pr.user) {
        throw new Error('Invalid GitHub PR response');
      }
      // Closed PRs, fork heads, and invalid/missing SHA cannot authorize repair.
      if (pr.state !== 'open' || pr.head.repo?.full_name !== this.repo) continue;
      const headSha = pr.head.sha;
      if (typeof headSha !== 'string' || !SHA.test(headSha)) {
        throw new Error('Invalid PR head SHA');
      }
      let finished = false;
      for (let page = 1; page <= 10; page++) {
        const reviews = await this.getJson(`/pulls/${number}/reviews?per_page=100&page=${page}`);
        if (!Array.isArray(reviews)) throw new Error('Invalid GitHub reviews response');
        for (const review of reviews) {
          const reviewer = review?.user?.login;
          if (review?.state !== 'CHANGES_REQUESTED' ||
              !this.allowedReviewers.has(reviewer) ||
              reviewer === pr.user.login ||
              review.commit_id !== headSha ||
              !Number.isSafeInteger(review.id) || review.id < 1 ||
              typeof review.submitted_at !== 'string' || !review.submitted_at) continue;
          // Review body is NEVER used as a shell command or AI prompt.
          const result = queue.enqueue(`github-pr-review:${this.repo}:${number}:${review.id}`, {
            task: 'aiwb-pr-review-fix', kind: 'verified-pr-review',
            pr: number, reviewId: review.id, reviewer, headSha
          });
          if (result.created) created++;
        }
        if (reviews.length < 100) { finished = true; break; }
      }
      if (!finished) throw new Error('GitHub review pagination limit reached');
    }
    return { status: 'OK', created };
  }
}

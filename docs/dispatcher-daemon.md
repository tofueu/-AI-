# Dispatcher daemon (bounded local-worker prototype)

This executable entrypoint makes `DispatcherDaemon` runnable as a continuously polling **local test-task** service. It is not a Gemini/Jules coding agent, cannot approve Jules plans, and does not create PRs or perform AI reviews. It does not start itself on any host; an operator must deploy and supervise the process.

## Run on an authorized machine

Set `GITHUB_TOKEN` using a protected environment variable or OS secret store with only the necessary repository issue read/write permissions. Do not put it in Git, plain JSON, or command-line arguments. Set `AIWB_ALLOWED_GITHUB_ACTORS` to the exact GitHub login names permitted to enqueue bounded tasks. Example in a shell with secrets **already injected**:

```sh
export AIWB_ALLOWED_GITHUB_ACTORS=tofueu
export AIWB_GITHUB_REPO=tofueu/-AI-
export AIWB_GITHUB_ISSUE=2
node scripts/run-dispatcher-daemon.js
```

`GITHUB_TOKEN` must already be supplied by the deployment environment. With missing token or empty actor allowlist the process exits with code `2`, logging `WAITING_FOR_AUTH` or `BLOCKED`. With valid configuration it polls at 30-second intervals (up to 5-minute exponential backoff after errors), runs at most one local allowlisted test job per cycle, writes bounded status results to Issue #2, and prints one JSON status line per cycle. `SIGINT`/`SIGTERM` stop after the in-flight cycle and preserve the on-disk queue.

Only exact `/aiwb run <task-id>` commands from an allowlisted GitHub actor, or the exact three-line `DECISION` / `Task-ID: aiwb-dispatcher` / `Action: RUN` command, are accepted. The local test task IDs are `ci-smoke` and `dispatcher-test`. `aiwb-dispatcher` may invoke the explicitly opted-in `agy` adapter **only** on a verified `aiwb/` feature branch; it does not push commits, open PRs, or claim independent review. Ordinary natural-language comments and PR reviews are **not** executable commands. No shell code from GitHub is evaluated.

## Required before autonomous AI work can be claimed

- Deploy and supervise the process on a real authorized machine (e.g., service manager); show process uptime, job ID, and GitHub report URL.
- Verify the existing opt-in `agy` adapter on a legally authenticated host, then separately implement and prove a real coding commit, push, Draft PR, independent review, and automatic continuation. The adapter's successful exit is only `EXECUTED_UNVERIFIED`. An ordinary `GITHUB_TOKEN` is not a model subscription or AI execution credential.
- Add trusted parsing of `DECISION`/review events, durable review gating, and a separately authorized reviewer; test the complete GitHub → agent → PR → review → next-task path.
- Confirm Windows NOVA, provider login, and installer separately. Passing Node CI is not Windows GUI validation.

The script is an intermediate engineering improvement, not completion of AI Workbench.


## Read-only deployment readiness preflight

Before starting a long-running daemon on an authorized machine, run:

```sh
node scripts/check-dispatcher-readiness.js
```

This checks the GitHub Issue #2 **read** endpoint using the configured token, trusted actor allowlist, explicit CLI opt-in, isolated `aiwb/` branch, and the presence of `agy --version`. It never posts a GitHub comment, invokes a model, requests OAuth, or prints tokens. Missing prerequisites return exit code 2 and machine-readable `BLOCKED` reasons.

**Important:** Even when prerequisites are present, the result is `PREREQUISITES_PRESENT_E2E_UNVERIFIED`, not `READY`: GitHub write permission, subscription login, persistent daemon deployment, actual coding commits, PR review and automatic continuation remain **unverified**. This command must not be presented as an end-to-end acceptance test. It also cannot remotely inspect the user's Windows login or Jules session from GitHub CI.

## Security boundary for local tests

The local Node test worker now passes only a small allowlist of non-secret OS/runtime environment variables to its child process; GitHub and model API tokens are not inherited through the child environment. **This is not a security sandbox**: repository-controlled tests can still read files and access resources available to the operating-system account. Do not run untrusted PR tests as the same OS user that owns the dispatcher credentials. Use a separately isolated worker/container with no access to the daemon's secret store. The real GitHub→AI→commit/PR→review E2E remains unverified.

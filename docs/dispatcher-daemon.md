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

Only comments whose entire text matches `/aiwb run ci-smoke` or `/aiwb run dispatcher-test` from an allowlisted GitHub actor can start a job. `DECISION`, PR review comments, and ordinary natural-language comments are **not** interpreted as executable instructions. No shell code from GitHub is evaluated.

## Required before autonomous AI work can be claimed

- Deploy and supervise the process on a real authorized machine (e.g., service manager); show process uptime, job ID, and GitHub report URL.
- Implement a **separate**, policy-compliant and authenticated Gemini/Codex CLI adapter; prove a real coding task produced a commit and PR. An ordinary `GITHUB_TOKEN` is not a model subscription or AI execution credential.
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

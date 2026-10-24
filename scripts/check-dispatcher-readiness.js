#!/usr/bin/env node
// Safe preflight: never requests AI model output, starts a worker, or posts to GitHub.
import { inspectDispatcherReadiness } from '../lib/dispatcher-readiness.js';

const result = await inspectDispatcherReadiness();
console.log(JSON.stringify(result));
if (result.status !== 'PREREQUISITES_PRESENT_E2E_UNVERIFIED') process.exitCode = 2;

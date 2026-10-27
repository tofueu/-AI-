#!/usr/bin/env node
// One bounded local execution step; this is not an autonomous Gemini/Jules agent.
import { resolve } from 'node:path';
import { PersistentQueue } from '../lib/dispatcher.js';
import { runOneLocalJob } from '../lib/worker.js';

const filename = resolve(process.env.AI_WORKBENCH_DATA_DIR || 'data', 'dispatcher-queue.json');
const queue = new PersistentQueue(filename);
const result = await runOneLocalJob(queue);
console.log(JSON.stringify({ ...result, queueFile: filename }));
if (result.status === 'BLOCKED') process.exitCode = 2;

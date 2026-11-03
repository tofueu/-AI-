#!/usr/bin/env node
// Cross-platform NOVA test entrypoint: no shell glob expansion required.
import {readdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {dirname,join} from 'node:path';
import {spawnSync} from 'node:child_process';

export async function listNovaTests(directory=dirname(fileURLToPath(import.meta.url))) {
  const names=await readdir(directory);
  return names.filter(name=>name.endsWith('.test.js')).sort().map(name=>join(directory,name));
}

export async function runNovaTests({directory=dirname(fileURLToPath(import.meta.url)),node=process.execPath}={}) {
  const files=await listNovaTests(directory);
  if(files.length===0) throw new Error('No NOVA test files found');
  const result=spawnSync(node,['--test',...files],{stdio:'inherit'});
  if(result.error) throw result.error;
  return result.status===null?1:result.status;
}

if(process.argv[1] && fileURLToPath(import.meta.url)===process.argv[1]) {
  try { process.exitCode=await runNovaTests(); }
  catch(error) { console.error('NOVA tests could not run:',error.message); process.exitCode=1; }
}

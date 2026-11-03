import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {listNovaTests,runNovaTests} from './run-tests.js';

test('discovers test files in deterministic order and ignores non-tests',async()=>{
  const dir=await mkdtemp(join(tmpdir(),'nova-test-runner-'));
  try{
    await writeFile(join(dir,'z.test.js'),'');
    await writeFile(join(dir,'a.test.js'),'');
    await writeFile(join(dir,'other.js'),'');
    assert.deepEqual((await listNovaTests(dir)).map(x=>x.split(/[\\/]/).pop()),['a.test.js','z.test.js']);
  }finally{await rm(dir,{recursive:true,force:true});}
});

test('fails closed when no test files exist',async()=>{
  const dir=await mkdtemp(join(tmpdir(),'nova-test-runner-'));
  try{await assert.rejects(()=>runNovaTests({directory:dir}),/No NOVA test files found/);}
  finally{await rm(dir,{recursive:true,force:true});}
});

test('propagates test runner failures',async()=>{
  const dir=await mkdtemp(join(tmpdir(),'nova-test-runner-'));
  try{
    await writeFile(join(dir,'failing.test.js'),"import test from 'node:test'; test('fails',()=>{throw new Error('expected failure')});");
    assert.equal(await runNovaTests({directory:dir}),1);
  }finally{await rm(dir,{recursive:true,force:true});}
});

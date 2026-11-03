import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readdir,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
import {parseNovaTemplateArgs} from './export-template-cli.js';

test('CLI validates variant and dimensions',()=>{
 assert.deepEqual(parseNovaTemplateArgs(['adult','output','64','96']).options,{width:64,height:96});
 assert.throws(()=>parseNovaTemplateArgs(['wrong','output']),/Variant/);
 assert.throws(()=>parseNovaTemplateArgs(['chibi','output','64px']),/Dimensions/);
 assert.throws(()=>parseNovaTemplateArgs(['chibi','output','0']),/Dimensions/);
});
for(const variant of ['chibi','adult']) test(`CLI exports ${variant} real PNG pack`,async()=>{
 const dir=await mkdtemp(join(tmpdir(),'nova-cli-'));
 try{
  const run=spawnSync(process.execPath,['nova/export-template-cli.js',variant,dir,'64','96'],{encoding:'utf8'});
  assert.equal(run.status,0,run.stderr);
  const files=await readdir(dir);
  assert.equal(files.length,18);
  const manifest=JSON.parse(await readFile(join(dir,'manifest.json'),'utf8'));
  assert.equal(manifest.variant,variant);
  assert.equal(manifest.layers.length,17);
  const png=await readFile(join(dir,'01_body.png'));
  assert.equal(png.subarray(0,8).toString('hex'),'89504e470d0a1a0a');
  assert.equal(png.readUInt32BE(16),64);
  assert.equal(png.readUInt32BE(20),96);
  const again=spawnSync(process.execPath,['nova/export-template-cli.js',variant,dir,'64','96'],{encoding:'utf8'});
  assert.notEqual(again.status,0);
  assert.match(again.stderr,/EEXIST/);
 }finally{await rm(dir,{recursive:true,force:true});}
});

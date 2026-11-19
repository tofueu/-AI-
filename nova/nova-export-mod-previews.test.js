import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,writeFile,rm,readdir} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {exportNovaModPreviews} from './nova-export-mod-previews.js';

test('exports both variants with independent PNG layers and clothing fallback',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'nova-mod-export-'));
 try{
  const manifest=join(dir,'mod.json'),out=join(dir,'out');
  await writeFile(manifest,JSON.stringify({chibi:{body:'body.png',head:'head.png',hat:null},adult:{body:'adult/body.png',top:'adult/top.png'}}));
  const files=await exportNovaModPreviews(manifest,out);
  assert.equal(files.length,2);
  const [chibi,adult]=await Promise.all(files.map(file=>readFile(file,'utf8')));
  assert.match(chibi,/width="512" height="512"/);
  assert.match(adult,/width="512" height="768"/);
  assert.match(chibi,/href="body.png"/);
  assert.doesNotMatch(chibi,/data-layer="hat"/);
  assert.match(chibi,/<rect data-layer="top"/);
  assert.match(adult,/href="adult\/top.png"/);
  assert.doesNotMatch(adult,/<rect data-layer="top"/);
 }finally{await rm(dir,{recursive:true,force:true});}
});
test('invalid paths fail before creating output files',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'nova-mod-invalid-'));
 try{
  const manifest=join(dir,'mod.json'),out=join(dir,'out');
  await writeFile(manifest,JSON.stringify({chibi:{body:'../bad.png'}}));
  await assert.rejects(exportNovaModPreviews(manifest,out),/Unsafe PNG path/);
  await assert.rejects(readdir(out),{code:'ENOENT'});
 }finally{await rm(dir,{recursive:true,force:true});}
});

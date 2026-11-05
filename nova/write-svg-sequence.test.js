import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,rm,mkdir} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {writeNovaSvgSequence} from './write-svg-sequence.js';

test('exports frame files and manifest without modifying the source sequence',async()=>{
 const root=await mkdtemp(join(tmpdir(),'nova-sequence-'));
 try {
  const sequence={variant:'chibi',action:'idle',fps:2,duration:1,frames:[
   {index:0,time:0,filename:'frame-0000.svg',svg:'<svg xmlns="http://www.w3.org/2000/svg"/>'},
   {index:1,time:.5,filename:'frame-0001.svg',svg:'<svg xmlns="http://www.w3.org/2000/svg"/>'}
  ]};
  const result=await writeNovaSvgSequence(sequence,join(root,'export'));
  assert.equal(result.manifest.frames.length,2);
  assert.match(await readFile(join(root,'export','frame-0001.svg'),'utf8'),/^<svg/);
  assert.equal(JSON.parse(await readFile(join(root,'export','manifest.json'),'utf8')).variant,'chibi');
  await assert.rejects(writeNovaSvgSequence(sequence,join(root,'export')),/already exists/);
 } finally {await rm(root,{recursive:true,force:true});}
});
test('rejects unsafe filenames and malformed frames',async()=>{
 const root=await mkdtemp(join(tmpdir(),'nova-sequence-'));
 try {
  await assert.rejects(writeNovaSvgSequence({variant:'adult',frames:[
   {index:0,time:0,filename:'../bad.svg',svg:'<svg />'},
   {index:1,time:1,filename:'frame-0001.svg',svg:'<svg />'}
  ]},join(root,'export')),/Invalid NOVA SVG sequence/);
 } finally {await rm(root,{recursive:true,force:true});}
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp, readdir, readFile, writeFile, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {exportNovaMotionPreviews} from './export-motion-previews.js';

test('exports eight chibi/adult action previews with valid SVG',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'nova-preview-'));
 try {
  const paths=await exportNovaMotionPreviews(dir);
  assert.equal(paths.length,8);
  assert.equal((await readdir(dir)).length,8);
  for(const path of paths) {
   const svg=await readFile(path,'utf8');
   assert.match(svg,/^<svg /);
   assert.match(svg,/<\/svg>$/);
   assert.match(svg,/<g transform=/);
  }
  await assert.rejects(exportNovaMotionPreviews(dir),/EEXIST/);
 } finally {await rm(dir,{recursive:true,force:true});}
});
test('rejects missing output path and unsupported fps',async()=>{
 await assert.rejects(exportNovaMotionPreviews(''),/Output directory required/);
 await assert.rejects(exportNovaMotionPreviews('/unused',{fps:0}),/Invalid preview FPS/);
});

test('collision on a later sheet does not leave partial previews',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'nova-collision-'));
 try {
  const existing=join(dir,'adult-cry-rig-preview.svg');
  await writeFile(existing,'original artwork');
  await assert.rejects(exportNovaMotionPreviews(dir),/EEXIST/);
  assert.deepEqual(await readdir(dir),['adult-cry-rig-preview.svg']);
  assert.equal(await readFile(existing,'utf8'),'original artwork');
 } finally {await rm(dir,{recursive:true,force:true});}
});

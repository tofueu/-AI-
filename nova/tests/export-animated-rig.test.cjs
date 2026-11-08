'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const {animatedSvg,exportAnimated}=require('../tools/export-animated-rig.cjs');
const {BONES}=require('../tools/export-rig-frames.cjs');
for(const variant of ['chibi','adult'])for(const clip of ['idle','walk','typing']){
 test(variant+' '+clip+' looping SVG rig',()=>{
  const svg=animatedSvg(variant,clip);
  assert.match(svg,/viewBox="0 0 512 512"/);
  assert.equal((svg.match(/<line /g)||[]).length,BONES.length);
  assert.equal((svg.match(/<circle /g)||[]).length,14);
  assert.equal((svg.match(/<animate /g)||[]).length,BONES.length*4+14*2);
  assert.doesNotMatch(svg,/NaN|Infinity|undefined/);
  assert.match(svg,/repeatCount="indefinite"/);
 });
}
test('exports six animated previews',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'nova-animated-'));
 try{
  const files=exportAnimated(dir);
  assert.equal(files.length,6);
  for(const file of files)assert.match(fs.readFileSync(path.join(dir,file),'utf8'),/<animate /);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
test('rejects invalid parameters',()=>{
 for(const args of [['other','idle',24],['chibi','other',24],['chibi','walk',3],['adult','walk',121],['adult','walk',4.5]])assert.throws(()=>animatedSvg(...args),TypeError);
});

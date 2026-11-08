'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const {renderSvg,exportFrames,BONES}=require('../tools/export-rig-frames.cjs');
for(const variant of ['chibi','adult'])for(const clip of ['idle','walk','typing']){
 test(variant+' '+clip+' SVG frames',()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'nova-rig-'));
  try{
   const files=exportFrames(dir,variant,clip,12);
   assert.equal(files.length,12);
   assert.equal(new Set(files).size,12);
   for(const file of files){
    const svg=fs.readFileSync(path.join(dir,file),'utf8');
    assert.match(svg,/viewBox="0 0 512 512"/);
    assert.equal((svg.match(/<line /g)||[]).length,BONES.length);
    assert.equal((svg.match(/<circle /g)||[]).length,14);
    assert.doesNotMatch(svg,/NaN|Infinity/);
   }
   assert.equal(renderSvg(variant,clip,0),renderSvg(variant,clip,require('../rig/joint-animation.cjs').clips[clip].duration));
  }finally{fs.rmSync(dir,{recursive:true,force:true});}
 });
}
test('rejects invalid variants, clips and frame counts',()=>{
 const dir=path.join(os.tmpdir(),'nova-invalid-export');
 for(const args of [['wrong','walk',12],['chibi','wrong',12],['chibi','walk',1],['chibi','walk',121],['chibi','walk',2.5]])assert.throws(()=>exportFrames(dir,...args),TypeError);
});

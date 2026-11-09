'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const {exportModTemplate}=require('../tools/export-mod-template.cjs');
const {validateModManifest}=require('../rig/validate-mod-manifest.cjs');
for(const variant of ['chibi','adult']){
 test(variant+' blank template hides all empty slots',()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'nova-mod-'));
  try{
   exportModTemplate(dir,variant);
   const result=validateModManifest(path.join(dir,'mod-template.json'));
   assert.equal(result.variant,variant);
   assert.equal(result.activeSlots.length,0);
   assert.equal(Object.keys(result.slots).length,14);
  }finally{fs.rmSync(dir,{recursive:true,force:true})}
 });
 test(variant+' accepts local asset and rejects traversal and invalid type',()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'nova-mod-'));
  try{
   exportModTemplate(dir,variant);
   const file=path.join(dir,'mod-template.json');
   const manifest=JSON.parse(fs.readFileSync(file,'utf8'));
   fs.writeFileSync(path.join(dir,'hair.png'),'sample');
   manifest.slots.hair_front='hair.png';
   fs.writeFileSync(file,JSON.stringify(manifest));
   assert.deepEqual(validateModManifest(file).activeSlots,['hair_front']);
   manifest.slots.hair_front='../escape.png';
   fs.writeFileSync(file,JSON.stringify(manifest));
   assert.throws(()=>validateModManifest(file),/Unsafe/);
   manifest.slots.hair_front='evil.exe';
   fs.writeFileSync(file,JSON.stringify(manifest));
   assert.throws(()=>validateModManifest(file),/Unsupported/);
   manifest.slots.hair_front='missing.png';
   fs.writeFileSync(file,JSON.stringify(manifest));
   assert.throws(()=>validateModManifest(file),/ENOENT/);
  }finally{fs.rmSync(dir,{recursive:true,force:true})}
 });
}

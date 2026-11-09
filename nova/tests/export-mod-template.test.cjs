'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const {exportModTemplate,SLOTS}=require('../tools/export-mod-template.cjs');
for(const variant of ['chibi','adult'])test(variant+' exports transparent 14-slot whiteboard and manifest',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'nova-template-'));
 try{
  const result=exportModTemplate(root,variant);
  assert.equal(result.slotCount,14);
  const svg=fs.readFileSync(path.join(root,'whiteboard.svg'),'utf8');
  const manifest=JSON.parse(fs.readFileSync(path.join(root,'mod-template.json')));
  assert.equal(manifest.variant,variant);
  assert.equal(Object.keys(manifest.slots).length,SLOTS.length);
  for(const slot of SLOTS){assert.match(svg,new RegExp('id="slot-'+slot+'"'));assert.equal(manifest.slots[slot],'')}
  assert.doesNotMatch(svg,/<image\b/);
  assert.ok(fs.existsSync(path.join(root,'README.txt')));
 }finally{fs.rmSync(root,{recursive:true,force:true})}
});
test('rejects unknown variants and missing paths',()=>{
 assert.throws(()=>exportModTemplate('x','other'),TypeError);
 assert.throws(()=>exportModTemplate('','chibi'),TypeError);
});

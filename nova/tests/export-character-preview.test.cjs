'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const {exportCharacterPreview}=require('../tools/export-character-preview.cjs');
for(const variant of ['chibi','adult']){
 test(variant+' preview writes playable sequence and MOD override',()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'nova-preview-'));
  try{
   const result=exportCharacterPreview({variant,clip:'typing',frames:6,outDir:root,assets:{full_character:'character.png',hat:'hat.png'}});
   assert.equal(result.frameCount,6);
   const manifest=JSON.parse(fs.readFileSync(path.join(root,'manifest.json'),'utf8'));
   assert.equal(manifest.frames.length,6);
   for(const file of manifest.frames){
    const svg=fs.readFileSync(path.join(root,file),'utf8');
    assert.match(svg,/character.png/);
    assert.doesNotMatch(svg,/hat.png|base_clothes/);
   }
   const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
   assert.match(html,/setInterval/);
   assert.match(html,/frame-000.svg/);
  }finally{fs.rmSync(root,{recursive:true,force:true})}
 });
}
test('rejects invalid input',()=>{
 assert.throws(()=>exportCharacterPreview({variant:'bad',outDir:'x'}),TypeError);
 assert.throws(()=>exportCharacterPreview({frames:1,outDir:'x'}),RangeError);
 assert.throws(()=>exportCharacterPreview({outDir:''}),TypeError);
});

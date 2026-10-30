import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createArtistTemplate,blankPng} from '../scripts/create-nova-character-mod.js';
import {validateRig} from '../public/nova-rig-runtime.js';

test('blank transparent PNG scaffold is a valid 256x256 RGBA PNG',()=>{
  const bytes=blankPng();
  assert.equal(bytes.subarray(0,8).toString('hex'),'89504e470d0a1a0a');
  assert.equal(bytes.readUInt32BE(16),256);
  assert.equal(bytes.readUInt32BE(20),256);
  assert.equal(bytes[25],6);
});
for(const style of ['chibi','mature']){
 test(`${style} community template creates real locally editable parts and refuses overwrite`,()=>{
  const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'nova-rig-scaffold-'));
  const dest=path.join(tmp,'MyCharacter');
  try{
   const r=createArtistTemplate(style,dest);assert.ok(r.parts>=54,'新版 PSD MOD 應包含 54 個可畫部位');
   assert.ok(r.wardrobe.includes('hair')&&r.wardrobe.includes('headwear')&&r.wardrobe.includes('outfit'));
   const rig=validateRig(JSON.parse(fs.readFileSync(path.join(dest,'rig.json'),'utf8')));
   for(const part of rig.parts){
    const p=path.join(dest,part.file);assert.ok(fs.existsSync(p));
    assert.equal(fs.readFileSync(p).subarray(0,8).toString('hex'),'89504e470d0a1a0a');
   }
   const options=rig.wardrobe||{};
   const variant=options.headwear?.butterfly?.hat;
   assert.ok(variant,'Must provide optional hat slot');
   assert.ok(fs.existsSync(path.join(dest,variant)),'Artist can paint alternate hats in their own PNG layer');
   assert.throws(()=>createArtistTemplate(style,dest),/overwrite/);
  }finally{fs.rmSync(tmp,{recursive:true,force:true});}
 });
}
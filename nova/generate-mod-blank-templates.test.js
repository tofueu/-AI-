import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,readFileSync,writeFileSync,rmSync,existsSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {inflateSync} from 'node:zlib';
import {generateNovaBlankTemplates,NOVA_PARTS,transparentPng} from './generate-mod-blank-templates.js';
test('transparent PNG is valid RGBA and fully transparent',()=>{
 const png=transparentPng(8,9);
 assert.deepEqual([...png.subarray(0,8)],[137,80,78,71,13,10,26,10]);
 assert.equal(png.readUInt32BE(16),8);assert.equal(png.readUInt32BE(20),9);
 assert.equal(png[25],6);
 const len=png.readUInt32BE(33);
 const raw=inflateSync(png.subarray(41,41+len));
 assert.equal(raw.length,9*(1+8*4));assert.ok(raw.every(x=>x===0));
});
test('both variants have all blank part layers and fallback outfit slots',()=>{
 const dir=mkdtempSync(join(tmpdir(),'nova-blank-'));
 try{
  const paths=generateNovaBlankTemplates(dir);
  assert.equal(paths.length,NOVA_PARTS.length*2);
  for(const variant of ['chibi','adult']){
   const cfg=JSON.parse(readFileSync(join(dir,variant,'character.json'),'utf8'));
   assert.equal(cfg.variant,variant);
   assert.equal(cfg.safeOutfit.top.src,'art/top.png');
   assert.equal(cfg.safeOutfit.bottom.src,'art/bottom.png');
   for(const part of NOVA_PARTS)assert.ok(existsSync(join(dir,variant,'art',part+'.png')));
   const png=readFileSync(join(dir,variant,'art','body.png'));
   assert.equal(png.readUInt32BE(16),512);
   assert.equal(png.readUInt32BE(20),variant==='chibi'?512:768);
  }
 }finally{rmSync(dir,{recursive:true,force:true});}
});
test('reject unreasonable template dimensions',()=>{
 for(const [w,h] of [[0,1],[1,-1],[2048,2048],[2.5,10]])assert.throws(()=>transparentPng(w,h),/Invalid template dimensions/);
});

test('regeneration never overwrites artist artwork or character manifest',()=>{
 const dir=mkdtempSync(join(tmpdir(),'nova-art-preserve-'));
 try{
  generateNovaBlankTemplates(dir);
  const artwork=join(dir,'chibi','art','top.png');
  const manifest=join(dir,'chibi','character.json');
  const painted=Buffer.from('artist-owned-custom-content');
  writeFileSync(artwork,painted);
  const originalManifest=readFileSync(manifest);
  assert.throws(()=>generateNovaBlankTemplates(dir),/Refusing to overwrite existing MOD artwork/);
  assert.deepEqual(readFileSync(artwork),painted);
  assert.deepEqual(readFileSync(manifest),originalManifest);
 }finally{rmSync(dir,{recursive:true,force:true});}
});

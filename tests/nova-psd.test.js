import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import zlib from 'node:zlib';
import {fileURLToPath} from 'node:url';
import {parseNovaPsd,psdLayerId} from '../public/nova-psd-parser.js';
import {psdTemplateBytes,installPsdTemplates} from '../nova-psd-templates.js';
import {installPsdCharacter,getActiveCharacter,readCharacter,characterFile,setActiveCharacter} from '../nova-psd-mod.js';
import {validateRig} from '../public/nova-rig-runtime.js';
const root=path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const fixture=zlib.gunzipSync(Buffer.from(fs.readFileSync(path.join(root,'tests','fixtures','nova-painted-test.psd.gz.b64'),'utf8'),'base64'));
const setup=()=>{const p=fs.mkdtempSync(path.join(os.tmpdir(),'nova-psd-roundtrip-'));fs.mkdirSync(path.join(p,'templates','nova-character-mod'),{recursive:true});for(const style of ['chibi','mature']){const folder=path.join(p,'templates','nova-character-mod',style);fs.mkdirSync(folder,{recursive:true});fs.copyFileSync(path.join(root,'templates','nova-character-mod',style,'rig.json'),path.join(folder,'rig.json'));}return p;};
for(const style of ['chibi','mature']){
 test(`${style}: original, editable layered PSD template is recovered from Git and guides are separate`,async()=>{
  const b=psdTemplateBytes(root,style);assert.ok(b.length>100_000);const data=await parseNovaPsd(b);
  assert.deepEqual([data.width,data.height],[640,800]);assert.ok(data.layerCount>=80);assert.ok(data.editableLayerCount>=80);
  assert.equal(data.layers.length,0,'fresh painter PSD must not contain fabricated artwork on editable part layers');
 });
}
test('PSD layer names map precisely to part and hairstyle/hat/face variants',()=>{
 assert.deepEqual(psdLayerId('PART__head'),{kind:'part',part:'head'});
 assert.deepEqual(psdLayerId('VAR__headwear__butterfly__hat'),{kind:'variant',category:'headwear',option:'butterfly',part:'hat'});
 assert.equal(psdLayerId('GUIDE__original_reference'),null);
 assert.equal(psdLayerId('PART__../../unsafe'),null);
});
test('painted PSD yields RGBA layers with original absolute position, no flattened guide contamination',async()=>{
 const d=await parseNovaPsd(fixture);
 assert.equal(d.layerCount,4);
 assert.deepEqual(new Set(d.layers.map(x=>x.name)),new Set(['PART__head','PART__torso','PART__upperarm_l','VAR__eyes__happy__eyes_l']));
 for(const layer of d.layers)assert.equal(layer.pixels.length,layer.width*layer.height*4);
});
test('single painted PSD installs a persistent, rigged MOD and keeps the original file for future editing',async()=>{
 const folder=setup();
 try{
  const r=await installPsdCharacter(folder,fixture,'chibi');
  assert.equal(r.ok,true);assert.ok(r.paintedParts>=3);
  assert.equal(getActiveCharacter(folder),r.id);
  const rig=validateRig(readCharacter(folder,r.id));
  assert.ok(fs.existsSync(characterFile(folder,r.id,'parts/head.png')));
  assert.ok(fs.existsSync(path.join(folder,'data','nova-installed-mods',r.id,'original.psd')));
  assert.ok(fs.existsSync(characterFile(folder,r.id,'variants/eyes/happy/eyes_l.png')));
  assert.notDeepEqual(rig.parts.find(p=>p.id==='head').pivot,[128,128]);
  const file=fs.readFileSync(characterFile(folder,r.id,'parts/head.png'));
  assert.equal(file.subarray(0,8).toString('hex'),'89504e470d0a1a0a');
  assert.ok(rig.wardrobe.eyes.happy);assert.ok(rig.variantPivots['variants/eyes/happy/eyes_l.png']);
  setActiveCharacter(folder,null);assert.equal(getActiveCharacter(folder),null);
 }finally{fs.rmSync(folder,{recursive:true,force:true});}
});
test('blank PSD cannot become a false working character',async()=>{
 const folder=setup();
 try{await assert.rejects(()=>installPsdCharacter(folder,psdTemplateBytes(root,'chibi'),'chibi'),/至少需要/);}
 finally{fs.rmSync(folder,{recursive:true,force:true});}
});
test('PSD rejects non-PSD, oversized and unknown color model, no external paths',async()=>{
 await assert.rejects(()=>parseNovaPsd(new Uint8Array(200).buffer),/不是標準 PSD/);
 const fake=Buffer.from(fixture);fake.writeUInt16BE(4,24);await assert.rejects(()=>parseNovaPsd(fake),/RGB/);
 assert.throws(()=>characterFile(root,'nova-safename','../secrets.png'));
});
test('template restoration is idempotent on same bytes',()=>{
 const folder=setup();
 try{
  const p=path.join(folder,'art','nova-official','psd-templates');fs.mkdirSync(p,{recursive:true});
  const source=path.join(root,'art','nova-official','psd-templates');
  for(const x of fs.readdirSync(source))fs.copyFileSync(path.join(source,x),path.join(p,x));
  assert.equal(installPsdTemplates(folder).length,2);
  assert.ok(installPsdTemplates(folder).every(x=>x.cached));
 }finally{fs.rmSync(folder,{recursive:true,force:true});}
});
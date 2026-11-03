import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {inflateSync} from 'node:zlib';
import {encodeBlankRgbaPng,exportNovaBlankPngLayers} from './png-template.js';
for(const variant of ['chibi','adult'])test(`${variant} writes 17 transparent PNGs and manifest`,async()=>{
 const dir=await mkdtemp(join(tmpdir(),'nova-png-'));
 try{const manifest=await exportNovaBlankPngLayers(dir,variant,{width:64,height:96});assert.equal(manifest.layers.length,17);
 const png=await readFile(join(dir,'01_body.png'));assert.equal(png.subarray(0,8).toString('hex'),'89504e470d0a1a0a');assert.equal(png.readUInt32BE(16),64);assert.equal(png.readUInt32BE(20),96);
 const size=png.readUInt32BE(33);const raw=inflateSync(png.subarray(41,41+size));assert.equal(raw.length,96*(1+64*4));assert.ok(raw.every(b=>b===0));
 await assert.rejects(()=>exportNovaBlankPngLayers(dir,variant,{width:64,height:96}),/EEXIST/);
 assert.equal(JSON.parse(await readFile(join(dir,'manifest.json'),'utf8')).variant,variant);
 }finally{await rm(dir,{recursive:true,force:true});}
});
test('rejects invalid dimensions',()=>assert.throws(()=>encodeBlankRgbaPng(0,20),/Invalid/));

test('occupied output does not create partial layers',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'nova-png-occupied-'));
 try{
  const {writeFile,readdir}=await import('node:fs/promises');
  await writeFile(join(dir,'08_hair_front.png'),'existing artist work');
  await assert.rejects(()=>exportNovaBlankPngLayers(dir,'chibi',{width:64,height:64}),/EEXIST/);
  assert.deepEqual(await readdir(dir),['08_hair_front.png']);
  assert.equal((await readFile(join(dir,'08_hair_front.png'),'utf8')),'existing artist work');
 }finally{await rm(dir,{recursive:true,force:true});}
});

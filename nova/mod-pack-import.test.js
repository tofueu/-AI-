import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {exportNovaBlankPngLayers} from './png-template.js';
import {loadNovaPngMod,resolveNovaPngMod} from './mod-pack-import.js';

test('imports visible PNG layers while hiding untouched blank layers',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'nova-import-'));
 try{
  await exportNovaBlankPngLayers(dir,'chibi',{width:64,height:96});
  const path=join(dir,'manifest.json');
  const manifest=JSON.parse(await readFile(path,'utf8'));
  manifest.layers.find(x=>x.slot==='hair_front').hidden=false;
  await writeFile(path,JSON.stringify(manifest));
  const mod=await loadNovaPngMod(dir);
  assert.equal(mod.variant,'chibi');
  assert.equal(mod.layers.body.hidden,true);
  assert.equal(mod.layers.hair_front.src,join(dir,'08_hair_front.png'));
  const layers=await resolveNovaPngMod({variant:'chibi',directories:[dir],safeOutfit:{top:{src:'base-top'},bottom:{src:'base-bottom'}}});
  assert.ok(layers.some(x=>x.slot==='hair_front'));
  assert.ok(layers.some(x=>x.slot==='top'&&x.src==='base-top'));
  assert.ok(layers.some(x=>x.slot==='bottom'&&x.src==='base-bottom'));
  assert.ok(!layers.some(x=>x.slot==='body'));
 }finally{await rm(dir,{recursive:true,force:true});}
});

test('rejects variant mismatch before resolving',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'nova-import-'));
 try{
  await exportNovaBlankPngLayers(dir,'adult',{width:64,height:96});
  await assert.rejects(()=>resolveNovaPngMod({variant:'chibi',directories:[dir]}),/Incompatible PNG MOD variant/);
 }finally{await rm(dir,{recursive:true,force:true});}
});

test('rejects damaged pack rather than passing unsafe PNG paths to resolver',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'nova-import-'));
 try{
  await exportNovaBlankPngLayers(dir,'chibi',{width:64,height:96});
  await writeFile(join(dir,'01_body.png'),Buffer.from('invalid'));
  await assert.rejects(()=>loadNovaPngMod(dir),/Invalid RGBA PNG layer: body/);
 }finally{await rm(dir,{recursive:true,force:true});}
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {exportNovaBlankPngLayers} from './png-template.js';
import {validateNovaPngPack} from './mod-pack-validator.js';

for(const variant of ['chibi','adult']) test(`validates exported ${variant} PNG MOD pack`,async()=>{
 const dir=await mkdtemp(join(tmpdir(),'nova-pack-'));
 try{
  await exportNovaBlankPngLayers(dir,variant,{width:64,height:96});
  const pack=await validateNovaPngPack(dir);
  assert.equal(pack.variant,variant);
  assert.equal(pack.layers.length,17);
  assert.ok(pack.layers.every(layer=>layer.hidden));
  const path=join(dir,'01_body.png');
  const bytes=await readFile(path);
  bytes.writeUInt32BE(65,16);
  await writeFile(path,bytes);
  await assert.rejects(()=>validateNovaPngPack(dir),/Invalid RGBA PNG layer: body/);
 }finally{await rm(dir,{recursive:true,force:true});}
});

test('rejects symlinked PNG layers even when target is a valid PNG',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'nova-pack-link-'));
 try{
  await exportNovaBlankPngLayers(dir,'chibi',{width:64,height:96});
  const target=join(dir,'02_head.png');
  const layer=join(dir,'01_body.png');
  await rm(layer);
  const {symlink}=await import('node:fs/promises');
  await symlink(target,layer);
  await assert.rejects(()=>validateNovaPngPack(dir),/Unsafe PNG layer file: body/);
 }finally{await rm(dir,{recursive:true,force:true});}
});

test('rejects symlinked MOD manifests without reading their contents',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'nova-manifest-link-'));
 try{
  await exportNovaBlankPngLayers(dir,'adult',{width:64,height:96});
  const original=join(dir,'manifest.json');
  const target=join(dir,'manifest-copy.json');
  await writeFile(target,await readFile(original));
  await rm(original);
  const {symlink}=await import('node:fs/promises');
  await symlink(target,original);
  await assert.rejects(()=>validateNovaPngPack(dir),/Unsafe MOD manifest file/);
 }finally{await rm(dir,{recursive:true,force:true});}
});

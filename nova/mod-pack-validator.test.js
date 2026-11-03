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

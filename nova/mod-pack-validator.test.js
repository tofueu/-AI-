import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {exportNovaBlankPngLayers} from './png-template.js';
import {validateNovaPngPack} from './mod-pack-validator.js';
import {LAYER_SLOTS} from './mod-layers.js';

for(const variant of ['chibi','adult']) test(`validates exported ${variant} PNG MOD pack`,async()=>{
 const dir=await mkdtemp(join(tmpdir(),'nova-pack-'));
 try{
  await exportNovaBlankPngLayers(dir,variant,{width:64,height:96});
  const pack=await validateNovaPngPack(dir);
  assert.equal(pack.variant,variant);
  assert.equal(pack.layers.length,LAYER_SLOTS.length);
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

test('rejects PNG with damaged IDAT checksum',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'nova-corrupt-crc-'));
 try{
  await exportNovaBlankPngLayers(dir,'chibi',{width:64,height:96});
  const path=join(dir,'01_body.png');
  const bytes=await readFile(path);
  const idat=bytes.indexOf(Buffer.from('IDAT'));
  assert.ok(idat>0);
  bytes[idat+4]^=1;
  await writeFile(path,bytes);
  await assert.rejects(()=>validateNovaPngPack(dir),/Invalid RGBA PNG layer: body/);
 }finally{await rm(dir,{recursive:true,force:true});}
});

test('rejects truncated PNG stream despite valid IHDR',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'nova-truncated-'));
 try{
  await exportNovaBlankPngLayers(dir,'adult',{width:64,height:96});
  const path=join(dir,'01_body.png');
  const bytes=await readFile(path);
  await writeFile(path,bytes.subarray(0,bytes.length-12));
  await assert.rejects(()=>validateNovaPngPack(dir),/Invalid RGBA PNG layer: body/);
 }finally{await rm(dir,{recursive:true,force:true});}
});

test('rejects PNG with noncontiguous IDAT chunks',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'nova-split-idat-'));
 try{
  await exportNovaBlankPngLayers(dir,'chibi',{width:64,height:96});
  const path=join(dir,'01_body.png');
  const original=await readFile(path);
  const start=8+25; // PNG signature and IHDR chunk
  const length=original.readUInt32BE(start);
  const payload=original.subarray(start+8,start+8+length);
  const split=Math.floor(payload.length/2);
  function crc32(data){let crc=0xffffffff;for(const b of data){crc^=b;for(let i=0;i<8;i++)crc=(crc>>>1)^((crc&1)?0xedb88320:0);}return (crc^0xffffffff)>>>0;}
  function chunk(type,data){const header=Buffer.alloc(8);header.writeUInt32BE(data.length);header.write(type,4,'ascii');const checksum=Buffer.alloc(4);checksum.writeUInt32BE(crc32(Buffer.concat([header.subarray(4),data])));return Buffer.concat([header,data,checksum]);}
  const malformed=Buffer.concat([
   original.subarray(0,start),
   chunk('IDAT',payload.subarray(0,split)),
   chunk('tEXt',Buffer.from('Comment\\0interrupted')),
   chunk('IDAT',payload.subarray(split)),
   original.subarray(start+12+length)
  ]);
  await writeFile(path,malformed);
  await assert.rejects(()=>validateNovaPngPack(dir),/Invalid RGBA PNG layer: body/);
 }finally{await rm(dir,{recursive:true,force:true});}
});


test('keeps painted RGBA layers visible and blank layers hidden for both variants',async()=>{
 const {deflateSync}=await import('node:zlib');
 function crc32(data){let crc=0xffffffff;for(const b of data){crc^=b;for(let i=0;i<8;i++)crc=(crc>>>1)^((crc&1)?0xedb88320:0);}return (crc^0xffffffff)>>>0;}
 function chunk(type,data){
  const name=Buffer.from(type),size=Buffer.alloc(4),checksum=Buffer.alloc(4);
  size.writeUInt32BE(data.length);checksum.writeUInt32BE(crc32(Buffer.concat([name,data])));
  return Buffer.concat([size,name,data,checksum]);
 }
 for(const variant of ['chibi','adult']){
  const dir=await mkdtemp(join(tmpdir(),'nova-painted-'));
  try{
   await exportNovaBlankPngLayers(dir,variant,{width:64,height:96});
   const filename=join(dir,'01_body.png');
   const original=await readFile(filename);
   const stride=1+64*4,raw=Buffer.alloc(stride*96);
   // Pixel alpha is nonzero; every other pixel stays transparent.
   raw[1+3]=255;
   const idat=chunk('IDAT',deflateSync(raw));
   const png=Buffer.concat([original.subarray(0,33),idat,original.subarray(original.length-12)]);
   await writeFile(filename,png);
   const manifestPath=join(dir,'manifest.json');
   const manifest=JSON.parse(await readFile(manifestPath,'utf8'));
   manifest.layers[0].hidden=false;
   manifest.layers[1].hidden=false; // blank art must still be suppressed
   await writeFile(manifestPath,JSON.stringify(manifest));
   const pack=await validateNovaPngPack(dir);
   assert.equal(pack.layers[0].hidden,false,variant+' painted body should display');
   assert.equal(pack.layers[1].hidden,true,variant+' empty head should hide');
   assert.ok(pack.layers.slice(2).every(layer=>layer.hidden));
  }finally{await rm(dir,{recursive:true,force:true});}
 }
});

// Sparse oversized files must be rejected before readFile allocates their contents.
test('rejects oversized MOD PNG without loading it into memory',async()=>{
 const {open}=await import('node:fs/promises');
 const dir=await mkdtemp(join(tmpdir(),'nova-oversized-'));
 try{
  await exportNovaBlankPngLayers(dir,'chibi',{width:64,height:96});
  const path=join(dir,'01_body.png');
  const handle=await open(path,'r+');
  try{await handle.truncate(80*1024*1024+1);}finally{await handle.close();}
  await assert.rejects(()=>validateNovaPngPack(dir),/PNG layer exceeds size limit: body/);
 }finally{await rm(dir,{recursive:true,force:true});}
});

test('rejects oversized MOD manifest before parsing JSON',async()=>{
 const {open}=await import('node:fs/promises');
 const dir=await mkdtemp(join(tmpdir(),'nova-manifest-oversized-'));
 try{
  await exportNovaBlankPngLayers(dir,'adult',{width:64,height:96});
  const path=join(dir,'manifest.json');
  const handle=await open(path,'r+');
  try{await handle.truncate(1024*1024+1);}finally{await handle.close();}
  await assert.rejects(()=>validateNovaPngPack(dir),/MOD manifest exceeds size limit/);
 }finally{await rm(dir,{recursive:true,force:true});}
});

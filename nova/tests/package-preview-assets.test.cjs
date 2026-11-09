'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const crypto=require('node:crypto');
const {packagePreviewAssets}=require('../tools/package-preview-assets.cjs');

test('packages relative MOD image sources without changing originals',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'nova-assets-'));
 try{
  const source=path.join(root,'character.png');
  const bytes=Buffer.from('nova-image-fixture');
  fs.writeFileSync(source,bytes);
  const out=path.join(root,'preview');
  const assets=packagePreviewAssets({full_character:'character.png',hat:'character.png',empty:'',clothes:'builtin://base-clothes'},out,{baseDir:root});
  const name=crypto.createHash('sha256').update(bytes).digest('hex').slice(0,16)+'.png';
  assert.equal(assets.full_character,'assets/'+name);
  assert.equal(assets.hat,assets.full_character);
  assert.equal(assets.empty,'');
  assert.equal(assets.clothes,'builtin://base-clothes');
  assert.deepEqual(fs.readFileSync(path.join(out,assets.full_character)),bytes);
  assert.deepEqual(fs.readFileSync(source),bytes);
  assert.deepEqual(fs.readdirSync(path.join(out,'assets')),[name]);
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});

test('rejects invalid sources and preserves remote/data references',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'nova-assets-'));
 try{
  fs.writeFileSync(path.join(root,'invalid.txt'),'text');
  const out=path.join(root,'preview');
  assert.throws(()=>packagePreviewAssets([],out,{baseDir:root}),TypeError);
  assert.throws(()=>packagePreviewAssets({hat:'invalid.txt'},out,{baseDir:root}),/Unsupported image format/);
  assert.throws(()=>packagePreviewAssets({hat:'file:\/\/\/tmp\/hat.png'},out,{baseDir:root}),/Unsupported asset URL scheme/);
  assert.throws(()=>packagePreviewAssets({hat:'missing.png'},out,{baseDir:root}),/ENOENT/);
  const refs=packagePreviewAssets({hat:'https://example.com/hat.png',face:'data:image/png;base64,AAAA'},out,{baseDir:root});
  assert.equal(refs.hat,'https://example.com/hat.png');
  assert.equal(refs.face,'data:image/png;base64,AAAA');
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});

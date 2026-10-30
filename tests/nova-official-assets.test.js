import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {readNovaParts, parseNovaZip, installOfficialNova, OFFICIAL_ZIP_SHA256} from '../nova-official-installer.js';

const root=path.dirname(path.dirname(fileURLToPath(import.meta.url)));
test('real official NOVA asset archive exists inside the Git checkout and verifies SHA-256',()=>{
 const bytes=readNovaParts(root);
 assert.ok(bytes&&bytes.length>1_000_000,'Actual images must be stored in Git, not only a manifest');
 assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),OFFICIAL_ZIP_SHA256);
});
test('official work/typing has 12 distinct PNG frames for Q and mature at 12fps',()=>{
 const {entries,manifest}=parseNovaZip(readNovaParts(root));
 const files=new Map(entries.map(e=>[e.name,e.data]));
 assert.equal(entries.length,96);
 for(const style of ['chibi','mature']){
  const c=manifest.characters[style],anim=c.animations.working;
  assert.equal(anim.frames.length,12);
  assert.equal(anim.fps,12);
  const hashes=anim.frames.map(f=>{
   const bytes=files.get(c.root+'/'+f);
   assert.ok(bytes&&bytes.subarray(0,8).equals(Buffer.from('89504e470d0a1a0a','hex')));
   return crypto.createHash('sha256').update(bytes).digest('hex');
  });
  assert.equal(new Set(hashes).size,12,style+' contains duplicated static frames');
  assert.ok(c.animations.idle.frames.length>=8,'Idle must also animate');
 }
 const q=manifest.characters.chibi.animations;
 assert.equal(q.walk.frames.length,8);
 assert.equal(q.run.frames.length,8);
 assert.equal(q.jump.frames.length,6);
});
test('both untouched user-provided source pictures are preserved in Git as a checked original archive',()=>{
 const source=readNovaParts(root,{
  subdir:'source',prefix:'NOVA_official_source_v0.2.zip.part',
  expectedSha256:'23f9fe676e9eabed1cdf9122dcf5ff38e49afc3b66bae4f265662e9bc15debf7'
 });
 assert.ok(source&&source.length>6_000_000);
 assert.equal(crypto.createHash('sha256').update(source).digest('hex'),'23f9fe676e9eabed1cdf9122dcf5ff38e49afc3b66bae4f265662e9bc15debf7');
});
test('install actual artwork and skip re-extraction when already verified',()=>{
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),'nova-real-assets-'));
 try{
  const data=readNovaParts(root);
  const first=installOfficialNova(temp,{archive:data});
  assert.equal(first.installed,true);
  assert.equal(first.files,96);
  const frame=path.join(temp,'public/assets/nova-official/characters/chibi/sprites/typing_11.png');
  assert.ok(fs.existsSync(frame));
  const second=installOfficialNova(temp,{archive:data});
  assert.equal(second.cached,true);
 }finally{fs.rmSync(temp,{recursive:true,force:true});}
});
test('tampered compressed animation data must fail verification before extraction',()=>{
 const z=Buffer.from(readNovaParts(root));
 // Flip a byte at the beginning of the first compressed file.
 const nameLen=z.readUInt16LE(26),extra=z.readUInt16LE(28);
 z[30+nameLen+extra+8]^=0xff;
 assert.throws(()=>parseNovaZip(z));
});

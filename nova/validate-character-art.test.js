import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,symlinkSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {deflateSync} from 'node:zlib';
import {transparentPng} from './generate-mod-blank-templates.js';
import {pngHasVisiblePixels,validateNovaOutfit} from './validate-character-art.js';

function withCharacter(fn) {
  const root=mkdtempSync(join(tmpdir(),'nova-art-gate-'));
  mkdirSync(join(root,'art'));
  const outfit={safeOutfit:{top:{src:'art/top.png'},bottom:{src:'art/bottom.png'}}};
  const json=join(root,'character.json');
  const save=()=>writeFileSync(json,JSON.stringify(outfit));
  try {return fn({root,json,outfit,save});}
  finally {rmSync(root,{recursive:true,force:true});}
}
function rgbaPng(alpha) {
  const png=Buffer.from(transparentPng(1,1));
  // Rebuild IDAT without dependencies; chunk CRC is not checked by the art gate.
  const raw=Buffer.from([0,42,42,42,alpha]);
  const idat=deflateSync(raw);
  const ihdr=png.subarray(8,33);
  const chunk=(type,data)=>{
    const len=Buffer.alloc(4);len.writeUInt32BE(data.length);
    return Buffer.concat([len,Buffer.from(type),data,Buffer.alloc(4)]);
  };
  return Buffer.concat([png.subarray(0,8),ihdr,chunk('IDAT',idat),chunk('IEND',Buffer.alloc(0))]);
}
test('blank template is not finished artwork',()=>{
  assert.equal(pngHasVisiblePixels(transparentPng(2,2)),false);
  assert.equal(pngHasVisiblePixels(rgbaPng(255)),true);
  assert.equal(pngHasVisiblePixels(rgbaPng(0)),false);
});
test('both fallback clothing slots require visible pixels',()=>withCharacter(({root,json,save})=>{
  writeFileSync(join(root,'art/top.png'),rgbaPng(255));
  writeFileSync(join(root,'art/bottom.png'),transparentPng(1,1));
  save();
  assert.deepEqual(validateNovaOutfit(json),{ok:false,issues:['bottom: fully transparent fallback']});
  writeFileSync(join(root,'art/bottom.png'),rgbaPng(255));
  assert.deepEqual(validateNovaOutfit(json),{ok:true,issues:[]});
}));
test('missing and escaped clothing paths are rejected',()=>withCharacter(({root,json,outfit,save})=>{
  outfit.safeOutfit.top.src='../outside.png';
  outfit.safeOutfit.bottom.src='art/missing.png';
  save();
  const result=validateNovaOutfit(json);
  assert.equal(result.ok,false);
  assert.match(result.issues[0],/path escapes/);
  assert.match(result.issues[1],/ENOENT/);
}));
test('invalid PNG is rejected rather than counted as clothing',()=>withCharacter(({root,json,save})=>{
  writeFileSync(join(root,'art/top.png'),Buffer.from('not a png'));
  writeFileSync(join(root,'art/bottom.png'),rgbaPng(255));
  save();
  const result=validateNovaOutfit(json);
  assert.equal(result.ok,false);
  assert.match(result.issues[0],/Invalid PNG signature/);
}));

test('outfit symlink cannot escape character root',()=>withCharacter(({root,json,save})=>{
  const outside=mkdtempSync(join(tmpdir(),'nova-outside-'));
  try {
    writeFileSync(join(outside,'top.png'),rgbaPng(255));
    symlinkSync(join(outside,'top.png'),join(root,'art/top.png'));
    writeFileSync(join(root,'art/bottom.png'),rgbaPng(255));
    save();
    const result=validateNovaOutfit(json);
    assert.equal(result.ok,false);
    assert.match(result.issues.join(' '),/symlink path escapes/);
  } finally {rmSync(outside,{recursive:true,force:true});}
}));

test('oversized artwork and oversized PNG chunks are rejected',()=>{
  const huge=Buffer.alloc(16*1024*1024+1);
  Buffer.from([137,80,78,71,13,10,26,10]).copy(huge);
  assert.throws(()=>pngHasVisiblePixels(huge),/exceeds 16 MiB/);
  const oversizedChunk=Buffer.from(transparentPng(1,1));
  // First chunk length is IHDR; reject before reading any chunk payload.
  oversizedChunk.writeUInt32BE(8*1024*1024+1,8);
  assert.throws(()=>pngHasVisiblePixels(oversizedChunk),/chunk exceeds 8 MiB/);
});

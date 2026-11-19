import test from 'node:test';
import assert from 'node:assert/strict';
import {validateNovaPngChunks} from './nova-png-chunk-validator.js';

const table = Array.from({length:256}, (_,n) => {
  for(let i=0;i<8;i++) n=n&1 ? 0xedb88320^(n>>>1) : n>>>1;
  return n>>>0;
});
function chunk(type, data=[]) {
  const b=Buffer.alloc(data.length+12);
  b.writeUInt32BE(data.length,0);
  b.write(type,4,4,'ascii');
  Buffer.from(data).copy(b,8);
  let crc=0xffffffff;
  for(let i=4;i<b.length-4;i++) crc=table[(crc^b[i])&255]^(crc>>>8);
  b.writeUInt32BE((crc^0xffffffff)>>>0,b.length-4);
  return b;
}
const ihdr=()=>chunk('IHDR',[0,0,0,1,0,0,0,1,8,6,0,0,0]);
const png=(...parts)=>Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),ihdr(),...parts,chunk('IEND')]);
const idat=()=>chunk('IDAT',[1,2,3]);

test('valid palette before image data is accepted structurally',()=>{
  const result=validateNovaPngChunks(png(chunk('PLTE',[0,0,0]),idat()));
  assert.equal(result.crcValid,true);
});
test('palette after IDAT is rejected',()=>{
  assert.throws(()=>validateNovaPngChunks(png(idat(),chunk('PLTE',[0,0,0]))),/PLTE must precede IDAT/);
});
test('duplicate palette is rejected',()=>{
  assert.throws(()=>validateNovaPngChunks(png(chunk('PLTE',[0,0,0]),chunk('PLTE',[1,1,1]),idat())),/Duplicate PNG PLTE/);
});
test('malformed palette lengths are rejected',()=>{
  for(const bytes of [[],[1],[1,2],[1,2,3,4]]) {
    assert.throws(()=>validateNovaPngChunks(png(chunk('PLTE',bytes),idat())),/Invalid PNG PLTE length/);
  }
});

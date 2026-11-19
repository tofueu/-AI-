import test from 'node:test';
import assert from 'node:assert/strict';
import {validateNovaPngChunks} from './nova-png-chunk-validator.js';
const table=Array.from({length:256},(_,n)=>{for(let i=0;i<8;i++)n=n&1?0xedb88320^(n>>>1):n>>>1;return n>>>0;});
function crc(b){let c=0xffffffff;for(const x of b)c=table[(c^x)&255]^(c>>>8);return (c^0xffffffff)>>>0;}
function chunk(type,data=[]){const t=Buffer.from(type),d=Buffer.from(data),b=Buffer.alloc(12+d.length);b.writeUInt32BE(d.length,0);t.copy(b,4);d.copy(b,8);b.writeUInt32BE(crc(Buffer.concat([t,d])),8+d.length);return b;}
const ihdr=chunk('IHDR',[0,0,0,1,0,0,0,1,8,6,0,0,0]);
const png=(...chunks)=>Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),...chunks]);
const idat=chunk('IDAT',[1,2,3]),iend=chunk('IEND');
test('accepts structurally valid chunks',()=>assert.deepEqual(validateNovaPngChunks(png(ihdr,idat,iend)),{chunkCount:3,idatChunks:1,crcValid:true}));
test('rejects corrupted CRC',()=>{const b=png(ihdr,idat,iend);b[45]^=1;assert.throws(()=>validateNovaPngChunks(b),/CRC mismatch/);});
test('rejects missing IEND',()=>assert.throws(()=>validateNovaPngChunks(png(ihdr,idat)),/IEND/));
test('rejects trailing bytes',()=>assert.throws(()=>validateNovaPngChunks(Buffer.concat([png(ihdr,idat,iend),Buffer.from([0])])),/Trailing/));
test('rejects truncated chunk',()=>assert.throws(()=>validateNovaPngChunks(png(ihdr,idat,iend).subarray(0,48)),/Truncated|IEND/));
test('rejects duplicate IHDR',()=>assert.throws(()=>validateNovaPngChunks(png(ihdr,ihdr,idat,iend)),/Duplicate/));
test('rejects missing IDAT',()=>assert.throws(()=>validateNovaPngChunks(png(ihdr,iend)),/IEND/));
test('rejects unknown critical chunk',()=>assert.throws(()=>validateNovaPngChunks(png(ihdr,chunk('ABCD'),idat,iend)),/critical/));
test('rejects nonconsecutive IDAT',()=>assert.throws(()=>validateNovaPngChunks(png(ihdr,idat,chunk('tEXt'),idat,iend)),/Nonconsecutive/));

test('rejects zero dimensions',()=>assert.throws(()=>validateNovaPngChunks(png(chunk('IHDR',[0,0,0,0,0,0,0,1,8,6,0,0,0]),idat,iend)),/dimensions/));
test('rejects unsupported color-depth combinations',()=>assert.throws(()=>validateNovaPngChunks(png(chunk('IHDR',[0,0,0,1,0,0,0,1,4,6,0,0,0]),idat,iend)),/color type/));
test('rejects unsupported compression',()=>assert.throws(()=>validateNovaPngChunks(png(chunk('IHDR',[0,0,0,1,0,0,0,1,8,6,1,0,0]),idat,iend)),/compression/));
test('requires palette for indexed PNG',()=>assert.throws(()=>validateNovaPngChunks(png(chunk('IHDR',[0,0,0,1,0,0,0,1,8,3,0,0,0]),idat,iend)),/requires PLTE/));
test('rejects grayscale palettes',()=>assert.throws(()=>validateNovaPngChunks(png(chunk('IHDR',[0,0,0,1,0,0,0,1,8,0,0,0,0]),chunk('PLTE',[0,0,0]),idat,iend)),/forbidden/));
test('rejects oversized indexed palette',()=>assert.throws(()=>validateNovaPngChunks(png(chunk('IHDR',[0,0,0,1,0,0,0,1,1,3,0,0,0]),chunk('PLTE',[0,0,0,1,1,1,2,2,2]),idat,iend)),/palette capacity/));

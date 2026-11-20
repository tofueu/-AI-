import test from 'node:test';
import assert from 'node:assert/strict';
import {validateNovaPng} from './nova-png-validation.js';
const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGP4////fwAJ+wP9KobjigAAAABJRU5ErkJggg==','base64');
function crc32(bytes){let c=0xffffffff;for(const b of bytes){c^=b;for(let i=0;i<8;i++)c=(c>>>1)^((c&1)?0xedb88320:0);}return (c^0xffffffff)>>>0;}
function chunk(type,data=Buffer.alloc(0)){const name=Buffer.from(type);const result=Buffer.alloc(12+data.length);result.writeUInt32BE(data.length,0);name.copy(result,4);data.copy(result,8);result.writeUInt32BE(crc32(result.subarray(4,8+data.length)),8+data.length);return result;}
const signature=png.subarray(0,8),ihdr=png.subarray(8,33),idat=png.subarray(33,png.length-12),iend=png.subarray(png.length-12);
test('valid PNG dimensions',()=>assert.deepEqual(validateNovaPng(png),{width:1,height:1}));
test('truncated PNG rejected',()=>assert.throws(()=>validateNovaPng(png.subarray(0,24)),/Invalid PNG/));
test('corrupt chunk CRC rejected',()=>{const corrupt=Buffer.from(png);corrupt[29]^=1;assert.throws(()=>validateNovaPng(corrupt),/CRC/);});
test('trailing bytes rejected',()=>assert.throws(()=>validateNovaPng(Buffer.concat([png,Buffer.from([1])])),/ending/));
test('non PNG rejected',()=>assert.throws(()=>validateNovaPng(Buffer.from('invalid')),/Invalid PNG/));
test('missing IDAT rejected',()=>assert.throws(()=>validateNovaPng(Buffer.concat([signature,ihdr,iend])),/ending/));
test('duplicate IHDR rejected',()=>assert.throws(()=>validateNovaPng(Buffer.concat([signature,ihdr,ihdr,idat,iend])),/IHDR/));
test('unsupported critical chunk rejected',()=>assert.throws(()=>validateNovaPng(Buffer.concat([signature,ihdr,chunk('ABCD'),idat,iend])),/Unsupported/));
test('noncontiguous IDAT rejected',()=>assert.throws(()=>validateNovaPng(Buffer.concat([signature,ihdr,idat,chunk('tEXt'),idat,iend])),/IDAT/));
test('invalid bit depth rejected even with correct CRC',()=>{const data=Buffer.from(ihdr.subarray(8,21));data[8]=4;assert.throws(()=>validateNovaPng(Buffer.concat([signature,chunk('IHDR',data),idat,iend])),/IHDR/);});

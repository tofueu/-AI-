import test from 'node:test';
import assert from 'node:assert/strict';
import {deflateSync} from 'node:zlib';
import {validateNovaPng,validateNovaModAssets} from './mod-png-validation.js';
const sig=Buffer.from([137,80,78,71,13,10,26,10]);
function crc32(bytes){
  let crc=0xffffffff;
  for(const b of bytes){crc^=b;for(let k=0;k<8;k++)crc=(crc>>>1)^((crc&1)?0xedb88320:0);}
  return (crc^0xffffffff)>>>0;
}
function chunk(type,data=Buffer.alloc(0)){
  const name=Buffer.from(type),size=Buffer.alloc(4),crc=Buffer.alloc(4);
  size.writeUInt32BE(data.length);crc.writeUInt32BE(crc32(Buffer.concat([name,data])));
  return Buffer.concat([size,name,data,crc]);
}
function png({width=2,height=2,color=6}={}){
  const ihdr=Buffer.alloc(13);
  ihdr.writeUInt32BE(width,0);ihdr.writeUInt32BE(height,4);ihdr[8]=8;ihdr[9]=color;
  const channels=color===6?4:3;
  const raw=Buffer.alloc(height*(1+width*channels));
  return Buffer.concat([sig,chunk('IHDR',ihdr),chunk('IDAT',deflateSync(raw)),chunk('IEND')]);
}
test('accepts complete RGBA PNG and reports dimensions',()=>{
  const b=png();
  assert.deepEqual(validateNovaPng(b),{width:2,height:2,bitDepth:8,colorType:6,bytes:b.length});
});
test('rejects RGB, bad signature, oversized dimensions',()=>{
  assert.throws(()=>validateNovaPng(png({color:2})),/alpha channel/);
  const bad=png();bad[0]=0;
  assert.throws(()=>validateNovaPng(bad),/signature/);
  assert.throws(()=>validateNovaPng(png({width:5000})),/dimensions/);
});
test('rejects missing IDAT, missing IEND, corrupt CRC and trailing bytes',()=>{
  const good=png(),ihdrEnd=8+25;
  assert.throws(()=>validateNovaPng(Buffer.concat([good.subarray(0,ihdrEnd),chunk('IEND')])),/IEND/);
  assert.throws(()=>validateNovaPng(good.subarray(0,-12)),/Incomplete PNG/);
  const corrupt=Buffer.from(good);corrupt[20]^=1;
  assert.throws(()=>validateNovaPng(corrupt),/CRC/);
  assert.throws(()=>validateNovaPng(Buffer.concat([good,Buffer.from([0])])),/IEND/);
});
test('validates visible MOD assets and skips hidden slots',async()=>{
  const manifest={slots:[{slot:'hat',filename:'hat.png',hidden:false},{slot:'eyes',filename:'eyes.png',hidden:true}]};
  const names=[];
  const result=await validateNovaModAssets(manifest,async filename=>{names.push(filename);return png();});
  assert.deepEqual(names,['hat.png']);
  assert.equal(result[0].slot,'hat');
});
test('rejects path traversal and duplicate filenames',async()=>{
  await assert.rejects(()=>validateNovaModAssets({slots:[{filename:'../x.png'}]},async()=>png()),/path/);
  await assert.rejects(()=>validateNovaModAssets({slots:[{filename:'hat.png'},{filename:'hat.png'}]},async()=>png()),/Duplicate/);
});

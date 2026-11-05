import test from 'node:test';
import assert from 'node:assert/strict';
import {validateNovaPng,validateNovaModAssets} from './mod-png-validation.js';
function png({width=64,height=128,color=6}={}) {
  const b=new Uint8Array(33);
  b.set([137,80,78,71,13,10,26,10,0,0,0,13,73,72,68,82]);
  const put=(i,n)=>{b[i]=n>>>24;b[i+1]=(n>>>16)&255;b[i+2]=(n>>>8)&255;b[i+3]=n&255;};
  put(16,width);put(20,height);b[24]=8;b[25]=color;
  return b;
}
test('accepts RGBA IHDR and returns dimensions',()=>{
  assert.deepEqual(validateNovaPng(png()),{width:64,height:128,bitDepth:8,colorType:6,bytes:33});
});
test('rejects RGB, bad signature and oversized images',()=>{
  assert.throws(()=>validateNovaPng(png({color:2})),/alpha channel/);
  const bad=png();bad[0]=0;
  assert.throws(()=>validateNovaPng(bad),/signature/);
  assert.throws(()=>validateNovaPng(png({width:5000})),/dimensions/);
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

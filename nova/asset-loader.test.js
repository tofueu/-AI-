import test from 'node:test';
import assert from 'node:assert/strict';
import {loadNovaFrameImages} from './asset-loader.js';
for (const variant of ['chibi','adult']) {
  test(`${variant}: decode distinct PNGs once and preserve original source keys`, async()=>{
    const calls=[];
    const frame={variant,commands:[{src:'body.png'},{src:'hat/blue.png'},{src:'body.png'}]};
    const images=await loadNovaFrameImages(frame,{resolvePath:p=>'assets/'+variant+'/'+p,decode:async (url,src)=>{calls.push([url,src]);return {url};}});
    assert.equal(Object.getPrototypeOf(images),null);
    assert.deepEqual(Object.keys(images),['body.png','hat/blue.png']);
    assert.deepEqual(calls.map(x=>x[0]),['assets/'+variant+'/body.png','assets/'+variant+'/hat/blue.png']);
  });
}
test('empty visible frame needs no assets',async()=>{
  const images=await loadNovaFrameImages({commands:[]},{decode:async()=>{throw Error('should not run');}});
  assert.deepEqual(Object.keys(images),[]);
});
test('reject unsafe paths before decoding anything',async()=>{
  for(const src of ['../x.png','https://x/y.png','/root.png','a\\b.png','x.png?query','x.svg','a//b.png','./x.png']) {
    let called=false;
    await assert.rejects(loadNovaFrameImages({commands:[{src:'ok.png'},{src}]},{decode:async()=>{called=true;return {};}}),/Unsafe NOVA PNG source/);
    assert.equal(called,false,src);
  }
});
test('reject failed decode without returning partially populated images',async()=>{
  await assert.rejects(loadNovaFrameImages({commands:[{src:'a.png'},{src:'b.png'}]},{decode:async(_url,src)=>src==='b.png'?null:{}}),/Failed to decode/);
});
test('reject invalid loader and invalid resolution',async()=>{
  await assert.rejects(loadNovaFrameImages(null,{decode:async()=>({})}),/Invalid NOVA/);
  await assert.rejects(loadNovaFrameImages({commands:[{src:'a.png'}]},{decode:async()=>({}),resolvePath:()=>null}),/Unresolved NOVA PNG/);
});

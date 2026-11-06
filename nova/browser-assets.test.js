import test from 'node:test';
import assert from 'node:assert/strict';
import {loadNovaBrowserImages,createNovaBrowserDecoder} from './browser-assets.js';
class ImageOK {
  static requested=[];
  set src(value){ this.url=value; ImageOK.requested.push(value); queueMicrotask(()=>this.onload?.()); }
}
class ImageFail {
  set src(value){ queueMicrotask(()=>this.onerror?.(new Error(value))); }
}
test('loads distinct frame PNGs once and keys by source',async()=>{
  ImageOK.requested=[];
  const images=await loadNovaBrowserImages({commands:[{src:'body.png'},{src:'hat/hat.png'},{src:'body.png'}]}, {assetBase:'/nova/chibi',ImageClass:ImageOK});
  assert.deepEqual(ImageOK.requested,['/nova/chibi/body.png','/nova/chibi/hat/hat.png']);
  assert.deepEqual(Object.keys(images),['body.png','hat/hat.png']);
  assert.equal(images['body.png'].url,'/nova/chibi/body.png');
});
test('unsafe path rejected before loading images',async()=>{
  ImageOK.requested=[];
  await assert.rejects(loadNovaBrowserImages({commands:[{src:'ok.png'},{src:'../bad.png'}]}, {ImageClass:ImageOK}),/Unsafe NOVA PNG source/);
  assert.equal(ImageOK.requested.length,0);
});
test('broken PNG rejects instead of hanging',async()=>{
  await assert.rejects(loadNovaBrowserImages({commands:[{src:'broken.png'}]},{ImageClass:ImageFail}),/NOVA PNG failed to load/);
});
test('missing browser Image constructor fails clearly',()=>{
  assert.throws(()=>createNovaBrowserDecoder({ImageClass:null}),/constructor unavailable/);
});
test('invalid base rejected',async()=>{
  await assert.rejects(loadNovaBrowserImages({commands:[]},{assetBase:'/nova?token=1',ImageClass:ImageOK}),/Invalid NOVA asset base/);
});
test('supports crossOrigin without modifying caller frame',async()=>{
  const frame={commands:[{src:'body.png'}]};
  const images=await loadNovaBrowserImages(frame,{ImageClass:ImageOK,crossOrigin:'anonymous'});
  assert.equal(images['body.png'].crossOrigin,'anonymous');
  assert.deepEqual(frame,{commands:[{src:'body.png'}]});
});

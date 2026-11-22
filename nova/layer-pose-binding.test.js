import test from 'node:test';
import assert from 'node:assert/strict';
import {bindPoseToLayers,bindAnimationToLayers} from './layer-pose-binding.js';
import {buildAnimationFrames} from './animation-frames.js';

for (const variant of ['chibi','adult']) {
  test(variant+': binds joint motion to MOD layers without changing assets',()=>{
    const layers=[{slot:'hair_front',src:'mod/hair.png',pivot:{x:12,y:8}},{slot:'top',src:'safe/top.png'}];
    const before=JSON.stringify(layers);
    const out=bindPoseToLayers({variant,layers,joints:{hair_front:'head'},pose:{head:{rotation:30,x:4}}});
    assert.equal(out[0].transform.rotation,30);
    assert.equal(out[0].transform.x,4);
    assert.equal(out[0].joint,'head');
    assert.deepEqual(out[0].pivot,{x:12,y:8});
    assert.equal(out[1].transform.rotation,0);
    assert.equal(out[1].transform.scaleX,1);
    assert.equal(JSON.stringify(layers),before);
  });
  test(variant+': samples animated head motion for each rendered frame',()=>{
    const clip={variant,durationMs:1000,loop:true,frames:[
      {at:0,pose:{head:{rotation:0}}},
      {at:0.5,pose:{head:{rotation:90}}},
      {at:1,pose:{head:{rotation:0}}}
    ]};
    const sampled=buildAnimationFrames(clip,{fps:4});
    const bound=bindAnimationToLayers({variant,layers:[{slot:'hair_front',src:'mod/hair.png'}],frames:sampled.frames,joints:{hair_front:'head'}});
    assert.deepEqual(bound.map(frame=>frame.layers[0].transform.rotation),[0,45,90,45]);
    assert.deepEqual(bound.map(frame=>frame.timeMs),[0,250,500,750]);
  });
}
test('rejects duplicate slots, invalid assets and nonfinite pivots',()=>{
  const layer={slot:'head',src:'head.png'};
  assert.throws(()=>bindPoseToLayers({variant:'chibi',layers:[layer,layer]}),/duplicate/);
  assert.throws(()=>bindPoseToLayers({variant:'adult',layers:[{slot:'head',src:''}]}),/source/);
  assert.throws(()=>bindPoseToLayers({variant:'adult',layers:[{...layer,pivot:{x:Infinity}}]}),/pivot/);
});
test('rejects invalid animation frames',()=>{
  assert.throws(()=>bindAnimationToLayers({variant:'chibi',layers:[],frames:[]}),/frames/);
  assert.throws(()=>bindAnimationToLayers({variant:'chibi',layers:[],frames:[{timeMs:NaN,pose:{}}]}),/time/);
});

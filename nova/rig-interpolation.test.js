import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizePose,interpolatePose,sampleAnimation} from './rig-interpolation.js';
for (const variant of ['chibi','adult']) {
  test(variant+': smooth loop and clamped end without mutating frames',()=>{
    const animation={variant,durationMs:1000,frames:[
      {at:0,pose:{arm_l:{rotation:0,x:0}}},
      {at:0.5,pose:{arm_l:{rotation:90,x:20}}},
      {at:1,pose:{arm_l:{rotation:0,x:0}}}
    ]};
    const original=JSON.stringify(animation);
    assert.equal(sampleAnimation(animation,250).arm_l.rotation,45);
    assert.equal(sampleAnimation(animation,250).arm_l.x,10);
    assert.equal(sampleAnimation(animation,1250).arm_l.rotation,45);
    assert.equal(sampleAnimation({...animation,loop:false},1000).arm_l.rotation,0);
    assert.equal(JSON.stringify(animation),original);
  });
}
test('shortest-path rotation avoids a full spin',()=>{
  assert.equal(interpolatePose({head:{rotation:170}},{head:{rotation:-170}},0.5).head.rotation,180);
});
test('missing joints interpolate from neutral pose',()=>{
  assert.equal(interpolatePose({},{hair:{x:20}},0.5).hair.x,10);
  assert.equal(normalizePose({body:{}}).body.scaleX,1);
});
test('invalid transforms and duplicate frame times fail closed',()=>{
  assert.throws(()=>normalizePose({head:{rotation:Infinity}}),/Nonfinite/);
  assert.throws(()=>normalizePose({head:{opacity:0}}),/Unknown channel/);
  assert.throws(()=>sampleAnimation({variant:'adult',durationMs:100,frames:[{at:0,pose:{}},{at:0,pose:{}}]},0),/Timeline/);
});

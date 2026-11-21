import test from 'node:test';
import assert from 'node:assert/strict';
import {buildAnimationFrames} from './animation-frames.js';
const clip = variant => ({variant,durationMs:1000,loop:true,frames:[
  {at:0,pose:{arm_l:{rotation:0}}},
  {at:0.5,pose:{arm_l:{rotation:90}}},
  {at:1,pose:{arm_l:{rotation:0}}}
]});
for (const variant of ['chibi','adult']) {
  test(`${variant}: deterministic looping poses and no duplicate terminal frame`,()=>{
    const source=clip(variant), before=JSON.stringify(source);
    const result=buildAnimationFrames(source,{fps:4});
    assert.equal(result.frames.length,4);
    assert.deepEqual(result.frames.map(f=>f.pose.arm_l.rotation),[0,45,90,45]);
    assert.deepEqual(result.frames.map(f=>f.timeMs),[0,250,500,750]);
    assert.equal(JSON.stringify(source),before);
  });
  test(`${variant}: optional endpoint supports non-looped exports`,()=>{
    const result=buildAnimationFrames(clip(variant),{fps:4,includeEndpoint:true});
    assert.equal(result.frames.length,5);
    assert.equal(result.frames[4].timeMs,1000);
    assert.equal(result.frames[4].pose.arm_l.rotation,0);
  });
}
test('rejects invalid FPS and excessive allocations',()=>{
  assert.throws(()=>buildAnimationFrames(clip('chibi'),{fps:0}),/FPS/);
  assert.throws(()=>buildAnimationFrames(clip('chibi'),{fps:121}),/FPS/);
  assert.throws(()=>buildAnimationFrames({...clip('adult'),durationMs:1000000},{fps:120}),/Frame count/);
  assert.throws(()=>buildAnimationFrames(clip('adult'),{includeEndpoint:1}),/endpoint/);
});

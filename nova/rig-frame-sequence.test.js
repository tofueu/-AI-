import test from 'node:test';
import assert from 'node:assert/strict';
import { buildRigFrameSequence } from './rig-frame-sequence.js';
const clip = variant => ({variant, frames:[
  {time:0,pose:{head:{x:0,y:0,rotation:0}}},
  {time:0.25,pose:{head:{x:0,y:-2,rotation:3}}},
  {time:0.5,pose:{head:{x:0,y:0,rotation:0}}}
]});
for (const variant of ['chibi','adult']) {
  test(`${variant}: sequence samples a full seamless cycle without duplicate endpoint`, () => {
    const source=clip(variant), original=structuredClone(source);
    const seq=buildRigFrameSequence(source,{fps:24,cycles:2});
    assert.equal(seq.framesPerCycle,12);
    assert.equal(seq.frames.length,24);
    assert.equal(seq.frameDurationMs,500/12);
    assert.deepEqual(seq.frames[0].pose,seq.frames[12].pose);
    assert.notDeepEqual(seq.frames[0].pose,seq.frames[6].pose);
    assert.deepEqual(source,original);
    seq.frames[0].pose.head.y=100;
    assert.notEqual(seq.frames[12].pose.head.y,100);
  });
}
test('rejects invalid frame rates, cycles and oversized exports',()=>{
  assert.throws(()=>buildRigFrameSequence(clip('chibi'),{fps:0}),RangeError);
  assert.throws(()=>buildRigFrameSequence(clip('chibi'),{fps:24.5}),RangeError);
  assert.throws(()=>buildRigFrameSequence(clip('chibi'),{cycles:0}),RangeError);
  assert.throws(()=>buildRigFrameSequence(clip('chibi'),{cycles:101}),RangeError);
  const long={variant:'adult',frames:[{time:0,pose:{}},{time:120,pose:{}}]};
  assert.throws(()=>buildRigFrameSequence(long,{fps:120,cycles:2}),RangeError);
});

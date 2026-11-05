import test from 'node:test';
import assert from 'node:assert/strict';
import {sampleNovaMotion} from './motion-sampler.js';
for(const variant of ['chibi','adult']) {
  const rig={variant,bones:['head','body'],animations:[{name:'idle',durationMs:1000,loop:true,tracks:[{bone:'head',keyframes:[{timeMs:0,y:0,rotation:0},{timeMs:500,y:10,rotation:20},{timeMs:1000,y:0,rotation:0}]}]}]};
  test(variant+' interpolates and loops motion',()=>{
    assert.equal(sampleNovaMotion(rig,'idle',250).transforms.head.y,5);
    assert.equal(sampleNovaMotion(rig,'idle',750).transforms.head.rotation,10);
    assert.equal(sampleNovaMotion(rig,'idle',1250).transforms.head.y,5);
    assert.deepEqual(sampleNovaMotion(rig,'idle',250).transforms.body,{x:0,y:0,rotation:0,scaleX:1,scaleY:1});
  });
  test(variant+' rejects invalid tracks',()=>{
    const broken=structuredClone(rig);
    broken.animations[0].tracks[0].keyframes[1].timeMs=0;
    assert.throws(()=>sampleNovaMotion(broken,'idle',100),/keyframe time/);
  });
}
test('nonlooping motion holds last pose',()=>{
  const rig={bones:['head'],animations:[{name:'blink',durationMs:100,loop:false,tracks:[{bone:'head',keyframes:[{timeMs:0,scaleY:1},{timeMs:100,scaleY:0.2}]}]}]};
  assert.equal(sampleNovaMotion(rig,'blink',500).transforms.head.scaleY,0.2);
});


test('malformed null motion entries fail with a controlled error',()=>{
 const rig={bones:['body'],animations:[null]};
 assert.throws(()=>sampleNovaMotion(rig,'idle',0),/Invalid motion/);
});
test('malformed null track and keyframe fail with a controlled error',()=>{
 const rig={bones:['body'],animations:[{name:'idle',durationMs:100,tracks:[null]}]};
 assert.throws(()=>sampleNovaMotion(rig,'idle',0),/Invalid track/);
 rig.animations[0].tracks=[{bone:'body',keyframes:[null]}];
 assert.throws(()=>sampleNovaMotion(rig,'idle',0),/Invalid keyframe time/);
});

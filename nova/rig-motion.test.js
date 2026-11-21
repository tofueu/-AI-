import test from 'node:test';
import assert from 'node:assert/strict';
import {sampleNovaMotion} from './rig-motion.js';
const frames=[{atMs:0,pose:{head:{y:0,rotation:0},arm_l:{rotation:0}}},{atMs:1000,pose:{head:{y:10,rotation:20},arm_l:{rotation:90}}}];
for(const variant of ['chibi','adult']){
 test(variant+' interpolates without modifying source',()=>{
  const original=JSON.stringify(frames),result=sampleNovaMotion({variant,frames,timeMs:500});
  assert.equal(result.pose.head.y,5);
  assert.equal(result.pose.arm_l.rotation,45);
  assert.equal(result.pose.head.scaleX,1);
  assert.equal(JSON.stringify(frames),original);
 });
 test(variant+' loops and clamps',()=>{
  assert.equal(sampleNovaMotion({variant,frames,timeMs:1500}).pose.head.y,5);
  assert.equal(sampleNovaMotion({variant,frames,timeMs:1500,loop:false}).pose.head.y,10);
 });
}
test('rejects malformed timelines and joint transforms',()=>{
 assert.throws(()=>sampleNovaMotion({variant:'chibi',frames:[frames[1],frames[0]],timeMs:0}),/Invalid motion frame/);
 assert.throws(()=>sampleNovaMotion({variant:'adult',frames:[{atMs:0,pose:{unknown:{x:1}}}],timeMs:0}),/Invalid joint/);
 assert.throws(()=>sampleNovaMotion({variant:'adult',frames:[{atMs:0,pose:{head:{scaleX:0}}}],timeMs:0}),/Invalid transform/);
});

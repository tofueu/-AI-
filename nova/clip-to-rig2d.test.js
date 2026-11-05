import test from 'node:test';
import assert from 'node:assert/strict';
import {makeAdultClip} from './adult-clip-adapter.js';
import {clipToRig2dAction} from './clip-to-rig2d.js';
import {sampleRig,composeRigWorld} from './rig2d.js';

test('adult motions drive 2D rig with finite world transforms',()=>{
 for(const action of ['idle','walk','run','typing','cry','sleep']){
  const clip=makeAdultClip(action,{duration:1,fps:12});
  const converted=clipToRig2dAction(clip);
  assert.equal(converted.duration,1000);
  assert.equal(converted.keyframes.length,13);
  const local=sampleRig({variant:'adult',bones:{}},converted,250);
  const world=composeRigWorld(local);
  assert.ok(Object.values(world).every(b=>['x','y','rotation','scaleX','scaleY'].every(k=>Number.isFinite(b[k]))));
  assert.equal(local.upper_arm_l.rotation,clip.frames[3].pose.shoulder_l.rotation);
 }
});
test('bridge preserves authored bone anchors and allows non-looping playback',()=>{
 const clip=makeAdultClip('walk',{duration:1,fps:4});
 const action=clipToRig2dAction(clip,{loop:false});
 const rig={variant:'adult',bones:{upper_arm_l:{x:17,y:23}}};
 const pose=sampleRig(rig,action,250);
 assert.equal(pose.upper_arm_l.x,17);
 assert.equal(pose.upper_arm_l.y,23);
 assert.equal(action.loop,false);
 assert.throws(()=>clipToRig2dAction(clip,{loop:'no'}));
});

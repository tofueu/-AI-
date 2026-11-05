import test from 'node:test';
import assert from 'node:assert/strict';
import {ADULT_ACTIONS,sampleAdultPose} from './adult-rig.js';
import {RIG_JOINTS,sampleClip,validateClip} from './rig-animation.js';
import {adultPoseToRig,makeAdultClip} from './adult-clip-adapter.js';

test('all adult actions produce valid canonical clips with complete joints',()=>{
 for(const action of ADULT_ACTIONS){
  const clip=makeAdultClip(action,{duration:1,fps:24});
  assert.equal(validateClip(clip),clip);
  assert.equal(clip.frames.length,25);
  assert.equal(clip.frames.at(-1).time,1);
  assert.deepEqual(Object.keys(clip.frames[0].pose),RIG_JOINTS);
  assert.ok(clip.frames.every(f=>Object.values(f.pose).every(
   p=>Object.values(p).every(Number.isFinite))));
  assert.notDeepEqual(clip.frames[0].pose,clip.frames[6].pose);
  assert.ok(Number.isFinite(sampleClip(clip,.125).pose.head.rotation));
 }
});
test('adult shoulder, hip and root offsets map to renderer slots',()=>{
 const source=sampleAdultPose('walk',.125);
 const mapped=adultPoseToRig(source);
 assert.equal(mapped.shoulder_l.rotation,source.angles.left_shoulder);
 assert.equal(mapped.hip_r.rotation,source.angles.right_hip);
 assert.equal(mapped.root.y,source.offsets.root.y);
});
test('reject invalid poses and frame settings',()=>{
 assert.throws(()=>adultPoseToRig({}));
 assert.throws(()=>makeAdultClip('unknown'));
 assert.throws(()=>makeAdultClip('idle',{fps:0}));
 assert.throws(()=>makeAdultClip('idle',{duration:Infinity}));
});

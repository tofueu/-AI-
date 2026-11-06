import test from 'node:test';
import assert from 'node:assert/strict';
import {createNovaDemoRig,addNovaRestPose} from './demo-rigs.js';
import {sampleNovaMotion} from './motion-sampler.js';
import {composeNovaPose} from './pose-composer.js';
for(const variant of ['chibi','adult']){
 test(`${variant} demonstration rig composes idle, wave and walk at all key times`,()=>{
  const rig=createNovaDemoRig(variant);
  for(const motion of ['idle','wave','walk'])for(const ms of [0,125,500,900,1200]){
   const sample=addNovaRestPose(rig,sampleNovaMotion(rig,motion,ms));
   const pose=composeNovaPose(rig,sample);
   assert.equal(Object.keys(pose.matrices).length,rig.bones.length);
   for(const matrix of Object.values(pose.matrices))assert.ok(matrix.every(Number.isFinite));
  }
 });
 test(`${variant} demo animation moves joints and does not mutate source`,()=>{
  const rig=createNovaDemoRig(variant),before=JSON.stringify(rig);
  const pose=t=>composeNovaPose(rig,addNovaRestPose(rig,sampleNovaMotion(rig,'wave',t)));
  assert.notDeepEqual(pose(0).matrices.forearm_r,pose(250).matrices.forearm_r);
  assert.equal(JSON.stringify(rig),before);
 });
}
test('unknown variant rejected',()=>assert.throws(()=>createNovaDemoRig('other'),/Unknown/));

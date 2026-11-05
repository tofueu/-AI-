import test from 'node:test';
import assert from 'node:assert/strict';
import {ADULT_JOINTS,ADULT_ACTIONS,sampleAdultPose,sampleAdultFrames} from './adult-rig.js';
test('16 articulated descendants plus root and valid hierarchy',()=>{
 assert.equal(Object.keys(ADULT_JOINTS).length,17);
 for(const [name,parent] of Object.entries(ADULT_JOINTS))
  if(name!=='root')assert.ok(parent in ADULT_JOINTS);
});
test('six actions create 24 finite, changing frames per second',()=>{
 for(const action of ADULT_ACTIONS){
  const frames=sampleAdultFrames(action,{duration:1,fps:24});
  assert.equal(frames.length,24);
  assert.ok(frames.every(f=>Object.values(f.pose.angles).every(Number.isFinite)));
  assert.notDeepEqual(frames[0].pose,frames[6].pose);
 }
});
test('timestamps and poses are deterministic',()=>{
 assert.equal(sampleAdultFrames('walk',{duration:1,fps:8})[7].time,7/8);
 assert.deepEqual(sampleAdultPose('walk',.5),sampleAdultPose('walk',.5));
});
test('invalid action, time, fps and duration rejected',()=>{
 assert.throws(()=>sampleAdultPose('fly',0));
 assert.throws(()=>sampleAdultPose('walk',Infinity));
 assert.throws(()=>sampleAdultFrames('walk',{fps:0}));
 assert.throws(()=>sampleAdultFrames('walk',{duration:100}));
});

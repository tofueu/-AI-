import test from 'node:test';
import assert from 'node:assert/strict';
import {sampleClip,validateClip,RIG_JOINTS} from './rig-animation.js';
const clip = variant => ({variant,frames:[{time:0,pose:{head:{x:0,y:0,rotation:0}}},{time:1,pose:{head:{x:10,y:4,rotation:30}}},{time:2,pose:{head:{x:0,y:0,rotation:0}}}]});
for(const variant of ['chibi','adult']) test(variant+' samples continuous head motion',()=>{
 const result=sampleClip(clip(variant),.5);
 assert.deepEqual(result.pose.head,{x:5,y:2,rotation:15});
 assert.equal(Object.keys(result.pose).length,RIG_JOINTS.length);
 assert.equal(sampleClip(clip(variant),2.5).pose.head.x,5);
 assert.equal(sampleClip(clip(variant),2,{loop:false}).pose.head.x,0);
});
test('rejects nonmonotonic keyframes and invalid joints',()=>{
 const c=clip('chibi'); c.frames[1].time=0;
 assert.throws(()=>validateClip(c),/Invalid animation frame/);
 const d=clip('adult');d.frames[0].pose.unknown={x:0,y:0,rotation:0};
 assert.throws(()=>validateClip(d),/Invalid joint transform/);
});
test('rejects malformed clip and invalid time',()=>{
 assert.throws(()=>validateClip({variant:'other',frames:[]}),/Invalid animation clip/);
 assert.throws(()=>sampleClip(clip('adult'),NaN),/Invalid sample time/);
});

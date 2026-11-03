import test from 'node:test';
import assert from 'node:assert/strict';
import {createNovaClip,sampleNovaClip,NOVA_BONES} from './animation-timeline.js';
const make=(variant='chibi',loop=true)=>createNovaClip({variant,name:'walk',durationMs:1000,loop,frames:[{timeMs:0,pose:{head:{rotation:0},arm_l:{x:0}}},{timeMs:500,pose:{head:{rotation:20},arm_l:{x:10}}},{timeMs:1000,pose:{head:{rotation:0},arm_l:{x:0}}}]});
for(const variant of ['chibi','adult'])test(`${variant} interpolates joint poses and loops without seams`,()=>{
 const clip=make(variant);assert.equal(sampleNovaClip(clip,250).pose.head.rotation,10);
 assert.equal(sampleNovaClip(clip,1250).pose.arm_l.x,5);
 assert.deepEqual(sampleNovaClip(clip,0).pose,sampleNovaClip(clip,1000).pose);
 assert.equal(sampleNovaClip(clip,-250).pose.head.rotation,10);
});
test('non-looping animation holds last pose',()=>assert.equal(sampleNovaClip(make('adult',false),2000).pose.head.rotation,0));
test('rejects malformed bones, transforms, timing and variants',()=>{
 const valid={variant:'chibi',name:'idle',durationMs:100,frames:[{timeMs:0,pose:{}},{timeMs:100,pose:{}}]};
 assert.throws(()=>createNovaClip({...valid,variant:'unknown'}),/variant/);
 assert.throws(()=>createNovaClip({...valid,frames:[{timeMs:0,pose:{invalid:{x:0}}},{timeMs:100,pose:{}}]}),/bone/);
 assert.throws(()=>createNovaClip({...valid,frames:[{timeMs:0,pose:{head:{scale:0}}},{timeMs:100,pose:{}}]}),/transform/);
 assert.throws(()=>createNovaClip({...valid,frames:[{timeMs:0,pose:{}},{timeMs:0,pose:{}}]}),/time/);
 assert.ok(NOVA_BONES.includes('hand_r'));
});
test('input keyframe mutations do not alter created clip',()=>{
 const pose={head:{rotation:12}};const clip=createNovaClip({variant:'chibi',name:'idle',durationMs:10,frames:[{timeMs:0,pose},{timeMs:10,pose:{head:{rotation:12}}}]});
 pose.head.rotation=99;assert.equal(sampleNovaClip(clip,0).pose.head.rotation,12);
});

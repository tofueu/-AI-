import test from 'node:test';
import assert from 'node:assert/strict';
import {createNovaClip,NOVA_ACTIONS} from './rig-presets.js';
import {sampleClip,RIG_JOINTS} from './rig-animation.js';
for (const variant of ['chibi','adult']) for (const action of NOVA_ACTIONS) test(`${variant}/${action} samples complete loop`,()=>{
 const clip=createNovaClip(variant,action);
 assert.ok(clip.frames.length>=3);
 const middle=sampleClip(clip,clip.frames.at(-1).time/2);
 assert.deepEqual(Object.keys(middle.pose),RIG_JOINTS);
 assert.deepEqual(sampleClip(clip,0).pose,sampleClip(clip,clip.frames.at(-1).time).pose);
});
test('presets are independent and invalid inputs rejected',()=>{
 const a=createNovaClip('adult','walk'); a.frames[0].pose.head.x=999;
 assert.equal(createNovaClip('adult','walk').frames[0].pose.head.x,0);
 assert.throws(()=>createNovaClip('other','walk'),/variant/);
 assert.throws(()=>createNovaClip('adult','fly'),/action/);
});

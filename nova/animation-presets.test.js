import test from 'node:test';
import assert from 'node:assert/strict';
import {createNovaAction,NOVA_ACTION_NAMES} from './animation-presets.js';
for(const variant of ['chibi','adult'])for(const name of NOVA_ACTION_NAMES)test(variant+' '+name+' loop continuity',()=>{
 const action=createNovaAction(variant,name);
 assert.equal(action.keyframes[0].time,0);
 assert.equal(action.keyframes.at(-1).time,action.duration);
 assert.deepEqual(action.keyframes[0].bones,action.keyframes.at(-1).bones);
 for(const frame of action.keyframes)for(const bone of Object.values(frame.bones))for(const value of Object.values(bone))assert.ok(Number.isFinite(value));
});
test('invalid variant',()=>assert.throws(()=>createNovaAction('other','idle'),/Unsupported/));
test('invalid action',()=>assert.throws(()=>createNovaAction('chibi','dance'),/Unknown/));
test('distinct proportions',()=>assert.notDeepEqual(createNovaAction('adult','walk').keyframes,createNovaAction('chibi','walk').keyframes));

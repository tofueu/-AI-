import test from 'node:test';
import assert from 'node:assert/strict';
import {NOVA_ACTIONS,getNovaAction} from './actions.js';
const names=['idle','walk','type','cry','sleep','celebrate'];
test('six smooth action presets have matching first and last poses',()=>{
 for(const name of names){const a=NOVA_ACTIONS[name];assert.ok(a.duration>0);assert.ok(a.keyframes.length>=3);assert.equal(a.keyframes[0].time,0);assert.equal(a.keyframes.at(-1).time,a.duration);assert.deepEqual(a.keyframes[0].bones,a.keyframes.at(-1).bones);}
});
test('keyframes are strictly increasing and finite',()=>{
 for(const a of Object.values(NOVA_ACTIONS)){let prev=-1;for(const f of a.keyframes){assert.ok(f.time>prev);prev=f.time;for(const props of Object.values(f.bones))for(const n of Object.values(props))assert.ok(Number.isFinite(n));}}
});
test('reduced motion provides a static first frame',()=>{const clip=getNovaAction('walk',{reducedMotion:true});assert.equal(clip.duration,0);assert.equal(clip.loop,false);assert.equal(clip.keyframes.length,1);});
test('invalid action rejected',()=>assert.throws(()=>getNovaAction('missing'),/Unknown NOVA action/));

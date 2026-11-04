import test from 'node:test';
import assert from 'node:assert/strict';
import { createNovaPresetClip,convertNovaActionToClip } from './preset-timeline-adapter.js';
import { sampleNovaClip,NOVA_BONES } from './animation-timeline.js';
for (const variant of ['chibi','adult']) {
 for (const action of ['idle','walk','run','typing','cry','sleep']) {
  test(`${variant} ${action} preset samples with canonical rig bones`,()=>{
   const clip=createNovaPresetClip(variant,action);
   const a=sampleNovaClip(clip,clip.durationMs/3);
   assert.ok(Object.keys(a.pose).every(b=>NOVA_BONES.includes(b)));
   assert.deepEqual(sampleNovaClip(clip,0).pose,sampleNovaClip(clip,clip.durationMs).pose);
   if(action==='typing')assert.ok(a.pose.forearm_l);
   if(action==='walk')assert.ok(a.pose.thigh_l);
  });
 }
}
test('unknown and conflicting bones fail closed',()=>{
 assert.throws(()=>convertNovaActionToClip({variant:'chibi',name:'idle',duration:10,loop:true,keyframes:[{time:0,bones:{nonsense:{x:1}}},{time:10,bones:{}}]}),/bone/);
 assert.throws(()=>convertNovaActionToClip({variant:'chibi',name:'idle',duration:10,loop:true,keyframes:[{time:0,bones:{upper_arm_l:{x:1},arm_l:{x:2}}},{time:10,bones:{}}]}),/duplicate/);
});

for (const variant of ['chibi','adult']) {
  test(`${variant} run and sleep retain distinct identities and motion`,()=>{
    const walk=createNovaPresetClip(variant,'walk');
    const run=createNovaPresetClip(variant,'run');
    const idle=createNovaPresetClip(variant,'idle');
    const sleep=createNovaPresetClip(variant,'sleep');
    assert.equal(run.name,'run');
    assert.equal(sleep.name,'sleep');
    assert.notEqual(run.durationMs,walk.durationMs);
    assert.notEqual(sleep.durationMs,idle.durationMs);
    assert.notDeepEqual(sampleNovaClip(run,run.durationMs/4).pose,sampleNovaClip(walk,walk.durationMs/4).pose);
    assert.notDeepEqual(sampleNovaClip(sleep,sleep.durationMs/2).pose,sampleNovaClip(idle,idle.durationMs/2).pose);
  });
}

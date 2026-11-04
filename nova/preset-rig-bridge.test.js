import test from 'node:test';
import assert from 'node:assert/strict';
import {createPresetRigClip,convertPresetToRigClip} from './preset-rig-bridge.js';
import {sampleClip,RIG_JOINTS} from './rig-animation.js';
import {NOVA_ACTION_NAMES} from './animation-presets.js';
for(const variant of ['chibi','adult'])for(const action of NOVA_ACTION_NAMES){
  test(variant+' '+action+' preset converts to sampleable 16-joint clip',()=>{
    const clip=createPresetRigClip(variant,action);
    assert.equal(clip.variant,variant);
    assert.equal(clip.action,action);
    assert.equal(clip.frames[0].time,0);
    const pose=sampleClip(clip,clip.frames.at(-1).time/2).pose;
    assert.deepEqual(Object.keys(pose),RIG_JOINTS);
    assert.ok(Object.values(pose).every(t=>Object.values(t).every(Number.isFinite)));
  });
}
test('rejects unknown bones and mismatched duration',()=>{
  const base={variant:'chibi',name:'idle',duration:1000,keyframes:[
    {time:0,bones:{root:{y:0}}},{time:1000,bones:{root:{y:0}}}
  ]};
  assert.throws(()=>convertPresetToRigClip({...base,keyframes:[{time:0,bones:{bad:{rotation:1}}},base.keyframes[1]]}),/Unsupported/);
  assert.throws(()=>convertPresetToRigClip({...base,duration:2000}),/duration mismatch/);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {buildNovaPresetFrames} from './preset-frame-sequence.js';
import {NOVA_MOTION_PRESETS,sampleNovaPreset} from './rig-motion-presets.js';
for (const variant of ['chibi','adult']) for (const action of Object.keys(NOVA_MOTION_PRESETS)) {
 test(`${variant}/${action} emits finite continuous frames`,()=>{
  const result=buildNovaPresetFrames({variant,action,fps:20,cycles:2});
  assert.ok(result.frames.length>=2);
  assert.equal(result.frames[0].timeMs,0);
  assert.ok(result.frames.at(-1).timeMs<result.durationMs);
  for(const frame of result.frames){
   assert.deepEqual(frame.pose,sampleNovaPreset(variant,action,frame.timeMs).pose);
   for(const transform of Object.values(frame.pose)) for(const value of Object.values(transform)) assert.ok(Number.isFinite(value));
  }
 });
}
test('rejects invalid sampling parameters',()=>{
 for(const options of [{variant:'wrong',action:'idle'},{variant:'chibi',action:'wrong'},{variant:'adult',action:'idle',fps:0},{variant:'adult',action:'idle',fps:61},{variant:'chibi',action:'walk',cycles:0},{variant:'chibi',action:'walk',cycles:21}])
  assert.throws(()=>buildNovaPresetFrames(options));
});

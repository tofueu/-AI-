import test from 'node:test';
import assert from 'node:assert/strict';
import {createNovaMotionTrack} from './motion-track.js';
import {NOVA_ACTION_NAMES} from './animation-presets.js';

for (const variant of ['chibi','adult']) {
  for (const action of NOVA_ACTION_NAMES) {
    test(`${variant}/${action} produces finite renderer transforms`, () => {
      const track=createNovaMotionTrack(variant,action,{fps:12,includeEndpoint:true});
      assert.equal(track.frames.at(-1).timeMs,track.durationMs);
      assert.ok(track.frames.length>2);
      for (const frame of track.frames) {
        assert.ok(Object.hasOwn(frame.joints,'root'));
        for (const joint of Object.values(frame.joints)) {
          for (const value of Object.values(joint)) assert.ok(Number.isFinite(value));
        }
      }
      assert.deepEqual(track.frames[0].joints,track.frames.at(-1).joints);
    });
  }
}
test('invalid FPS propagates validation',()=>{
  assert.throws(()=>createNovaMotionTrack('chibi','walk',{fps:0}),/FPS/);
});

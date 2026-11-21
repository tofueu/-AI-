import test from 'node:test';
import assert from 'node:assert/strict';
import {createNovaRigClip, sampleNovaActionFrames} from './rig-preset-adapter.js';
import {NOVA_ACTION_NAMES} from './animation-presets.js';

for (const variant of ['chibi', 'adult']) {
  for (const action of NOVA_ACTION_NAMES) {
    test(`${variant} ${action}: preset converts to frame samples`, () => {
      const clip = createNovaRigClip(variant, action);
      assert.equal(clip.frames[0].at, 0);
      assert.equal(clip.frames.at(-1).at, 1);
      assert.deepEqual(clip.frames[0].pose, clip.frames.at(-1).pose);
      const sampled = sampleNovaActionFrames(variant, action, {fps: 12, includeEndpoint: true});
      assert.ok(sampled.frames.length >= 3);
      assert.equal(sampled.frames.at(-1).timeMs, clip.durationMs);
      for (const joint of Object.keys(sampled.frames[0].pose)) {
        for (const channel of Object.keys(sampled.frames[0].pose[joint])) {
          assert.ok(Math.abs(sampled.frames[0].pose[joint][channel] - sampled.frames.at(-1).pose[joint][channel]) < 1e-9);
        }
      }
    });
  }
}
test('rejects unknown action', () => {
  assert.throws(() => createNovaRigClip('chibi', 'unknown'), /action/);
});

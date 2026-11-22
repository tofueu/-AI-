import test from 'node:test';
import assert from 'node:assert/strict';
import { interpolateNovaPose, sampleNovaAnimation } from './pose-interpolator.js';

test('interpolates transforms without mutating input', () => {
  const from = { head: { x: 0, rotation: 0, opacity: 1 } };
  const to = { head: { x: 20, rotation: 90, opacity: 0.5 } };
  const pose = interpolateNovaPose(from, to, 0.5);
  assert.equal(pose.head.x, 10);
  assert.equal(pose.head.rotation, 45);
  assert.equal(pose.head.opacity, 0.75);
  assert.equal(from.head.x, 0);
});
test('samples both character variants and includes final pose for non-looping clips', () => {
  for (const variant of ['chibi', 'adult']) {
    const clip = sampleNovaAnimation({ variant, frameCount: 5, keyframes: [
      { at: 0, pose: { arm_l: { rotation: 0 } } },
      { at: 1, pose: { arm_l: { rotation: 80 } } }
    ] });
    assert.deepEqual(clip.frames.map(f => f.pose.arm_l.rotation), [0, 20, 40, 60, 80]);
  }
});
test('loop sampling avoids duplicating the terminal frame', () => {
  const clip = sampleNovaAnimation({ variant: 'chibi', loop: true, frameCount: 4, keyframes: [
    { at: 0, pose: { head: { y: 0 } } },
    { at: 1, pose: { head: { y: 8 } } }
  ] });
  assert.deepEqual(clip.frames.map(f => f.pose.head.y), [0, 2, 4, 6]);
});
test('rejects invalid slot, opacity, timeline, and frame count', () => {
  assert.throws(() => interpolateNovaPose({ unknown: { x: 1 } }, {}, 0));
  assert.throws(() => interpolateNovaPose({ head: { opacity: -1 } }, {}, 0));
  assert.throws(() => interpolateNovaPose({}, {}, NaN));
  assert.throws(() => sampleNovaAnimation({ variant: 'adult', frameCount: 1, keyframes: [] }));
  assert.throws(() => sampleNovaAnimation({ variant: 'adult', frameCount: 4, keyframes: [
    { at: 0, pose: {} }, { at: 0, pose: {} }
  ] }));
});

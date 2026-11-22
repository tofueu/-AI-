import test from 'node:test';
import assert from 'node:assert/strict';
import { sampleNovaAnimation } from './pose-interpolator.js';
import { renderNovaAnimationFrame } from './animation-frame-renderer.js';

test('renders interpolated chibi and adult arm movement while retaining original artwork', () => {
  for (const variant of ['chibi', 'adult']) {
    const base = { variant, layers: [{ slot: 'arm_l', src: 'nova/arm.png',
      transform: { x: 10, y: 0, rotation: 5, scaleX: 1, scaleY: 1 } }] };
    const clip = sampleNovaAnimation({ variant, frameCount: 3, keyframes: [
      { at: 0, pose: { arm_l: { rotation: 0 } } },
      { at: 1, pose: { arm_l: { rotation: 90 } } }
    ] });
    const svg = renderNovaAnimationFrame(base, clip.frames[1]);
    assert.match(svg, /rotate\(50\)/);
    assert.match(svg, /nova\/arm\.png/);
    assert.equal(base.layers[0].transform.rotation, 5);
  }
});

test('rejects unsafe animation values and unknown slots', () => {
  const base = { variant: 'chibi', layers: [{ slot: 'head', src: 'head.png',
    transform: { x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1 } }] };
  assert.throws(() => renderNovaAnimationFrame(base, { pose: { bogus: { x: 2 } } }));
  assert.throws(() => renderNovaAnimationFrame(base, { pose: { head: { x: Infinity } } }));
  assert.throws(() => renderNovaAnimationFrame(base, { pose: { head: { scaleX: 0 } } }));
});

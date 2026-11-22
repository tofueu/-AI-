import test from 'node:test';
import assert from 'node:assert/strict';
import { renderNovaAnimationSequence } from './animation-sequence-renderer.js';

const pose = variant => ({ variant, layers: [{
  slot: 'outfit', src: 'nova/base/outfit.png',
  transform: { x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1, opacity: 1 }
}] });
const animation = variant => ({ variant, frameCount: 3, keyframes: [
  { at: 0, pose: { outfit: { x: 0, opacity: 1 } } },
  { at: 1, pose: { outfit: { x: 20, opacity: 0.5 } } }
] });
for (const variant of ['chibi', 'adult']) {
  test(`${variant} renders all interpolated SVG frames without mutating art`, () => {
    const base = pose(variant);
    const result = renderNovaAnimationSequence(base, animation(variant));
    assert.equal(result.frames.length, 3);
    assert.deepEqual(result.timestamps, [0, 0.5, 1]);
    assert.match(result.frames[1], /translate\\(10 0\\)/);
    assert.match(result.frames[1], /opacity="0.75"/);
    assert.equal(base.layers[0].transform.x, 0);
  });
}
test('rejects mixing adult animation with chibi artwork', () => {
  assert.throws(() => renderNovaAnimationSequence(pose('chibi'), animation('adult')), /variant/i);
});
test('loop samples do not duplicate the final endpoint', () => {
  const result = renderNovaAnimationSequence(pose('adult'), { ...animation('adult'), loop: true });
  assert.deepEqual(result.timestamps, [0, 1 / 3, 2 / 3]);
});

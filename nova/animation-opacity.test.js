import test from 'node:test';
import assert from 'node:assert/strict';
import { renderNovaSvg } from './svg-renderer.js';
import { renderNovaAnimationFrame } from './animation-frame-renderer.js';

const makePose = variant => ({
  variant,
  layers: [{ slot: 'outfit', src: 'nova/base/outfit.png',
    transform: { x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1, opacity: 0.8 } }]
});

for (const variant of ['chibi', 'adult']) {
  test(`${variant} animation multiplies opacity without mutating source`, () => {
    const base = makePose(variant);
    const result = renderNovaAnimationFrame(base, { pose: { outfit: { opacity: 0.5 } } });
    assert.match(result, /opacity="0.4"/);
    assert.equal(base.layers[0].transform.opacity, 0.8);
  });
}
test('renderer defaults opacity to one', () => {
  const base = makePose('chibi');
  delete base.layers[0].transform.opacity;
  assert.match(renderNovaSvg(base), /opacity="1"/);
});
test('rejects invalid sampled opacity', () => {
  for (const opacity of [-0.1, 1.1, NaN]) {
    assert.throws(() => renderNovaAnimationFrame(makePose('adult'),
      { pose: { outfit: { opacity } } }), /opacity/i);
  }
});
test('rejects invalid base opacity', () => {
  const base = makePose('adult');
  base.layers[0].transform.opacity = 2;
  assert.throws(() => renderNovaSvg(base), /transform/i);
  assert.throws(() => renderNovaAnimationFrame(base,
    { pose: { outfit: { opacity: 0.5 } } }), /opacity/i);
});

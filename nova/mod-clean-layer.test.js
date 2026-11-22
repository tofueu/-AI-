import test from 'node:test';
import assert from 'node:assert/strict';
import { createNovaCleanLayer } from './mod-clean-layer.js';

for (const variant of ['chibi', 'adult']) {
  test(`${variant} clean layer keeps artwork and excludes drawing guides`, () => {
    const svg = createNovaCleanLayer({ variant, slot: 'outfit', artwork: '<path d="M 1 2 L 3 4"/>' });
    assert.match(svg, /artwork-outfit/);
    assert.match(svg, /M 1 2 L 3 4/);
    assert.doesNotMatch(svg, /pivot-guide|id="guides"|stroke-dasharray/);
  });
}
test('invalid slots and dimensions are rejected', () => {
  assert.throws(() => createNovaCleanLayer({ variant: 'chibi', slot: '../evil' }), TypeError);
  assert.throws(() => createNovaCleanLayer({ variant: 'adult', slot: 'outfit', width: 0 }), RangeError);
});
test('external and executable artwork is rejected', () => {
  for (const artwork of ['<script>alert(1)</script>', '<image href="https://example.com/a"/>', '<path onclick="evil()"/>', '<style>x</style>', '<rect fill="url(#x)"/>']) {
    assert.throws(() => createNovaCleanLayer({ variant: 'chibi', slot: 'outfit', artwork }), TypeError);
  }
});

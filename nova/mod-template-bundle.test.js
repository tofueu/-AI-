import test from 'node:test';
import assert from 'node:assert/strict';
import { makeNovaModTemplateBundle } from './mod-template-bundle.js';
import { NOVA_SLOTS } from './character-mod.js';

test('both variants export every editable guide and deterministic manifest', () => {
  for (const variant of ['chibi','adult']) {
    const files = makeNovaModTemplateBundle(variant);
    assert.equal(Object.keys(files).length, NOVA_SLOTS.length + 2);
    assert.deepEqual(makeNovaModTemplateBundle(variant), files);
    const manifest = JSON.parse(files['template.json']);
    assert.equal(manifest.variant, variant);
    assert.deepEqual(manifest.slots, NOVA_SLOTS);
    assert.deepEqual(Object.keys(manifest.layers), NOVA_SLOTS);
    for (const slot of NOVA_SLOTS) {
      assert.match(files[`guides/${slot}.svg`], /id="artwork"/);
      assert.equal(manifest.layers[slot], null);
    }
  }
});
test('invalid size and variant are rejected by guide validation', () => {
  assert.throws(() => makeNovaModTemplateBundle('unknown'), /variant/);
  assert.throws(() => makeNovaModTemplateBundle('chibi', 0), /size/);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { NOVA_MOD_SLOTS } from './mod-slot-template.js';
import { createNovaLayerWhiteboard, createNovaWhiteboardManifest } from './mod-layer-whiteboard.js';

for (const variant of ['chibi', 'adult']) {
  test(`${variant} produces a transparent guide for every MOD slot`, () => {
    const manifest = createNovaWhiteboardManifest(variant);
    assert.equal(manifest.slots.length, NOVA_MOD_SLOTS.length);
    assert.equal(new Set(manifest.slots.map(x => x.filename)).size, NOVA_MOD_SLOTS.length);
    for (const { slot, operation } of manifest.slots) {
      assert.equal(operation, 'inherit');
      const svg = createNovaLayerWhiteboard({ variant, slot });
      assert.match(svg, /<g id="artwork-/);
      assert.doesNotMatch(svg, /<image|<script|<rect[^>]*fill=/);
    }
  });
}
test('rejects invalid variants, slots and canvas dimensions', () => {
  assert.throws(() => createNovaLayerWhiteboard({ variant: 'other', slot: 'head' }), TypeError);
  assert.throws(() => createNovaLayerWhiteboard({ variant: 'chibi', slot: '../head' }), TypeError);
  assert.throws(() => createNovaLayerWhiteboard({ variant: 'adult', slot: 'head', width: -1 }), RangeError);
  assert.throws(() => createNovaWhiteboardManifest('other'), TypeError);
});
test('supports non-default dimensions and centered pivot', () => {
  const svg = createNovaLayerWhiteboard({ variant: 'adult', slot: 'head', width: 640, height: 320 });
  assert.match(svg, /viewBox="0 0 640 320"/);
  assert.match(svg, /cx="320" cy="160"/);
});

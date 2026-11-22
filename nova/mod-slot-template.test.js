import test from 'node:test';
import assert from 'node:assert/strict';
import { createNovaModTemplate, NOVA_MOD_SLOTS } from './mod-slot-template.js';
import { importNovaModManifest } from './mod-import.js';
import { applyNovaModManifest } from './apply-mod-manifest.js';

for (const variant of ['chibi', 'adult']) {
  test(`${variant} blank template imports and retains base clothing`, () => {
    const template = createNovaModTemplate(variant);
    assert.equal(Object.keys(template.layers).length, NOVA_MOD_SLOTS.length);
    assert.equal(importNovaModManifest(template).variant, variant);
    const baseLayers = [{ slot: 'body', src: 'base/body.png' }, { slot: 'outfit', src: 'base/outfit.png' }];
    const resolved = applyNovaModManifest({ baseLayers, manifest: template, variant });
    assert.deepEqual(resolved.map(layer => layer.src), ['base/body.png', 'base/outfit.png']);
    template.layers.hair_front = { src: 'custom/hair.png' };
    assert.equal(importNovaModManifest(template).layers.hair_front.src, 'custom/hair.png');
  });
}
test('templates do not share mutable layers', () => {
  const a = createNovaModTemplate('chibi');
  const b = createNovaModTemplate('chibi');
  a.layers.hat.operation = 'hide';
  assert.equal(b.layers.hat.operation, 'inherit');
});
test('rejects invalid variants', () => {
  assert.throws(() => createNovaModTemplate('universal'), /Invalid NOVA character variant/);
});

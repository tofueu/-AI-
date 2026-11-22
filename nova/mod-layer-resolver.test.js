import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveNovaModLayers } from './mod-layer-resolver.js';

for (const variant of ['chibi', 'adult']) {
  test(variant + ' hides optional layers but retains body and outfit', () => {
    const base = { variant, layers: ['body', 'outfit', 'hat'].map(slot => ({ slot, src: slot + '.png', transform: { x: 0 } })) };
    const before = structuredClone(base);
    const mod = { variant, layers: { body: { operation: 'hide' }, outfit: { operation: 'hide' }, hat: { operation: 'hide' } } };
    const resolved = resolveNovaModLayers(base, mod);
    assert.deepEqual(resolved.layers.map(layer => layer.slot), ['body', 'outfit']);
    assert.deepEqual(base, before);
  });
  test(variant + ' replaces only the selected art without mutating base', () => {
    const base = { variant, layers: [{ slot: 'hair_front', src: 'old.png', transform: { x: 1 } }] };
    const result = resolveNovaModLayers(base, { variant, layers: { hair_front: { operation: 'replace', src: 'mods/hair.png' } } });
    assert.equal(result.layers[0].src, 'mods/hair.png');
    assert.equal(base.layers[0].src, 'old.png');
    assert.notEqual(result.layers[0].transform, base.layers[0].transform);
  });
}
test('rejects mismatched rigs', () => assert.throws(() => resolveNovaModLayers({ variant: 'chibi', layers: [] }, { variant: 'adult', layers: {} }), /Invalid MOD/));
test('rejects traversal in replacement paths', () => assert.throws(() => resolveNovaModLayers({ variant: 'chibi', layers: [{ slot: 'hat', src: 'hat.png', transform: {} }] }, { variant: 'chibi', layers: { hat: { operation: 'replace', src: '../private.png' } } }), /Unsafe/));
test('rejects unknown slots', () => assert.throws(() => resolveNovaModLayers({ variant: 'adult', layers: [] }, { variant: 'adult', layers: { unknown: { operation: 'hide' } } }), /Unknown/));

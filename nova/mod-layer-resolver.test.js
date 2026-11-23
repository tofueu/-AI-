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

for (const variant of ['chibi', 'adult']) {
  test(variant + ' rejects duplicate base slots', () => {
    const base = { variant, layers: [{ slot: 'hat', src: 'a.png' }, { slot: 'hat', src: 'b.png' }] };
    assert.throws(() => resolveNovaModLayers(base, { variant, layers: {} }), /Invalid base layer/);
  });
  test(variant + ' isolates nested transform data', () => {
    const base = { variant, layers: [{ slot: 'head', src: 'head.png', transform: { pivot: { x: 1 } } }] };
    const resolved = resolveNovaModLayers(base, { variant, layers: {} });
    resolved.layers[0].transform.pivot.x = 99;
    assert.equal(base.layers[0].transform.pivot.x, 1);
  });
  for (const src of ['mods//hair.png', 'mods/./hair.png', 'mods/../hair.png', './hair.png', 'mods\\\\hair.png', 'mods/hair.PNG/other.png', 'https://example.com/a.png', 'mods/hair.svg', 'mods/hair.png?x=1']) {
    test(variant + ' rejects non-normalized MOD path: ' + src, () => {
      const base = { variant, layers: [{ slot: 'hat', src: 'hat.png' }] };
      assert.throws(() => resolveNovaModLayers(base, { variant, layers: { hat: { operation: 'replace', src } } }), /Unsafe MOD asset/);
    });
  }
  test(variant + ' permits normalized PNG asset path', () => {
    const base = { variant, layers: [{ slot: 'hat', src: 'hat.png' }] };
    assert.equal(resolveNovaModLayers(base, { variant, layers: { hat: { operation: 'replace', src: 'mods/hat_01.PNG' } } }).layers[0].src, 'mods/hat_01.PNG');
  });
}

for (const variant of ['chibi', 'adult']) {
  test(variant + ' rejects edits to slots absent from the current pose', () => {
    const base = { variant, layers: [{ slot: 'body', src: 'body.png' }] };
    for (const operation of [{ operation: 'hide' }, { operation: 'replace', src: 'mods/hat.png' }]) {
      assert.throws(() => resolveNovaModLayers(base, { variant, layers: { hat: operation } }), /Missing base layer/);
    }
    assert.deepEqual(base.layers, [{ slot: 'body', src: 'body.png' }]);
  });
}

for (const variant of ['chibi', 'adult']) {
  test(variant + ' accepts full blank MOD template for sparse pose', async () => {
    const { createNovaModTemplate } = await import('./mod-slot-template.js');
    const base = { variant, layers: [{ slot: 'body', src: 'body.png' }, { slot: 'outfit', src: 'outfit.png' }] };
    const original = structuredClone(base);
    const result = resolveNovaModLayers(base, createNovaModTemplate(variant));
    assert.deepEqual(result.layers, base.layers);
    assert.deepEqual(base, original);
  });
  test(variant + ' rejects non-inherit edits for absent pose slots', () => {
    const base = { variant, layers: [{ slot: 'body', src: 'body.png' }] };
    for (const spec of [{ operation: 'hide' }, { operation: 'replace', src: 'hat.png' }]) {
      assert.throws(() => resolveNovaModLayers(base, { variant, layers: { hat: spec } }), /Missing base layer/);
    }
  });
}

for (const variant of ['chibi', 'adult']) {
  test(variant + ' rejects malformed inherit on absent pose slots', () => {
    const base = { variant, layers: [{ slot: 'body', src: 'body.png' }] };
    for (const spec of [null, {}, { operation: 'invalid' }, { operation: 'replace', src: 'hat.png' }]) {
      assert.throws(() => resolveNovaModLayers(base, { variant, layers: { hat: spec } }), /Missing base layer/);
    }
    assert.deepEqual(base.layers, [{ slot: 'body', src: 'body.png' }]);
  });
}

for (const variant of ['chibi', 'adult']) {
  test(variant + ' isolates joint, mask and artist metadata for inherited and replaced layers', () => {
    const base = { variant, layers: [
      { slot: 'body', src: 'body.png', joints: [{ pivot: { x: 1 } }], mask: { opacity: 0.5 } },
      { slot: 'hat', src: 'hat.png', metadata: { tags: ['original'] } }
    ] };
    const before = structuredClone(base);
    const resolved = resolveNovaModLayers(base, { variant, layers: { hat: { operation: 'replace', src: 'mods/newhat.png' } } });
    resolved.layers[0].joints[0].pivot.x = 100;
    resolved.layers[0].mask.opacity = 0;
    resolved.layers[1].metadata.tags.push('modified');
    assert.deepEqual(base, before);
    assert.equal(resolved.layers[1].src, 'mods/newhat.png');
  });
}

for (const variant of ['chibi', 'adult']) {
  test(variant + ' rejects array operations and non-plain MOD maps', () => {
    const base = { variant, layers: [{ slot: 'hat', src: 'hat.png' }] };
    assert.throws(() => resolveNovaModLayers(base, { variant, layers: { hat: ['hide'] } }), /Invalid MOD operation/);
    const inherited = Object.create({ hat: { operation: 'hide' } });
    assert.throws(() => resolveNovaModLayers(base, { variant, layers: inherited }), /Invalid MOD layers map/);
    assert.deepEqual(base.layers, [{ slot: 'hat', src: 'hat.png' }]);
  });
}

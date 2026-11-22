import test from 'node:test';
import assert from 'node:assert/strict';
import { applyNovaModManifest } from './apply-mod-manifest.js';

const base = [
  { slot: 'body', src: 'base/body.png', pivot: [0, 10] },
  { slot: 'top', src: 'base/top.png' },
  { slot: 'hair_front', src: 'base/hair.png', z: 4 },
  { slot: 'hat', src: 'base/hat.png' }
];
const manifest = (variant, layers) => ({ schemaVersion: 1, variant, layers });

for (const variant of ['chibi', 'adult']) {
  test(variant + ' applies replacements and retains pivot and base inputs', () => {
    const original = JSON.stringify(base);
    const result = applyNovaModManifest({
      baseLayers: base, variant, assetRoot: 'mods/example',
      manifest: manifest(variant, {
        hair_front: { src: 'hair/new.png' },
        hat: { operation: 'hide' },
        top: { operation: 'hide' }
      })
    });
    assert.equal(result.find(x => x.slot === 'hair_front').src, 'mods/example/hair/new.png');
    assert.equal(result.find(x => x.slot === 'hair_front').z, 4);
    assert.equal(result.find(x => x.slot === 'hat').hidden, true);
    assert.equal(result.find(x => x.slot === 'top').src, 'base/top.png');
    assert.equal(result.find(x => x.slot === 'top').hidden, false);
    assert.equal(JSON.stringify(base), original);
  });
}
test('universal MOD can replace complete character parts while keeping clothing', () => {
  const result = applyNovaModManifest({
    baseLayers: base, variant: 'adult',
    manifest: manifest('universal', { body: { src: 'new/body.png' }, top: { operation: 'inherit' } })
  });
  assert.equal(result[0].src, 'new/body.png');
  assert.deepEqual(result[0].pivot, [0, 10]);
  assert.equal(result[1].src, 'base/top.png');
});
test('rejects wrong variant and unsafe MOD paths', () => {
  assert.throws(() => applyNovaModManifest({
    baseLayers: base, variant: 'adult', manifest: manifest('chibi', {})
  }), /variant mismatch/);
  assert.throws(() => applyNovaModManifest({
    baseLayers: base, variant: 'adult',
    manifest: manifest('adult', { hat: { src: '../escape.png' } })
  }), /Invalid MOD PNG path/);
});

test('outfit slot supports replacement and retains safe fallback for both variants', () => {
  for (const variant of ['chibi', 'adult']) {
    const baseOutfit = [{slot:'outfit',src:'base/outfit.png',pivot:[4,8]}];
    const replace = applyNovaModManifest({
      baseLayers:baseOutfit, variant,
      manifest:manifest(variant,{outfit:{src:'clothes/new.png'}})
    });
    assert.equal(replace[0].src,'clothes/new.png');
    assert.deepEqual(replace[0].pivot,[4,8]);
    const hide = applyNovaModManifest({
      baseLayers:baseOutfit, variant,
      manifest:manifest(variant,{outfit:{operation:'hide'}})
    });
    assert.equal(hide[0].src,'base/outfit.png');
    assert.equal(hide[0].hidden,false);
  }
});

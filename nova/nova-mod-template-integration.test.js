import test from 'node:test';
import assert from 'node:assert/strict';
import {makeNovaModTemplateBundle} from './mod-template-bundle.js';
import {resolveNovaModLayers} from './nova-mod-layer-resolver.js';
import {validateNovaModPackage} from './nova-mod-package-validator.js';

const base = {
  body:'artwork/base_body.png',
  head:'artwork/base_head.png',
  outfit:'artwork/base_outfit.png'
};

for (const variant of ['chibi','adult']) {
  test(`${variant} exported blank template validates and resolves required base costume`, () => {
    const bundle = makeNovaModTemplateBundle(variant);
    const manifest = JSON.parse(bundle['template.json']);
    assert.equal(manifest.variant, variant);
    assert.equal(Object.keys(bundle).filter(path => path.startsWith('guides/')).length, 13);
    const status = validateNovaModPackage(manifest, {});
    assert.deepEqual(status.needsBase, ['body','head','outfit']);
    const result = resolveNovaModLayers(manifest, {}, base);
    assert.deepEqual(result.usedBase, ['body','head','outfit']);
    assert.equal(result.layers.outfit.path, base.outfit);
  });

  test(`${variant} MOD can replace head while hidden hat stays hidden and clothing remains`, () => {
    const manifest = JSON.parse(makeNovaModTemplateBundle(variant)['template.json']);
    manifest.layers.head = {path:'artwork/custom_head.png',visible:true};
    manifest.layers.hat = {path:'artwork/hat.png',visible:false};
    const result = resolveNovaModLayers(manifest, {'artwork/custom_head.png':true}, {...base,hat:'artwork/base_hat.png'});
    assert.equal(result.layers.head.source, 'mod');
    assert.equal(result.layers.hat, null);
    assert.equal(result.layers.outfit.source, 'base');
  });
}

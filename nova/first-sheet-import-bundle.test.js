import test from 'node:test';
import assert from 'node:assert/strict';
import {createFirstSheetImportBundle} from './first-sheet-import-bundle.js';
import {validateNovaModTemplate} from './mod-template.js';
import {LAYER_SLOTS} from './mod-layers.js';

for(const variant of ['chibi','adult']) {
  test(variant+' first-sheet manifest is compatible with PNG pack validator',()=>{
    const bundle=createFirstSheetImportBundle(variant);
    assert.equal(bundle.variant,variant);
    assert.equal(bundle.manifest.canvas.width,512);
    assert.equal(bundle.manifest.canvas.height,512);
    assert.equal(validateNovaModTemplate(bundle.manifest),true);
    assert.deepEqual(bundle.manifest.layers.map(l=>l.slot),LAYER_SLOTS);
    assert.ok(bundle.manifest.layers.every(l=>l.hidden));
    assert.match(bundle.guide,/^<svg /);
    assert.ok(bundle.guideOnlySlots.includes('arm_l'));
    assert.ok(!bundle.supportedSlots.includes('arm_l'));
  });
}
test('unknown variants fail before generating a bundle',()=>{
  assert.throws(()=>createFirstSheetImportBundle('unknown'),/Unsupported NOVA variant/);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {createNovaWhiteboard,createNovaBlankManifest,NOVA_MOD_SLOTS} from './first-sheet-whiteboard.js';
for (const variant of ['chibi','adult']) {
  test(variant+' artist whiteboard exports SVG and 20 empty slots',()=>{
    const svg=createNovaWhiteboard(variant);
    const manifest=createNovaBlankManifest(variant);
    assert.match(svg,/^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg"/);
    assert.match(svg,new RegExp('NOVA '+variant));
    assert.equal(manifest.slots.length,20);
    assert.equal(manifest.slots.length,NOVA_MOD_SLOTS.length);
    assert.ok(manifest.slots.every(slot=>slot.hidden===true));
    assert.ok(manifest.slots.some(slot=>slot.slot==='top'));
  });
}
test('rejects unknown variants',()=>{
  assert.throws(()=>createNovaWhiteboard('other'),/Invalid/);
  assert.throws(()=>createNovaBlankManifest('other'),/Invalid/);
});

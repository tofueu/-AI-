import test from 'node:test';
import assert from 'node:assert/strict';
import {createNovaBlankManifest} from './first-sheet-whiteboard.js';
import {importNovaWhiteboardMod} from './whiteboard-mod-import.js';

const safeOutfit={top:{src:'safe-top.png'},bottom:{src:'safe-bottom.png'}};
for(const variant of ['chibi','adult']) {
  test(variant+' blank template inherits base and safe clothes',()=>{
    const manifest=createNovaBlankManifest(variant);
    const result=importNovaWhiteboardMod(manifest,{base:{head:{src:'original-head.png'}},safeOutfit});
    assert.equal(result.variant,variant);
    assert.equal(result.visibleLayers.find(p=>p.slot==='head').src,'original-head.png');
    assert.ok(result.visibleLayers.some(p=>p.slot==='top'));
    assert.ok(result.visibleLayers.some(p=>p.slot==='bottom'));
  });
  test(variant+' visible compatible PNG replaces hair',()=>{
    const manifest=createNovaBlankManifest(variant);
    manifest.slots.find(p=>p.slot==='hair_front').hidden=false;
    const result=importNovaWhiteboardMod(manifest,{safeOutfit});
    assert.equal(result.visibleLayers.find(p=>p.slot==='hair_front').src,'hair_front.png');
  });
}
test('imports visible limb and outerwear layers for both rigs',()=>{
  for(const variant of ['chibi','adult']) {
    const manifest=createNovaBlankManifest(variant);
    for(const slot of ['arm_l','leg_r','outer','face','shoes_l']) manifest.slots.find(p=>p.slot===slot).hidden=false;
    const result=importNovaWhiteboardMod(manifest,{safeOutfit});
    for(const slot of ['arm_l','leg_r','outer','face','shoes_l']) assert.equal(result.visibleLayers.find(p=>p.slot===slot).src,slot+'.png');
    assert.deepEqual(result.unsupportedSlots,[]);
  }
});
test('rejects traversal filenames and duplicate slots',()=>{
  const manifest=createNovaBlankManifest('adult');
  manifest.slots.find(p=>p.slot==='hat').hidden=false;
  manifest.slots.find(p=>p.slot==='hat').filename='../hat.png';
  assert.throws(()=>importNovaWhiteboardMod(manifest,{safeOutfit}),/Invalid image filename/);
  const dup=createNovaBlankManifest('adult');
  dup.slots.push({...dup.slots[0]});
  assert.throws(()=>importNovaWhiteboardMod(dup,{safeOutfit}),/duplicate/);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {composeNovaManifestFrame} from './manifest-frame.js';

const outfit={top:{src:'fallback/top.png'},bottom:{src:'fallback/bottom.png'}};
for (const variant of ['chibi','adult']) {
  test(variant+' manifest replaces artwork and retains clothing fallback',()=>{
    const original={schemaVersion:1,id:'custom_hair',variant,layers:{hair_front:{operation:'replace',src:'hair/new.png',width:96,anchorX:0.5},top:{operation:'hide'}}};
    const snapshot=structuredClone(original);
    const frame=composeNovaManifestFrame({variant,manifests:[original],safeOutfit:outfit});
    assert.equal(frame.variant,variant);
    assert.ok(frame.layers.some(layer=>layer.slot==='hair_front'));
    assert.ok(frame.layers.some(layer=>layer.slot==='top'));
    assert.ok(frame.layers.some(layer=>layer.slot==='bottom'));
    assert.deepEqual(original,snapshot);
  });
}
test('rejects mismatched and duplicate manifests',()=>{
  const mod={schemaVersion:1,id:'hair',variant:'adult',layers:{}};
  assert.throws(()=>composeNovaManifestFrame({variant:'chibi',manifests:[mod],safeOutfit:outfit}),/Incompatible/);
  assert.throws(()=>composeNovaManifestFrame({variant:'adult',manifests:[mod,mod],safeOutfit:outfit}),/Duplicate/);
});
test('rejects unsafe artwork path before composing',()=>{
  assert.throws(()=>composeNovaManifestFrame({variant:'chibi',manifests:[{schemaVersion:1,id:'bad',variant:'chibi',layers:{hat:{operation:'replace',src:'../secret.png'}}}],safeOutfit:outfit}),/PNG path/);
});

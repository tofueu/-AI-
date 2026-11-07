import test from 'node:test';
import assert from 'node:assert/strict';
import {createNovaModStarter,setNovaModStarterPart} from './mod-manifest-starter.js';
import {LAYER_SLOTS} from './mod-layers.js';
import {importNovaModManifest} from './mod-manifest.js';

for (const variant of ['chibi','adult']) {
  test(variant+' starter is a valid complete non-destructive MOD',()=>{
    const starter=createNovaModStarter('artist_sample',variant);
    assert.equal(Object.keys(starter.layers).length,LAYER_SLOTS.length);
    assert.ok(Object.values(starter.layers).every(layer=>layer.operation==='inherit'));
    assert.equal(importNovaModManifest(starter).variant,variant);
    const edited=setNovaModStarterPart(starter,'hair_front',{operation:'replace',src:'art/hair.png'});
    assert.equal(edited.layers.hair_front.src,'art/hair.png');
    assert.equal(starter.layers.hair_front.operation,'inherit');
    assert.equal(importNovaModManifest(edited).layers.hair_front.src,'art/hair.png');
    const hidden=setNovaModStarterPart(edited,'hat',{operation:'hide'});
    assert.equal(hidden.layers.hat.operation,'hide');
  });
}
test('starter rejects unsafe art, unknown slots and invalid variants',()=>{
  assert.throws(()=>createNovaModStarter('../bad','chibi'));
  assert.throws(()=>createNovaModStarter('ok','unknown'));
  const starter=createNovaModStarter('ok','chibi');
  assert.throws(()=>setNovaModStarterPart(starter,'not_a_slot',{operation:'hide'}));
  assert.throws(()=>setNovaModStarterPart(starter,'hair_front',{operation:'replace',src:'../escape.png'}));
  assert.equal(starter.layers.hair_front.operation,'inherit');
});

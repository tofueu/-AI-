import test from 'node:test';
import assert from 'node:assert/strict';
import {resolveInspectedNovaMod} from './nova-mod-inspected-resolver.js';

const slots = ['body','head','eyes','mouth','hairBack','hairFront','outfit','hat','accessory','armL','armR','legL','legR'];
function manifest(variant) {
  return {schemaVersion:1, variant, canvas:{width:512,height:512},
    slots, requiredSlots:['body','head','outfit'],
    layers:Object.fromEntries(slots.map(slot=>[slot,null]))};
}
function png() {
  const b=new Uint8Array(33);
  b.set([137,80,78,71,13,10,26,10,0,0,0,13,73,72,68,82]);
  new DataView(b.buffer).setUint32(16,512);
  new DataView(b.buffer).setUint32(20,512);
  b.set([8,6,0,0,0],24);
  return b;
}
const base={body:'artwork/base_body.png',head:'artwork/base_head.png',outfit:'artwork/base_outfit.png'};
for (const variant of ['chibi','adult']) {
  test(`${variant}: inspected head overrides base and outfit falls back`,()=>{
    const m=manifest(variant);
    m.layers.head={path:'artwork/head.png',visible:true};
    const r=resolveInspectedNovaMod(m,{'artwork/head.png':png()},base);
    assert.equal(r.layers.head.source,'mod');
    assert.equal(r.layers.outfit.source,'base');
    assert.deepEqual(r.inspection.validSlots,['head']);
  });
  test(`${variant}: corrupt visible PNG cannot reach renderer`,()=>{
    const m=manifest(variant);
    m.layers.head={path:'artwork/head.png',visible:true};
    assert.throws(()=>resolveInspectedNovaMod(m,{'artwork/head.png':new Uint8Array([1,2,3])},base),/Invalid NOVA MOD artwork/);
  });
  test(`${variant}: missing declared visible file fails closed`,()=>{
    const m=manifest(variant);
    m.layers.head={path:'artwork/head.png',visible:true};
    assert.throws(()=>resolveInspectedNovaMod(m,{},base),/declared visible PNG is missing/);
  });
  test(`${variant}: hidden optional accessory never draws`,()=>{
    const m=manifest(variant);
    m.layers.hat={path:'artwork/hat.png',visible:false};
    const r=resolveInspectedNovaMod(m,{'artwork/hat.png':new Uint8Array([1])},{...base,hat:'artwork/base_hat.png'});
    assert.equal(r.layers.hat,null);
    assert.deepEqual(r.inspection.hidden,['hat']);
  });
}

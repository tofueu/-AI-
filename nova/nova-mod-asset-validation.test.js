import test from 'node:test';
import assert from 'node:assert/strict';
import {inspectNovaModAssets} from './nova-mod-asset-validation.js';

const slots = ['body','head','eyes','mouth','hairBack','hairFront','outfit','hat','accessory','armL','armR','legL','legR'];
const template = () => ({
  schemaVersion:1,variant:'chibi',canvas:{width:512,height:512},
  slots:[...slots],requiredSlots:['body','head','outfit'],
  layers:Object.fromEntries(slots.map(slot=>[slot,null]))
});
function png(width=512,height=512,color=6) {
  const b = new Uint8Array(33);
  b.set([137,80,78,71,13,10,26,10,0,0,0,13,73,72,68,82]);
  new DataView(b.buffer).setUint32(16,width);
  new DataView(b.buffer).setUint32(20,height);
  b.set([8,color,0,0,0],24);
  return b;
}
test('valid transparent layer passes and base fills remaining required slots',()=>{
  const m=template();m.layers.head={path:'artwork/head.png',visible:true};
  const r=inspectNovaModAssets(m,{'artwork/head.png':png()});
  assert.equal(r.valid,true);assert.deepEqual(r.validSlots,['head']);
  assert.deepEqual(r.needsBase,['body','outfit']);
});
test('wrong canvas is rejected and still requires base head',()=>{
  const m=template();m.layers.head={path:'artwork/head.png',visible:true};
  const r=inspectNovaModAssets(m,{'artwork/head.png':png(256)});
  assert.equal(r.valid,false);assert.match(r.errors[0].reason,/canvas mismatch/);
  assert.ok(r.needsBase.includes('head'));
});
test('opaque PNG is rejected for mandatory clothing',()=>{
  const m=template();m.layers.outfit={path:'artwork/outfit.png',visible:true};
  const r=inspectNovaModAssets(m,{'artwork/outfit.png':png(512,512,2)});
  assert.equal(r.valid,false);assert.ok(r.needsBase.includes('outfit'));
});
test('hidden accessory is ignored without reading its invalid bytes',()=>{
  const m=template();m.variant='adult';m.layers.hat={path:'artwork/hat.png',visible:false};
  const r=inspectNovaModAssets(m,{'artwork/hat.png':new Uint8Array(1)});
  assert.equal(r.valid,true);assert.deepEqual(r.hidden,['hat']);
});
test('missing declared artwork is reported without false success for required slot',()=>{
  const m=template();m.layers.body={path:'artwork/body.png',visible:true};
  const r=inspectNovaModAssets(m,{});
  assert.deepEqual(r.validSlots,[]);assert.ok(r.missing.includes('body'));
  assert.ok(r.needsBase.includes('body'));
});
test('invalid manifest and unsafe path still fail closed',()=>{
  const m=template();m.layers.head={path:'artwork/../head.png',visible:true};
  assert.throws(()=>inspectNovaModAssets(m,{}),/Invalid layer/);
});

test('declared visible PNG missing from files invalidates package',()=>{
  const m=template();m.layers.head={path:'artwork/head.png',visible:true};
  const r=inspectNovaModAssets(m,{});
  assert.equal(r.valid,false);
  assert.deepEqual(r.validSlots,[]);
  assert.ok(r.needsBase.includes('head'));
  assert.deepEqual(r.errors,[{slot:'head',path:'artwork/head.png',reason:'declared visible PNG is missing'}]);
});
test('intentionally empty layers remain valid and use base fallback',()=>{
  const r=inspectNovaModAssets(template(),{});
  assert.equal(r.valid,true);
  assert.deepEqual(r.errors,[]);
  assert.deepEqual(r.needsBase,['body','head','outfit']);
});

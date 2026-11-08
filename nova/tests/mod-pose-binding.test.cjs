'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {slots}=require('../tools/generate-mod-templates.cjs');
const {slotJoint,composeLayers}=require('../rig/mod-pose-binding.cjs');
test('all template slots have a rig joint',()=>{
 assert.deepEqual(Object.keys(slotJoint).sort(),[...slots].sort());
});
for(const variant of ['chibi','adult']){
 test(variant+' hides empty slots and supplies default clothing',()=>{
  const layers=composeLayers(variant,'idle',0,{hair_front:'hair.png'});
  assert.deepEqual(layers.map(x=>x.slot),['base_clothes','hair_front']);
  assert.equal(layers[0].src,'builtin://base-clothes/'+variant);
 });
 test(variant+' uses provided clothes instead of fallback',()=>{
  const layers=composeLayers(variant,'idle',0,{top:'shirt.png'});
  assert.deepEqual(layers.map(x=>x.slot),['top']);
 });
 test(variant+' full character replaces individual layers',()=>{
  const layers=composeLayers(variant,'walk',300,{full_character:'complete.png',top:'shirt.png'});
  assert.deepEqual(layers.map(x=>x.slot),['full_character']);
 });
 test(variant+' joint offsets respond to animation',()=>{
  const a=composeLayers(variant,'walk',0,{accessory:'item.png'})[0];
  const b=composeLayers(variant,'walk',400,{accessory:'item.png'})[0];
  assert.notEqual(a.dx,b.dx);
 });
}
test('rejects invalid variant, clip, time or asset structure',()=>{
 assert.throws(()=>composeLayers('invalid','idle',0),TypeError);
 assert.throws(()=>composeLayers('chibi','invalid',0),TypeError);
 assert.throws(()=>composeLayers('chibi','idle',NaN),TypeError);
 assert.throws(()=>composeLayers('chibi','idle',0,[]),TypeError);
});

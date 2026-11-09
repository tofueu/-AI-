'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {fallbackClothingSvg,resolveBuiltinSource,resolveLayerSources}=require('../rig/fallback-clothing.cjs');
for(const variant of ['chibi','adult']){
 test(variant+' fallback resolves to renderable SVG image',()=>{
  const src=resolveBuiltinSource('builtin://base-clothes/'+variant);
  assert.match(src,/^data:image\/svg\+xml;charset=utf-8,/);
  const svg=decodeURIComponent(src.split(',')[1]);
  assert.equal(svg,fallbackClothingSvg(variant));
  assert.match(svg,/<svg[^>]+viewBox="0 0 512 512"/);
  assert.match(svg,/<path/);
 });
}
test('preserves custom MOD image sources and original layer records',()=>{
 const original=[{slot:'base_clothes',src:'builtin://base-clothes/chibi',dx:1},{slot:'hat',src:'hat.png',dx:3}];
 const result=resolveLayerSources(original);
 assert.match(result[0].src,/^data:image\/svg\+xml/);
 assert.equal(result[1].src,'hat.png');
 assert.equal(original[0].src,'builtin://base-clothes/chibi');
 assert.equal(result[0].dx,1);
});
test('rejects invalid builtin URIs and inputs',()=>{
 assert.throws(()=>resolveBuiltinSource('builtin://base-clothes/other'),TypeError);
 assert.throws(()=>resolveBuiltinSource('builtin://unknown/chibi'),TypeError);
 assert.throws(()=>resolveBuiltinSource(null),TypeError);
 assert.throws(()=>resolveLayerSources({}),TypeError);
});

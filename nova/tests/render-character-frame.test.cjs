'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {escapeXml,renderLayersSvg,renderCharacterFrame}=require('../tools/render-character-frame.cjs');
test('escapes external image URLs and slot names',()=>{
 const svg=renderLayersSvg([{slot:'hat"><script',src:'hat&"<>.png',dx:2,dy:-3}]);
 assert.match(svg,/hat&amp;&quot;&lt;&gt;\.png/);
 assert.doesNotMatch(svg,/<script/);
 assert.match(svg,/x="2" y="-3"/);
});
test('empty layer is hidden',()=>assert.doesNotMatch(renderLayersSvg([{slot:'hat',src:'',dx:0,dy:0}]),/<image/));
test('rejects invalid canvas and nonfinite offsets',()=>{
 assert.throws(()=>renderLayersSvg([],{width:0}),RangeError);
 assert.throws(()=>renderLayersSvg([{slot:'hat',src:'x',dx:NaN,dy:0}]),TypeError);
});
for(const variant of ['chibi','adult']){
 test(variant+' fallback renders as actual SVG image',()=>{
  const svg=renderCharacterFrame(variant,'idle',0,{});
  assert.match(svg,/<image /);
  assert.match(svg,/data-slot="base_clothes"/);
  assert.match(svg,/data:image\/svg\+xml;charset=utf-8,/);
 });
 test(variant+' full character overrides individual layers',()=>{
  const svg=renderCharacterFrame(variant,'idle',0,{full_character:'full.png',hat:'hat.png'});
  assert.match(svg,/full.png/);
  assert.doesNotMatch(svg,/hat.png|base_clothes/);
 });
}
test('XML escaping handles all reserved characters',()=>assert.equal(escapeXml('&<>"\''),'&amp;&lt;&gt;&quot;&apos;'));

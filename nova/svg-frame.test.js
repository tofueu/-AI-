import test from 'node:test';
import assert from 'node:assert/strict';
import {createNovaClip} from './rig-presets.js';
import {renderNovaSvgFrame} from './svg-frame.js';
test('both NOVA variants export SVG with bound layers',()=>{
 for (const variant of ['chibi','adult']) {
  const svg=renderNovaSvgFrame(createNovaClip(variant,'walk'),{head:{src:'head.png'},top:{src:'shirt.png'},hat:{src:'hat.png',hidden:true}},.25);
  assert.match(svg,/data-variant="(?:chibi|adult)"/);
  assert.match(svg,/head.png/);
  assert.match(svg,/shirt.png/);
  assert.doesNotMatch(svg,/hat.png/);
 }
});
test('escape XML and reject remote or executable image sources',()=>{
 const clip=createNovaClip('chibi','idle');
 assert.match(renderNovaSvgFrame(clip,{head:{src:'hair&face.png'}},0),/hair&amp;face.png/);
 for(const src of ['javascript:alert(1)','data:image/svg+xml,x','https://example.org/x.png','//example.org/x.png']) assert.throws(()=>renderNovaSvgFrame(clip,{head:{src}},0),/Unsafe/);
});
test('reject invalid dimensions and preserve source layers',()=>{
 const clip=createNovaClip('adult','type'), layers={head:{src:'head.png'}};
 assert.throws(()=>renderNovaSvgFrame(clip,layers,0,{width:0}),/dimensions/);
 renderNovaSvgFrame(clip,layers,.1);
 assert.deepEqual(layers,{head:{src:'head.png'}});
});

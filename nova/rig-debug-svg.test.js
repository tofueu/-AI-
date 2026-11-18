import test from 'node:test';
import assert from 'node:assert/strict';
import {renderNovaRigSvg} from './rig-debug-svg.js';
const clip={loop:false,frames:[
  {at:0,pose:{head:{rotation:0},armL:{x:0}}},
  {at:100,pose:{head:{rotation:90},armL:{x:0.1}}}
]};
test('renders six joints and five bones',()=>{
  const svg=renderNovaRigSvg(clip,50);
  assert.equal((svg.match(/<circle /g)||[]).length,6);
  assert.equal((svg.match(/<line x1=/g)||[]).length,5);
  assert.match(svg,/rotate\(45\)/);
});
test('respects canvas dimensions and joint translation',()=>{
  const svg=renderNovaRigSvg(clip,100,{width:200,height:300});
  assert.match(svg,/width="200" height="300"/);
  assert.match(svg,/translate\(90 144\)/);
});
test('rejects invalid dimensions and invalid clips',()=>{
  assert.throws(()=>renderNovaRigSvg(clip,0,{width:0}),/dimensions/);
  assert.throws(()=>renderNovaRigSvg(clip,0,{height:Infinity}),/dimensions/);
  assert.throws(()=>renderNovaRigSvg({frames:[]},0),/Timeline/);
});

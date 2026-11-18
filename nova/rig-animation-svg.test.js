import test from 'node:test';
import assert from 'node:assert/strict';
import { renderNovaRigAnimationSvg } from './rig-animation-svg.js';

const clip = {loop:true,frames:[
  {at:0,pose:{head:{x:0}}},
  {at:1000,pose:{head:{x:0.1}}}
]};

test('exports four synchronized SVG rig frames at 4fps', () => {
  const svg = renderNovaRigAnimationSvg(clip,{fps:4});
  assert.equal((svg.match(/<animate /g)||[]).length,4);
  assert.match(svg,/calcMode="discrete"/);
  assert.match(svg,/keyTimes="0.00000000;0.25000000;0.50000000;0.75000000;1.00000000"/);
  assert.match(svg,/dur="1000ms" repeatCount="indefinite"/);
  assert.match(svg,/viewBox="0 0 320 480"/);
});
test('rejects excessive frames', () => assert.throws(
  () => renderNovaRigAnimationSvg(clip,{fps:60,maxFrames:10}),/frame cap/
));
test('rejects invalid FPS', () => assert.throws(
  () => renderNovaRigAnimationSvg(clip,{fps:0}),/FPS/
));

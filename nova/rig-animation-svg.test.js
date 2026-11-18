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

test('one-shot animation stops instead of looping', () => {
  const svg = renderNovaRigAnimationSvg({...clip,loop:false},{fps:4});
  assert.equal((svg.match(/repeatCount="1"/g)||[]).length,5);
  assert.equal((svg.match(/fill="freeze"/g)||[]).length,5);
  assert.doesNotMatch(svg,/repeatCount="indefinite"/);
});
test('rejects invalid canvas dimensions', () => {
  for (const options of [{width:0},{height:-1},{width:1.5},{height:9000},{width:Infinity}]) {
    assert.throws(() => renderNovaRigAnimationSvg(clip,options),/canvas dimensions/);
  }
});

test('one-shot animation keeps a distinct terminal pose instead of wrapping to first frame', () => {
  const svg = renderNovaRigAnimationSvg({...clip,loop:false},{fps:4});
  assert.equal((svg.match(/<animate /g)||[]).length,5);
  assert.match(svg,/values="hidden;hidden;hidden;hidden;visible"/);
  assert.doesNotMatch(svg,/values="visible;hidden;hidden;hidden;visible"/);
});

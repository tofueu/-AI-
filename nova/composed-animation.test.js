import test from 'node:test';
import assert from 'node:assert/strict';
import {renderNovaComposedAnimationSvg} from './composed-animation.js';
const frame=(variant,src)=>({variant,layers:[{src,transform:{x:0,y:0,rotation:0}}]});
for (const variant of ['chibi','adult']) test(`${variant} loop preserves ordered MOD artwork`,()=>{
  const svg=renderNovaComposedAnimationSvg([frame(variant,'body.png'),frame(variant,'hair.png')],{durationMs:800});
  assert.ok(svg.indexOf('body.png')<svg.indexOf('hair.png'));
  assert.match(svg,/keyTimes="0.00000000;0.50000000;1.00000000"/);
  assert.match(svg,/values="visible;hidden;visible"/);
  assert.match(svg,/repeatCount="indefinite"/);
});
test('rejects mixed rigs, unsafe paths and invalid duration',()=>{
  assert.throws(()=>renderNovaComposedAnimationSvg([frame('chibi','a.png'),frame('adult','b.png')]));
  assert.throws(()=>renderNovaComposedAnimationSvg([frame('adult','a.png'),frame('adult','javascript:bad')]));
  assert.throws(()=>renderNovaComposedAnimationSvg([frame('adult','a.png'),frame('adult','b.png')],{durationMs:NaN}));
});

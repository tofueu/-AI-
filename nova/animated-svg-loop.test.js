import test from 'node:test';
import assert from 'node:assert/strict';
import {renderNovaAnimatedSvg} from './animated-svg.js';

const pose=variant=>({variant,layers:[{src:'body.png',transform:{x:0,y:0,rotation:0,scaleX:1,scaleY:1}}]});

for(const variant of ['chibi','adult']) {
 test(`${variant} animation includes final 1.0 keyTime and seamless wrap`,()=>{
  const svg=renderNovaAnimatedSvg([pose(variant),pose(variant),pose(variant)],{durationMs:900});
  assert.equal((svg.match(/keyTimes="0.00000000;0.33333333;0.66666667;1.00000000"/g)||[]).length,3);
  assert.match(svg,/values="visible;hidden;hidden;visible"/);
  assert.match(svg,/values="hidden;visible;hidden;hidden"/);
  assert.match(svg,/values="hidden;hidden;visible;hidden"/);
 });
}
test('invalid animation duration and frame count rejected',()=>{
 assert.throws(()=>renderNovaAnimatedSvg([pose('chibi')]));
 assert.throws(()=>renderNovaAnimatedSvg([pose('chibi'),pose('chibi')],{durationMs:0}));
});

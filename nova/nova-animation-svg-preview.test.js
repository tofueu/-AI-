import test from 'node:test';
import assert from 'node:assert/strict';
import {renderNovaPoseSvg,renderNovaAnimationSvgFrames} from './nova-animation-svg-preview.js';

for(const variant of ['chibi','adult']) {
 for(const motion of ['idle','walk','typing']) {
  test(`${variant} ${motion} renders changing, standalone SVG frames`,()=>{
   const result=renderNovaAnimationSvgFrames({variant,motion,fps:10,loops:1});
   assert.ok(result.frames.length>1);
   assert.equal(new Set(result.frames.map(f=>f.filename)).size,result.frames.length);
   for(const frame of result.frames) {
    assert.match(frame.svg,/^<svg xmlns="http:\/\/www.w3.org\/2000\/svg"/);
    assert.match(frame.svg,/<\/svg>$/);
    assert.match(frame.svg,/data-joint="head"/);
    assert.match(frame.svg,/data-joint="footL"/);
    assert.doesNotMatch(frame.svg,/undefined|NaN/);
   }
   assert.ok(new Set(result.frames.map(f=>f.svg)).size>1);
  });
 }
}
test('bad animation inputs are rejected',()=>{
 assert.throws(()=>renderNovaPoseSvg('invalid','idle',0));
 assert.throws(()=>renderNovaPoseSvg('chibi','invalid',0));
 assert.throws(()=>renderNovaPoseSvg('chibi','idle',NaN));
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {renderNovaAnimatedSvg} from './nova-animated-svg.js';

for (const variant of ['chibi','adult']) {
 for (const motion of ['idle','walk','typing']) {
  test(`${variant} ${motion} exports a standalone looping SVG`,()=>{
   const svg=renderNovaAnimatedSvg({variant,motion,fps:10});
   assert.match(svg,/^<svg xmlns="http:\/\/www.w3.org\/2000\/svg"/);
   assert.match(svg,/<\/svg>$/);
   assert.match(svg,/animation:nova-frame-0/);
   assert.match(svg,/prefers-reduced-motion:reduce/);
   assert.match(svg,/data-joint="head"/);
   assert.doesNotMatch(svg,/undefined|NaN/);
   assert.ok((svg.match(/class="nova-frame nova-frame-/g)||[]).length>1);
  });
 }
}
test('rejects invalid motion and fps',()=>{
 assert.throws(()=>renderNovaAnimatedSvg({variant:'adult',motion:'invalid'}));
 assert.throws(()=>renderNovaAnimatedSvg({variant:'chibi',motion:'idle',fps:0}));
});

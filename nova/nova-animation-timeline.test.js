import test from 'node:test';
import assert from 'node:assert/strict';
import {planNovaAnimationFrames} from './nova-animation-timeline.js';
for (const variant of ['chibi','adult']) {
 for (const motion of ['idle','walk','typing']) {
  test(`${variant} ${motion} exports deterministic unique frame names`, () => {
   const a=planNovaAnimationFrames({variant,motion,fps:10,loops:2});
   const b=planNovaAnimationFrames({variant,motion,fps:10,loops:2});
   assert.deepEqual(a,b);
   assert.equal(a.frames.length,Math.round(a.durationMs/100));
   assert.equal(new Set(a.frames.map(f=>f.filename)).size,a.frames.length);
   assert.equal(a.frames[0].elapsedMs,0);
   assert.ok(a.frames.at(-1).elapsedMs<a.durationMs);
  });
 }
}
test('invalid settings are rejected',()=>{
 for(const opts of [{variant:'other',motion:'idle'},{variant:'chibi',motion:'jump'},{variant:'adult',motion:'walk',fps:0},{variant:'adult',motion:'walk',fps:61},{variant:'adult',motion:'walk',loops:0},{variant:'adult',motion:'walk',loops:11}])
  assert.throws(()=>planNovaAnimationFrames(opts));
});

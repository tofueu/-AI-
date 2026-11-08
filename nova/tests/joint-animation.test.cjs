'use strict';
const assert=require('node:assert/strict');
const {variants,clips,pose}=require('../rig/joint-animation.cjs');
for(const variant of Object.keys(variants)){
 for(const clip of Object.keys(clips)){
  const p=pose(variant,clip,0),mid=pose(variant,clip,clips[clip].duration/2),end=pose(variant,clip,clips[clip].duration);
  assert.deepEqual(Object.keys(p),Object.keys(variants[variant]));
  assert.deepEqual(p,end,'loop seam must match');
  assert.ok(Object.values(mid).every(v=>v.every(Number.isFinite)));
  console.log('PASS',variant,clip,'joint count',Object.keys(p).length);
 }
}
assert.notDeepEqual(pose('chibi','idle',0),pose('chibi','idle',600));
assert.throws(()=>pose('missing','idle',0),TypeError);
assert.throws(()=>pose('adult','walk',NaN),TypeError);
console.log('PASS interpolation, loop seam and invalid inputs');

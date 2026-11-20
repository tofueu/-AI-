import test from 'node:test';
import assert from 'node:assert/strict';
import {exportNovaModFrames} from './nova-export-mod-frames.js';
for(const variant of ['chibi','adult'])for(const motion of ['idle','walk','typing']){
 test(`${variant} ${motion}: exports static frames`,()=>{
  const result=exportNovaModFrames(variant,motion,{head:'art/head.png',hat:null},{},{frames:4});
  assert.equal(result.frames.length,4);
  assert.equal(result.frameDurationMs,result.durationMs/4);
  assert.match(result.frames[0].svg,/data-animated-layer="head"/);
  assert.match(result.frames[0].svg,/data-animated-layer="top"/);
  assert.doesNotMatch(result.frames[0].svg,/data-animated-layer="hat"/);
  assert.doesNotMatch(result.frames[0].svg,/@keyframes|animation:/);
  assert.match(result.frames[3].filename,/003\.svg$/);
  assert.ok(result.frames.every(frame=>frame.svg.endsWith('</svg>')));
 });
}
test('rejects invalid MOD paths',()=>{
 assert.throws(()=>exportNovaModFrames('chibi','idle',{head:'../bad.png'}),/Unsafe/);
});

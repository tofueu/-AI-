import test from 'node:test';
import assert from 'node:assert/strict';
import {renderNovaAnimatedModSvg} from './nova-animated-mod-preview.js';
for(const variant of ['chibi','adult'])for(const motion of ['idle','walk','typing']){
 test(`${variant} ${motion}: animated layered preview`,()=>{
  const result=renderNovaAnimatedModSvg(variant,motion,{head:'art/head.png',hat:null});
  assert.equal(result.frames,12);
  assert.equal((result.svg.match(/data-frame="/g)||[]).length,12);
  assert.match(result.svg,/data-animated-layer="head"/);
  assert.match(result.svg,/href="art\/head.png"/);
  assert.doesNotMatch(result.svg,/data-animated-layer="hat"/);
  assert.match(result.svg,/data-animated-layer="top"/);
  assert.match(result.svg,/data-animated-layer="bottom"/);
  assert.match(result.svg,/animation:nova-frame-0/);
 });
}
test('reject invalid frames, time, motion, variant and paths',()=>{
 assert.throws(()=>renderNovaAnimatedModSvg('chibi','idle',{}, {},{frames:1}),/frames/);
 assert.throws(()=>renderNovaAnimatedModSvg('chibi','idle',{}, {},{durationMs:0}),/duration/);
 assert.throws(()=>renderNovaAnimatedModSvg('chibi','jump'),/motion/);
 assert.throws(()=>renderNovaAnimatedModSvg('unknown','idle'),/variant/);
 assert.throws(()=>renderNovaAnimatedModSvg('chibi','idle',{head:'../escape.png'}),/Unsafe/);
});

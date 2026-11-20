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

test('animation keyframes hold each frame until the next frame begins',()=>{
 const {svg}=renderNovaAnimatedModSvg('chibi','idle',{}, {},{frames:4});
 const first=svg.match(/@keyframes nova-frame-0\{([^}]+\}[^}]+\}[^}]+\}[^}]+\})\}/)?.[1]??'';
 assert.match(first,/0%\{opacity:1\}/);
 assert.match(first,/24\.99990%\{opacity:1\}/);
 assert.match(first,/25\.00000%\{opacity:0\}/);
 assert.match(svg,/@keyframes nova-frame-1\{/);
 assert.match(svg,/25\.00000%\{opacity:1\}/);
 assert.match(svg,/50\.00000%\{opacity:0\}/);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {renderNovaAnimatedModSvg} from './nova-animated-mod-preview.js';
import {exportNovaModFrames} from './nova-export-mod-frames.js';

for (const variant of ['chibi','adult']) {
 test(`${variant}: animated MOD preserves full PNG image tags and fallback clothes`,()=>{
  const mod={head:'art/head.png',hat:null};
  const result=renderNovaAnimatedModSvg(variant,'idle',mod,{}, {frames:4});
  assert.equal((result.svg.match(/<image data-layer="head"/g)||[]).length,4);
  assert.equal((result.svg.match(/<rect data-layer="top"/g)||[]).length,4);
  assert.doesNotMatch(result.svg,/undefined|data-animated-layer="hat"/);
  const exported=exportNovaModFrames(variant,'idle',mod,{}, {frames:4});
  for(const frame of exported.frames){
   assert.match(frame.svg,/<image data-layer="head"[^>]*\/>/);
   assert.match(frame.svg,/<rect data-layer="top"[^>]*\/>/);
   assert.doesNotMatch(frame.svg,/undefined/);
  }
 });
}

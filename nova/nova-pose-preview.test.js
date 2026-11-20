import test from 'node:test';
import assert from 'node:assert/strict';
import {renderNovaPoseSvg,renderNovaPoseSequence} from './nova-pose-preview.js';
for(const variant of ['chibi','adult'])for(const motion of ['idle','walk','typing']){
 test(`${variant} ${motion}: SVG and full-cycle frames`,()=>{
  const sequence=renderNovaPoseSequence(variant,motion,{frames:12});
  assert.equal(sequence.length,12);
  assert.match(sequence[0].svg,/<svg /);
  assert.match(sequence[0].svg,/data-joint="head"/);
  assert.equal(new Set(sequence.map(f=>f.svg)).size>1,true);
  const duration=motion==='idle'?1200:motion==='walk'?800:600;
  const normalize=s=>s.replace(/data-time-ms="[^"]+"/,'');
  assert.equal(normalize(renderNovaPoseSvg(variant,motion,0)),normalize(renderNovaPoseSvg(variant,motion,duration)));
 });
}
test('invalid parameters rejected',()=>{
 assert.throws(()=>renderNovaPoseSequence('chibi','walk',{frames:1}),/frames/);
 assert.throws(()=>renderNovaPoseSequence('adult','walk',{durationMs:0}),/duration/);
 assert.throws(()=>renderNovaPoseSvg('unknown','idle'),/variant/);
});

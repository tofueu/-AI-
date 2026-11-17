import test from 'node:test';
import assert from 'node:assert/strict';
import {assessNovaAnimationReadiness, assessNovaAnimationPair} from './animation-readiness.js';
const clip = action => ({action, frames: [0,1,2].map(index => ({index,asset:`${action}-${index}.png`,durationMs:120}))});
const good = () => ['idle','walk','type'].map(clip);
test('both variants require complete action sets', () => {
  assert.equal(assessNovaAnimationPair(good(),good()).ready,true);
  assert.equal(assessNovaAnimationPair(good(),good().slice(1)).ready,false);
});
test('missing action fails closed', () => assert.deepEqual(assessNovaAnimationReadiness('chibi',[]).failures.length,3));
test('single still image is not animation', () => assert.equal(assessNovaAnimationReadiness('chibi',[{action:'idle',frames:[{index:0,asset:'still.png',durationMs:120}]},clip('walk'),clip('type')]).ready,false));
test('duplicate assets fail even with three frames', () => {
  const clips=good(); clips[0].frames[1].asset=clips[0].frames[0].asset;
  assert.equal(assessNovaAnimationReadiness('adult',clips).ready,false);
});
test('out of order frames fail', () => {
  const clips=good(); clips[1].frames[1].index=4;
  assert.equal(assessNovaAnimationReadiness('adult',clips).ready,false);
});
test('invalid durations fail', () => {
  const clips=good(); clips[2].frames[0].durationMs=0;
  assert.equal(assessNovaAnimationReadiness('adult',clips).ready,false);
});
test('duplicate action clips fail', () => assert.equal(assessNovaAnimationReadiness('chibi',[...good(),clip('idle')]).ready,false));
test('malformed required action set rejected', () => assert.throws(() => assessNovaAnimationReadiness('chibi',good(),['idle','idle']),/Invalid/));

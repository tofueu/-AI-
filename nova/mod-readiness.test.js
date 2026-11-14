import test from 'node:test';
import assert from 'node:assert/strict';
import {assessNovaModReadiness} from './mod-readiness.js';
const pack=(variant,slots)=>({variant,layers:slots.map(slot=>({slot,hidden:false}))});
for(const variant of ['chibi','adult']) {
 test(`${variant}: blank template is not ready`,()=>{
  const result=assessNovaModReadiness({variant,layers:['body','head','top','bottom'].map(slot=>({slot,hidden:true}))});
  assert.equal(result.ready,false);assert.deepEqual(result.missing,['body','head','top','bottom']);
 });
 test(`${variant}: complete two-piece outfit is ready`,()=>{
  assert.equal(assessNovaModReadiness(pack(variant,['body','head','top','bottom'])).ready,true);
 });
 test(`${variant}: dress is a complete outfit`,()=>{
  assert.equal(assessNovaModReadiness(pack(variant,['body','head','dress'])).ready,true);
 });
 test(`${variant}: missing bottom is not ready`,()=>{
  assert.deepEqual(assessNovaModReadiness(pack(variant,['body','head','top'])).missing,['bottom']);
 });
}
test('hidden clothing does not count as painted',()=>{
 const result=assessNovaModReadiness({variant:'chibi',layers:[{slot:'body',hidden:false},{slot:'head',hidden:false},{slot:'top',hidden:false},{slot:'bottom',hidden:true}]});
 assert.deepEqual(result.missing,['bottom']);
});
test('invalid pack is rejected',()=>assert.throws(()=>assessNovaModReadiness({variant:'other',layers:[]})));

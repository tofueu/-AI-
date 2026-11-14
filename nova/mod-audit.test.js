import test from 'node:test';
import assert from 'node:assert/strict';
import {auditNovaArtwork} from './mod-audit.js';
const complete=variant=>({variant,layers:['body','head','dress'].map(slot=>({slot,hidden:false}))});
test('both complete variants pass independently',async()=>{
 const report=await auditNovaArtwork({chibi:'c',adult:'a'},async path=>complete(path==='c'?'chibi':'adult'));
 assert.equal(report.ready,true);
 assert.equal(report.variants.chibi.ready,true);
 assert.equal(report.variants.adult.ready,true);
});
test('one missing variant fails entire audit',async()=>{
 const report=await auditNovaArtwork({chibi:'c'},async()=>complete('chibi'));
 assert.equal(report.ready,false);
 assert.match(report.variants.adult.error,/Missing/);
});
test('variant mismatch is rejected',async()=>{
 const report=await auditNovaArtwork({chibi:'c',adult:'a'},async()=>complete('chibi'));
 assert.equal(report.ready,false);
 assert.match(report.variants.adult.error,/Expected adult/);
});
test('failed pack does not prevent checking the other variant',async()=>{
 const report=await auditNovaArtwork({chibi:'c',adult:'a'},async path=>{
  if(path==='c')throw new Error('bad PNG');
  return complete('adult');
 });
 assert.equal(report.ready,false);
 assert.match(report.variants.chibi.error,/bad PNG/);
 assert.equal(report.variants.adult.ready,true);
});
test('blank art cannot pass',async()=>{
 const report=await auditNovaArtwork({chibi:'c',adult:'a'},async path=>({variant:path==='c'?'chibi':'adult',layers:['body','head','dress'].map(slot=>({slot,hidden:true}))}));
 assert.equal(report.ready,false);
 assert.deepEqual(report.variants.chibi.missing,['body','head','top','bottom']);
});

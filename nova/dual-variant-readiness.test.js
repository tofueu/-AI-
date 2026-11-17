import test from 'node:test';
import assert from 'node:assert/strict';
import {assessNovaPairReadiness} from './dual-variant-readiness.js';
const pack=(variant,visible)=>({variant,layers:['body','head','top','bottom'].map(slot=>({slot,hidden:!visible.includes(slot)}))});
test('both variants with painted essentials pass',()=>{
 const result=assessNovaPairReadiness(pack('chibi',['body','head','top','bottom']),pack('adult',['body','head','top','bottom']));
 assert.equal(result.ready,true);
 assert.equal(result.variants.adult.ready,true);
});
test('adult missing clothing blocks release even when chibi is ready',()=>{
 const result=assessNovaPairReadiness(pack('chibi',['body','head','top','bottom']),pack('adult',['body','head','top']));
 assert.equal(result.ready,false);
 assert.deepEqual(result.variants.adult.missing,['bottom']);
});
test('blank chibi blocks release even when adult is ready',()=>{
 const result=assessNovaPairReadiness(pack('chibi',[]),pack('adult',['body','head','top','bottom']));
 assert.equal(result.ready,false);
 assert.deepEqual(result.variants.chibi.missing,['body','head','top','bottom']);
});
test('variant order cannot silently swap',()=>assert.throws(()=>assessNovaPairReadiness(pack('adult',[]),pack('chibi',[])),/Expected chibi/));
test('malformed pack fails closed',()=>assert.throws(()=>assessNovaPairReadiness(null,pack('adult',[])),/Invalid validated/));

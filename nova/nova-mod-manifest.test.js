import test from 'node:test';
import assert from 'node:assert/strict';
import {resolveNovaModManifest} from './nova-mod-manifest.js';
const base={body:'builtin:body',head:'builtin:head'};
test('chibi and adult use independent art',()=>{
 const m={version:1,variants:{chibi:{hairFront:'chibi/hair.png',top:'chibi/top.png'},adult:{hairFront:'adult/hair.png'}}};
 const a=resolveNovaModManifest(m,'chibi',base),b=resolveNovaModManifest(m,'adult',base);
 assert.equal(a.layers.hairFront,'chibi/hair.png');
 assert.equal(b.layers.hairFront,'adult/hair.png');
 assert.equal(a.layers.top,'chibi/top.png');
 assert.equal(b.layers.top,'builtin:basic-top');
 assert.equal(a.ready,true);assert.equal(b.ready,true);
});
test('empty accessory hidden, partial clothing has independent fallback',()=>{
 const r=resolveNovaModManifest({version:1,variants:{chibi:{hat:'',top:'outfit/top.png',bottom:null}}},'chibi',base);
 assert.equal(r.layers.hat,null);assert.equal(r.layers.top,'outfit/top.png');
 assert.equal(r.layers.bottom,'builtin:basic-bottom');
});
test('missing body and head are reported instead of pretending artwork exists',()=>{
 const r=resolveNovaModManifest({version:1,variants:{}},'adult');
 assert.equal(r.ready,false);assert.deepEqual(r.missing.sort(),['body','head']);
});
test('reject unsafe or malformed assets',()=>{
 for(const asset of ['../secret.png','a/../../secret.png','/absolute.png','C:\\temp\\a.png','https://x/a.png','a.svg',{},false]){
  assert.throws(()=>resolveNovaModManifest({version:1,variants:{adult:{hairFront:asset}}},'adult',base));
 }
 assert.throws(()=>resolveNovaModManifest({version:2,variants:{}},'adult'));
 assert.throws(()=>resolveNovaModManifest({version:1,variants:{adult:{unknown:'x.png'}}},'adult'));
});

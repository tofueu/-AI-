import test from 'node:test';
import assert from 'node:assert/strict';
import {resolveNovaLayers} from './nova-rig-motion.js';

test('partial MOD cannot leave either basic clothing slot empty',()=>{
 for(const mod of [{top:null,bottom:'mod:skirt'},{top:'mod:shirt',bottom:null},{top:false,bottom:false},{top:'',bottom:''}]){
  const layers=resolveNovaLayers(mod);
  assert.ok(layers.top);
  assert.ok(layers.bottom);
  assert.ok(layers.underwear);
 }
});
test('valid user clothing remains intact and empty accessories stay hidden',()=>{
 const layers=resolveNovaLayers({top:'mod:shirt',bottom:'mod:skirt',hat:null,accessory:''});
 assert.equal(layers.top,'mod:shirt');
 assert.equal(layers.bottom,'mod:skirt');
 assert.equal(layers.hat,null);
 assert.equal(layers.accessory,null);
});
test('invalid empty base clothing falls back to builtins',()=>{
 const layers=resolveNovaLayers({top:null,bottom:null,underwear:null},{top:'',bottom:false,underwear:''});
 assert.equal(layers.top,'builtin:basic-top');
 assert.equal(layers.bottom,'builtin:basic-bottom');
 assert.equal(layers.underwear,'builtin:basic-underwear');
});

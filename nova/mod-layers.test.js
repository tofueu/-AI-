import test from 'node:test';
import assert from 'node:assert/strict';
import {resolveNovaLayers,LAYER_SLOTS} from './mod-layers.js';
const safeOutfit={top:{src:'safe/top.png'},bottom:{src:'safe/bottom.png'}};
const base={body:{src:'base/body.png'},head:{src:'base/head.png'},top:{src:'base/top.png'},bottom:{src:'base/bottom.png'},hair_front:{src:'base/hair.png'}};
const resolve=(overrides={})=>resolveNovaLayers({variant:'chibi',base,mods:[],safeOutfit,...overrides});
const find=(layers,slot)=>layers.find(layer=>layer.slot===slot);
test('keeps original art when MOD only replaces one slot',()=>{
 const layers=resolve({mods:[{variant:'chibi',layers:{hair_front:{src:'mods/new-hair.png'}}}]});
 assert.equal(find(layers,'hair_front').src,'mods/new-hair.png');
 assert.equal(find(layers,'head').src,'base/head.png');
});
test('blank hidden/transparent template layers inherit base',()=>{
 const layers=resolve({mods:[{variant:'universal',layers:{hair_front:{hidden:true},head:{transparent:true}}}]});
 assert.equal(find(layers,'hair_front').src,'base/hair.png');
 assert.equal(find(layers,'head').src,'base/head.png');
 assert.equal(find(layers,'body').src,'base/body.png');
});
test('explicitly hidden clothing MOD restores safe outfit',()=>{
 const layers=resolve({mods:[{variant:'chibi',layers:{top:{operation:'hide'},bottom:{operation:'hide'}}}]});
 assert.equal(find(layers,'top').src,'safe/top.png');
 assert.equal(find(layers,'bottom').src,'safe/bottom.png');
});
test('full character replacement keeps slot order',()=>{
 const layers=resolve({mods:[{variant:'chibi',layers:Object.fromEntries(LAYER_SLOTS.map(slot=>[slot,{src:'full/'+slot+'.png'}]))}]});
 assert.deepEqual(layers.map(layer=>layer.slot),LAYER_SLOTS);
 assert.equal(find(layers,'body').src,'full/body.png');
});
test('adult and chibi MODs cannot be accidentally mixed',()=>{
 assert.throws(()=>resolve({mods:[{variant:'adult',layers:{}}]}),/Incompatible MOD/);
 assert.ok(resolve({variant:'adult',mods:[{variant:'adult',layers:{}}]}).length);
});
test('rejects malformed slots and missing clothing fallback',()=>{
 assert.throws(()=>resolve({mods:[{variant:'chibi',layers:{unknown:{src:'bad.png'}}}]}),/Invalid MOD layer/);
 assert.throws(()=>resolve({base:{},safeOutfit:{}}),/Missing safe outfit fallback/);
});

test('explicit hide removes accessories, while blank templates inherit across packs',()=>{
 const layers=resolve({mods:[
  {variant:'chibi',layers:{hat:{src:'first/hat.png'},hair_front:{src:'first/hair.png'}}},
  {variant:'chibi',layers:{hat:{operation:'hide'},hair_front:{hidden:true}}}
 ]});
 assert.equal(find(layers,'hat'),undefined);
 assert.equal(find(layers,'hair_front').src,'first/hair.png');
});
test('rejects unknown MOD operations',()=>{
 assert.throws(()=>resolve({mods:[{variant:'chibi',layers:{hat:{operation:'erase',src:'x.png'}}}]}),/Invalid MOD operation/);
});

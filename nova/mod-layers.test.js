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

test('explicit hide wins over legacy blank template flags',()=>{
 const layers=resolve({mods:[{variant:'chibi',layers:{hat:{src:'first/hat.png'}}},{variant:'chibi',layers:{hat:{operation:'hide',hidden:true}}}]});
 assert.equal(find(layers,'hat'),undefined);
});
test('unknown operation cannot be disguised by hidden or transparent flags',()=>{
 assert.throws(()=>resolve({mods:[{variant:'chibi',layers:{hat:{operation:'erase',hidden:true}}}]}),/Invalid MOD operation/);
 assert.throws(()=>resolve({mods:[{variant:'chibi',layers:{hat:{operation:'erase',transparent:true}}}]}),/Invalid MOD operation/);
});

test('rejects array layer maps and explicit replacement without artwork',()=>{
 assert.throws(()=>resolve({mods:[{variant:'chibi',layers:[]}]}),/Incompatible MOD/);
 assert.throws(()=>resolve({mods:[{variant:'chibi',layers:{hat:{operation:'replace',hidden:true}}}]}),/Replacement requires image source/);
 assert.throws(()=>resolve({mods:[{variant:'chibi',layers:{hat:{operation:'replace',src:'   '}}}]}),/Replacement requires image source/);
 const layers=resolve({mods:[{variant:'chibi',layers:{hat:{operation:'replace',src:'new/hat.png'}}}]});
 assert.equal(find(layers,'hat').src,'new/hat.png');
});

test('rejects malformed base maps and blank base artwork',()=>{
 assert.throws(()=>resolve({base:[]}),/Invalid base layer map/);
 assert.throws(()=>resolve({base:{head:{src:'   '}}}),/Invalid base layer/);
 assert.throws(()=>resolve({base:{head:{operation:'hide',src:'head.png'}}}),/Invalid base layer/);
 assert.throws(()=>resolve({base:{head:{src:'head.png',hidden:true}}}),/Invalid base layer/);
});
test('rejects malformed or blank safe outfit artwork',()=>{
 assert.throws(()=>resolve({base:{},safeOutfit:[]}),/Invalid safe outfit map/);
 assert.throws(()=>resolve({base:{},safeOutfit:{top:{src:'  '},bottom:{src:'safe/bottom.png'}}}),/Missing safe outfit fallback/);
 assert.throws(()=>resolve({base:{},safeOutfit:{top:{src:'safe/top.png',operation:'hide'},bottom:{src:'safe/bottom.png'}}}),/Missing safe outfit fallback/);
});

test('implicit MOD replacements reject blank or missing artwork',()=>{
 assert.throws(()=>resolve({mods:[{variant:'chibi',layers:{hat:{src:'   '}}}]}),/Invalid MOD layer|Invalid MOD artwork/);
 assert.throws(()=>resolve({mods:[{variant:'chibi',layers:{hat:{src:null}}}]}),/Invalid MOD layer|Invalid MOD artwork/);
 const layers=resolve({mods:[{variant:'chibi',layers:{hat:{src:'new/hat.png'}}}]});
 assert.equal(find(layers,'hat').src,'new/hat.png');
});

test('explicit replacement cannot silently inherit when hidden or transparent',()=>{
 for (const flag of ['hidden','transparent']) {
  assert.throws(()=>resolve({mods:[{variant:'chibi',layers:{hat:{operation:'replace',src:'mod/hat.png',[flag]:true}}}]}),/Replacement requires visible image source/);
 }
 const layers=resolve({mods:[{variant:'chibi',layers:{hat:{operation:'replace',src:'mod/hat.png'}}}]});
 assert.equal(find(layers,'hat').src,'mod/hat.png');
});

test('MOD metadata cannot override the canonical output slot identity',()=>{
 const layers=resolve({mods:[{variant:'chibi',layers:{hat:{src:'mod/hat.png',slot:'body'}}}]});
 assert.equal(find(layers,'hat').slot,'hat');
 assert.equal(find(layers,'hat').src,'mod/hat.png');
 assert.equal(find(layers,'body').src,'base/body.png');
 assert.equal(layers.filter(layer=>layer.slot==='body').length,1);
});

test('inherited base slots do not inject artwork',()=>{
 const inherited=Object.create({head:{src:'untrusted/head.png'}});
 inherited.body={src:'base/body.png'};
 const layers=resolve({base:inherited});
 assert.equal(find(layers,'head'),undefined);
 assert.equal(find(layers,'body').src,'base/body.png');
 assert.equal(find(layers,'top').src,'safe/top.png');
});

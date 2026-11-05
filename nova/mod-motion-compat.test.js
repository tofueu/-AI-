import test from 'node:test';
import assert from 'node:assert/strict';
import {resolveNovaMotionCompatibility} from './mod-motion-compat.js';
const rig={variant:'chibi',bones:['root','head'],animations:[{name:'idle',bones:['root']},{name:'walk',bones:['root']},{name:'blink',bones:['head']}]};
const layers=['body','head','eyes','top','bottom'].map(slot=>({slot}));
test('compatible replacement artwork inherits available rig motions',()=>{
 const result=resolveNovaMotionCompatibility({variant:'chibi',rig,visibleLayers:layers});
 assert.equal(result.find(x=>x.name==='walk').enabled,true);
 assert.equal(result.find(x=>x.name==='blink').enabled,true);
 assert.equal(result.find(x=>x.name==='typing').enabled,false);
});
test('missing slot disables only dependent motion',()=>{
 const result=resolveNovaMotionCompatibility({variant:'chibi',rig,visibleLayers:layers.filter(x=>x.slot!=='eyes')});
 assert.equal(result.find(x=>x.name==='blink').enabled,false);
 assert.equal(result.find(x=>x.name==='idle').enabled,true);
});
test('adult MOD cannot use chibi rig',()=>assert.throws(()=>resolveNovaMotionCompatibility({variant:'adult',rig,visibleLayers:layers}),/Incompatible/));
test('unknown bone in animation is rejected',()=>assert.throws(()=>resolveNovaMotionCompatibility({variant:'chibi',rig:{...rig,animations:[{name:'idle',bones:['missing']}]},visibleLayers:layers}),/unknown bone/));
test('duplicate visible slots are rejected',()=>assert.throws(()=>resolveNovaMotionCompatibility({variant:'chibi',rig,visibleLayers:[...layers,layers[0]]}),/duplicate/));

import test from 'node:test';
import assert from 'node:assert/strict';
import {composeNovaRig} from './rig-compose.js';
const bones=[{id:'root',x:0,y:0,rotation:0},{id:'hand',parent:'root',x:10,y:0,rotation:0}];
test('parent rotation moves child in world space',()=>{
 const [root,hand]=composeNovaRig(bones,{root:{rotation:90}});
 assert.equal(root.rotation,90);
 assert.ok(Math.abs(hand.x)<1e-8);
 assert.ok(Math.abs(hand.y-10)<1e-8);
});
test('accepts independent skeleton dimensions',()=>{
 assert.equal(composeNovaRig([{id:'head',x:4,y:7}],{})[0].x,4);
});
test('rejects missing parents, duplicates, invalid transforms and unknown joints',()=>{
 assert.throws(()=>composeNovaRig([bones[1],bones[0]]));
 assert.throws(()=>composeNovaRig([bones[0],bones[0]]));
 assert.throws(()=>composeNovaRig(bones,{hand:{x:Infinity}}));
 assert.throws(()=>composeNovaRig(bones,{ghost:{x:2}}));
});

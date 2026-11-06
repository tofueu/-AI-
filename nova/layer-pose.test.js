import test from 'node:test';
import assert from 'node:assert/strict';
import {bindNovaLayersToPose,NOVA_SLOT_JOINTS} from './layer-pose.js';
import {LAYER_SLOTS} from './mod-layers.js';
import {RIG_JOINTS} from './rig-animation.js';
import {sampleNovaTask} from './task-motion-adapter.js';

test('all MOD slots have valid joints',()=>{
 assert.deepEqual(Object.keys(NOVA_SLOT_JOINTS).sort(),[...LAYER_SLOTS].sort());
 for(const joint of Object.values(NOVA_SLOT_JOINTS)) assert.ok(RIG_JOINTS.includes(joint));
});
for(const variant of ['chibi','adult']) test(variant+' task pose binds replaceable layers',()=>{
 const sampled=sampleNovaTask({variant,state:'running',elapsedSeconds:0.2});
 const layers=[{slot:'hair_front',src:'hair.png'},{slot:'top',src:'top.png'},{slot:'hand_r',src:'hand.png'}];
 const result=bindNovaLayersToPose({variant,layers,pose:sampled.pose});
 assert.deepEqual(result.map(x=>x.joint),['head','torso','wrist_r']);
 assert.deepEqual(result[2].transform,sampled.pose.wrist_r);
 result[2].transform.x=1000;
 assert.notEqual(sampled.pose.wrist_r.x,1000);
 assert.equal(layers[2].src,'hand.png');
});
test('rejects invisible, duplicate, and incomplete pose layers',()=>{
 const pose={head:{x:0,y:0,rotation:0}};
 const args={variant:'chibi',pose};
 assert.throws(()=>bindNovaLayersToPose({...args,layers:[{slot:'hat',src:'hat.png'},{slot:'hat',src:'hat2.png'}]}),/Invalid visible/);
 assert.throws(()=>bindNovaLayersToPose({...args,layers:[{slot:'hat',src:'hat.png',transparent:true}]}),/Invalid visible/);
 assert.throws(()=>bindNovaLayersToPose({...args,layers:[{slot:'top',src:'top.png'}]}),/Missing NOVA joint/);
});

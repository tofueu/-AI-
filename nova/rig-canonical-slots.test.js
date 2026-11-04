import test from 'node:test';
import assert from 'node:assert/strict';
import {DEFAULT_LAYER_JOINTS,bindRigLayers} from './rig-layers.js';
import {RIG_JOINTS} from './rig-animation.js';
import {LAYER_SLOTS} from './mod-layers.js';

test('all canonical MOD slots have an explicit valid rig joint',()=>{
  for(const slot of LAYER_SLOTS){
    assert.ok(Object.hasOwn(DEFAULT_LAYER_JOINTS,slot),'Missing joint for '+slot);
    assert.ok(RIG_JOINTS.includes(DEFAULT_LAYER_JOINTS[slot]),'Invalid joint for '+slot);
  }
});
for(const variant of ['chibi','adult']){
  test(variant+' face follows head and wings follow torso with root inheritance',()=>{
    const pose=Object.fromEntries(RIG_JOINTS.map(joint=>[joint,{x:0,y:0,rotation:0}]));
    pose.root.x=10;pose.head.y=12;pose.torso.y=7;
    const result=bindRigLayers({variant,pose},{
      brows:{src:'brows.png'},nose:{src:'nose.png'},hair_side:{src:'side.png'},
      wings:{src:'wings.png'},accessory:{src:'accessory.png'}
    });
    assert.deepEqual(result.filter(x=>['brows','nose','hair_side'].includes(x.slot)).map(x=>[x.joint,x.x,x.y]),
      Array.from({length:3},()=>['head',10,12]));
    assert.deepEqual(result.filter(x=>['wings','accessory'].includes(x.slot)).map(x=>[x.joint,x.x,x.y]),
      Array.from({length:2},()=>['torso',10,7]));
  });
}

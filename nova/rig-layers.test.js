import test from 'node:test';
import assert from 'node:assert/strict';
import {bindRigLayers} from './rig-layers.js';
const sample = variant => ({variant,pose:{root:{x:0,y:0,rotation:0},head:{x:10,y:20,rotation:30},torso:{x:3,y:4,rotation:5}}});
for (const variant of ['chibi','adult']) test(variant+' binds layers to animated joints',()=>{
  const layers={hair:{src:'hair.png',offset:{x:1,y:-2,rotation:3}},top:{src:'shirt.png'},hat:{src:'hat.png',hidden:true},accessory:{src:'x.png',operation:'hide'}};
  const result=bindRigLayers(sample(variant),layers);
  assert.deepEqual(result,[{slot:'hair',src:'hair.png',joint:'head',x:11,y:18,rotation:33},{slot:'top',src:'shirt.png',joint:'torso',x:3,y:4,rotation:5}]);
  assert.equal(layers.hair.offset.x,1);
});
test('supports custom joints and unknown slots on root',()=>{
 const result=bindRigLayers(sample('chibi'),{custom:{image:'c.png'},pin:{path:'p.png'}},{joints:{pin:'head'}});
 assert.equal(result[0].joint,'root'); assert.equal(result[1].x,10);
});
test('rejects malformed visible layers and joint mapping',()=>{
 assert.throws(()=>bindRigLayers(sample('adult'),{hair:{src:' '}}),/Missing image source/);
 assert.throws(()=>bindRigLayers(sample('adult'),{hair:{src:'a.png',offset:{x:NaN,y:0,rotation:0}}}),/Invalid layer offset/);
 assert.throws(()=>bindRigLayers(sample('adult'),{hair:{src:'a.png'}},{joints:{hair:'invalid'}}),/Invalid joint binding/);
 assert.throws(()=>bindRigLayers(sample('adult'),[]),/Invalid layer map/);
});

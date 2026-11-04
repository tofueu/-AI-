import test from 'node:test';
import assert from 'node:assert/strict';
import {bindRigLayers} from './rig-layers.js';
import {RIG_JOINTS} from './rig-animation.js';
const pose=Object.fromEntries(RIG_JOINTS.map(j=>[j,{x:0,y:0,rotation:0}]));
pose.root={x:11,y:-7,rotation:0};
pose.head={x:3,y:4,rotation:15};
test('all attached layers inherit root translation exactly once',()=>{
 const layers=bindRigLayers({variant:'chibi',pose},{
   body:{src:'body.png'},head:{src:'head.png'},hat:{src:'hat.png'}
 });
 assert.deepEqual(layers.map(x=>[x.slot,x.x,x.y]),[
  ['body',11,-7],['head',14,-3],['hat',14,-3]
 ]);
});
test('root-bound custom layer does not double-count root movement',()=>{
 const [layer]=bindRigLayers({variant:'adult',pose},{custom:{src:'custom.png'}});
 assert.equal(layer.x,11);assert.equal(layer.y,-7);
});
test('hidden layers remain absent and offsets remain local',()=>{
 const result=bindRigLayers({variant:'chibi',pose},{
  head:{src:'head.png',offset:{x:2,y:5,rotation:6}},
  hat:{src:'hat.png',hidden:true}
 });
 assert.equal(result.length,1);
 assert.deepEqual([result[0].x,result[0].y,result[0].rotation],[16,2,21]);
});

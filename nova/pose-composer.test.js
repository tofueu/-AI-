import test from 'node:test';
import assert from 'node:assert/strict';
import {composeNovaPose,sampleNovaWorldPose,transformNovaPoint} from './pose-composer.js';

for(const variant of ['chibi','adult']) {
 test(variant+' inherits animated parent rotation and translation',()=>{
  const rig={variant,bones:['root','head'],parents:{head:'root'},animations:[{name:'nod',durationMs:1000,loop:false,tracks:[
   {bone:'root',keyframes:[{timeMs:0,x:10,rotation:0},{timeMs:1000,x:10,rotation:90}]},
   {bone:'head',keyframes:[{timeMs:0,x:5,y:0},{timeMs:1000,x:5,y:0}]}
  ]}]};
  const pose=sampleNovaWorldPose(rig,'nod',1000);
  const point=transformNovaPoint(pose.matrices.head,0,0);
  assert.ok(Math.abs(point.x-10)<1e-9);
  assert.ok(Math.abs(point.y-5)<1e-9);
  assert.equal(pose.timeMs,1000);
 });
}
test('rejects cycles and unknown parent names',()=>{
 const transforms={a:{x:0,y:0,rotation:0,scaleX:1,scaleY:1},b:{x:0,y:0,rotation:0,scaleX:1,scaleY:1}};
 assert.throws(()=>composeNovaPose({bones:['a','b'],parents:{a:'b',b:'a'}},{transforms}),/Cyclic/);
 assert.throws(()=>composeNovaPose({bones:['a','b'],parents:{a:'missing'}},{transforms}),/Invalid bone parent/);
});
test('rejects invalid transforms and points',()=>{
 assert.throws(()=>composeNovaPose({bones:['a']},{transforms:{a:{x:NaN}}}),/Invalid bone transform/);
 assert.throws(()=>transformNovaPoint([1,0,0,1,0,0],Infinity,0),/Invalid point transform/);
});

test('special bone names remain independent matrix entries',()=>{
 const neutral={x:0,y:0,rotation:0,scaleX:1,scaleY:1};
 const transforms=Object.fromEntries([['__proto__',{...neutral,x:7}],['constructor',{...neutral,x:3}],['toString',{...neutral,x:2}]]);
 const pose=composeNovaPose({bones:['__proto__','constructor','toString'],parents:{}},{name:'idle',timeMs:0,transforms});
 assert.equal(Object.getPrototypeOf(pose.matrices),null);
 assert.equal(pose.matrices['__proto__'][4],7);
 assert.equal(pose.matrices.constructor[4],3);
 assert.equal(pose.matrices.toString[4],2);
});

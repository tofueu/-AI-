import test from 'node:test';
import assert from 'node:assert/strict';
import {NOVA_TASK_STATES,actionForNovaTask,sampleNovaTask} from './task-motion-adapter.js';
import {RIG_JOINTS} from './rig-animation.js';

test('each workbench task state has a motion',()=>{
 assert.deepEqual(NOVA_TASK_STATES,['idle','queued','running','reviewing','succeeded','failed']);
 assert.equal(actionForNovaTask('running'),'type');
 assert.equal(actionForNovaTask('failed'),'cry');
 assert.throws(()=>actionForNovaTask('__proto__'),/Invalid NOVA task state/);
});
for(const variant of ['chibi','adult']) for(const state of NOVA_TASK_STATES)
 test(variant+' '+state+' produces full joint pose',()=>{
  const result=sampleNovaTask({variant,state,elapsedSeconds:0.2});
  assert.equal(result.variant,variant);
  assert.equal(result.state,state);
  assert.deepEqual(Object.keys(result.pose),RIG_JOINTS);
  assert.ok(result.duration>0);
 });
test('task adapter validates sample time and supports clamping',()=>{
 assert.throws(()=>sampleNovaTask({variant:'adult',state:'running',elapsedSeconds:NaN}),/Invalid sample time/);
 const result=sampleNovaTask({variant:'adult',state:'running',elapsedSeconds:100,loop:false});
 assert.equal(result.time,result.duration);
});

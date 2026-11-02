import test from 'node:test';
import assert from 'node:assert/strict';
import { NovaPetController } from './pet-core.js';
import { NovaWorkbenchBridge } from './workbench-bridge.js';
const manifest={id:'nova_test',renderer:'sprite',actions:{idle:{frames:[]},working:{frames:[]},waiting:{frames:[]},success:{frames:[]},error:{frames:[]}}};
test('real task lifecycle drives NOVA states',()=>{
 const notices=[]; const controller=new NovaPetController({manifest});
 const bridge=new NovaWorkbenchBridge({controller,onNotice:x=>notices.push(x)});
 bridge.accept({type:'task.started',taskId:'smc',agent:'jules'});
 assert.equal(controller.state,'working');
 bridge.accept({type:'task.waiting',taskId:'smc',summary:'approval needed'});
 assert.equal(controller.state,'waiting');
 bridge.accept({type:'task.completed',taskId:'smc'});
 assert.equal(controller.state,'success');
 assert.deepEqual(notices.map(x=>x.type),['task.waiting','task.completed']);
});
test('parallel tasks preserve active work state after one completes',()=>{
 const controller=new NovaPetController({manifest});
 const bridge=new NovaWorkbenchBridge({controller});
 bridge.accept({type:'task.started',taskId:'a'});
 bridge.accept({type:'task.started',taskId:'b'});
 bridge.accept({type:'task.completed',taskId:'a'});
 assert.equal(controller.state,'working');
 bridge.accept({type:'task.failed',taskId:'b'});
 assert.equal(controller.state,'error');
});
test('reject invalid events and ignore late terminal updates',()=>{
 const bridge=new NovaWorkbenchBridge({controller:new NovaPetController({manifest})});
 assert.throws(()=>bridge.accept({type:'unknown',taskId:'x'}),/Invalid/);
 bridge.accept({type:'task.completed',taskId:'x'});
 bridge.accept({type:'task.started',taskId:'x'});
 assert.equal(bridge.snapshot().pet.state,'success');
});

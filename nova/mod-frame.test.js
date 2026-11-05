import test from 'node:test';
import assert from 'node:assert/strict';
import {createNovaModFrame} from './mod-frame.js';

for(const variant of ['chibi','adult']) {
  test(`${variant}: MOD replacement, hidden layer and clothing fallback render in animation`,()=>{
    const rig={variant,bones:['body','head'],parents:{head:'body'},animations:[{name:'idle',durationMs:1000,loop:false,tracks:[{bone:'body',keyframes:[{timeMs:0,x:0},{timeMs:1000,x:20}]}]}]};
    const base={hair_front:{src:'original-hair.png'},top:{src:'original-top.png'},bottom:{src:'original-bottom.png'}};
    const mods=[{variant,layers:{hair_front:{src:'custom-hair.png'},top:{operation:'hide'},bottom:{operation:'hide'},hat:{hidden:true}}}];
    const frame=createNovaModFrame({rig,base,mods,safeOutfit:{top:{src:'safe-top.png'},bottom:{src:'safe-bottom.png'}},motionName:'idle',timeMs:500});
    assert.deepEqual(frame.commands.map(c=>c.src),['custom-hair.png','safe-top.png','safe-bottom.png']);
    assert.equal(frame.commands[0].matrix[4],10);
    assert.equal(base.hair_front.src,'original-hair.png');
    assert.equal(mods[0].layers.top.operation,'hide');
  });
}
test('rejects incompatible MOD without mutating base art',()=>{
  const rig={variant:'chibi',bones:['body'],animations:[{name:'idle',durationMs:100,tracks:[]}]};
  const base={top:{src:'original.png'}};
  assert.throws(()=>createNovaModFrame({rig,base,mods:[{variant:'adult',layers:{}}],safeOutfit:{bottom:{src:'safe.png'}},motionName:'idle',timeMs:0}),/Incompatible MOD/);
  assert.equal(base.top.src,'original.png');
});

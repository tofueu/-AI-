import test from 'node:test';
import assert from 'node:assert/strict';
import {createNovaDrawCommands,drawNovaCommands} from './layer-renderer.js';
for(const variant of ['chibi','adult']) {
 test(variant+' produces animated head PNG draw matrix',()=>{
  const rig={variant,bones:['body','head'],parents:{head:'body'},animations:[{name:'idle',durationMs:1000,loop:false,tracks:[{bone:'body',keyframes:[{timeMs:0,x:0},{timeMs:1000,x:20}]},{bone:'head',keyframes:[{timeMs:0,y:5},{timeMs:1000,y:5}]}]}]};
  const frame=createNovaDrawCommands(rig,[{slot:'top',src:'shirt.png'},{slot:'hair_front',src:'hair.png'}],'idle',500);
  assert.equal(frame.commands.length,2);
  assert.equal(frame.commands[1].matrix[4],10);
  assert.equal(frame.commands[1].matrix[5],5);
  const calls=[];
  const ctx={save:()=>calls.push('save'),restore:()=>calls.push('restore'),setTransform:(...v)=>calls.push(v),drawImage:(img)=>calls.push(img)};
  drawNovaCommands(ctx,frame,{'shirt.png':{},'hair.png':{}});
  assert.equal(calls.filter(c=>c==='restore').length,2);
 });
}
test('rejects layers without a matching bone rather than silently dropping them',()=>{
 const rig={variant:'chibi',bones:['body'],animations:[{name:'idle',durationMs:100,tracks:[]}]};
 assert.throws(()=>createNovaDrawCommands(rig,[{slot:'hat',src:'hat.png'}],'idle',0),/Unbound layer bone/);
});
test('hidden layers do not draw',()=>{
 const rig={variant:'adult',bones:['body'],animations:[{name:'idle',durationMs:100,tracks:[]}]};
 assert.equal(createNovaDrawCommands(rig,[{slot:'top',src:'x.png',hidden:true}],'idle',0).commands.length,0);
});

test('preflight rejects missing second image without drawing first image',()=>{
 const calls=[];
 const ctx={save:()=>calls.push('save'),restore:()=>calls.push('restore'),setTransform:()=>calls.push('transform'),drawImage:()=>calls.push('draw')};
 const frame={commands:[{src:'first.png',matrix:[1,0,0,1,0,0]},{src:'missing.png',matrix:[1,0,0,1,0,0]}]};
 assert.throws(()=>drawNovaCommands(ctx,frame,{'first.png':{}}),/Missing decoded image/);
 assert.deepEqual(calls,[]);
});
test('preflight rejects malformed matrices before drawing',()=>{
 const calls=[];
 const ctx={save:()=>calls.push('save'),restore:()=>calls.push('restore'),setTransform:()=>calls.push('transform'),drawImage:()=>calls.push('draw')};
 const frame={commands:[{src:'first.png',matrix:[1,0,0,1,0,0]},{src:'second.png',matrix:[1,0,NaN,1,0,0]}]};
 assert.throws(()=>drawNovaCommands(ctx,frame,{'first.png':{},'second.png':{}}),/Invalid draw command/);
 assert.deepEqual(calls,[]);
});
test('unknown MOD slots are rejected before rendering',()=>{
 const rig={variant:'chibi',bones:['body'],animations:[{name:'idle',durationMs:100,tracks:[]}]};
 assert.throws(()=>createNovaDrawCommands(rig,[{slot:'invented',src:'x.png'}],'idle',0),/invalid draw slot/i);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {createNovaClip} from './animation-timeline.js';
import {renderNovaFrameSequence} from './frame-sequence.js';

for (const variant of ['chibi','adult']) {
  const base={variant,layers:{body:{path:'body.png'},head:{path:'head.png'},outfit:{path:'outfit.png'}}};
  const clip=createNovaClip({variant,name:'walk',durationMs:1000,loop:true,frames:[
    {timeMs:0,pose:{head:{rotation:0}}},
    {timeMs:500,pose:{head:{rotation:30}}},
    {timeMs:1000,pose:{head:{rotation:0}}}
  ]});
  test(`${variant}: sequence samples distinct poses without duplicate end frame`,()=>{
    const result=renderNovaFrameSequence(base,{},clip,{fps:4});
    assert.equal(result.frameCount,4);
    assert.deepEqual(result.frames.map(f=>f.timeMs),[0,250,500,750]);
    assert.notEqual(result.frames[0].svg,result.frames[1].svg);
    assert.match(result.frames[2].svg,/rotate\\(30\\)/);
    assert.match(result.frames[0].svg,/outfit.png/);
  });
  test(`${variant}: frame count and loop validation`,()=>{
    assert.throws(()=>renderNovaFrameSequence(base,{},clip,{fps:0}),/fps/);
    assert.throws(()=>renderNovaFrameSequence(base,{},clip,{fps:61}),/fps/);
    assert.throws(()=>renderNovaFrameSequence(base,{},clip,{cycles:11}),/cycles/);
    assert.throws(()=>renderNovaFrameSequence(base,{},clip,{fps:60,cycles:11}));
    const nonLoop={...clip,loop:false};
    assert.throws(()=>renderNovaFrameSequence(base,{},nonLoop,{cycles:2}),/looping/);
  });
}

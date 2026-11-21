import test from 'node:test';
import assert from 'node:assert/strict';
import {createNovaClip} from './animation-timeline.js';
import {renderNovaFrameSequence} from './frame-sequence.js';

for (const variant of ['chibi','adult']) {
  test(`${variant}: fractional loops export exact playback durations`, () => {
    const clip=createNovaClip({variant,name:'idle',durationMs:750,loop:true,frames:[
      {timeMs:0,pose:{head:{rotation:0}}},
      {timeMs:750,pose:{head:{rotation:0}}}
    ]});
    const base={variant,layers:{body:{path:'body.png'},head:{path:'head.png'},outfit:{path:'outfit.png'}}};
    const sequence=renderNovaFrameSequence(base,{},clip,{fps:2,cycles:2});
    assert.deepEqual(sequence.frames.map(f=>f.durationMs),[500,250,500,250]);
    assert.deepEqual(sequence.frames.map(f=>f.timeMs),[0,500,750,1250]);
    assert.equal(sequence.frames.reduce((sum,f)=>sum+f.durationMs,0),1500);
    assert.ok(sequence.frames.every(f=>f.durationMs>0));
  });
}

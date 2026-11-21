import test from 'node:test';
import assert from 'node:assert/strict';
import {createNovaClip} from './animation-timeline.js';
import {renderNovaFrameSequence} from './frame-sequence.js';

for (const variant of ['chibi','adult']) {
  test(`${variant}: fractional-length loops restart at their own exact boundary`, () => {
    const clip=createNovaClip({variant,name:'walk',durationMs:750,loop:true,frames:[
      {timeMs:0,pose:{head:{rotation:0}}},
      {timeMs:375,pose:{head:{rotation:30}}},
      {timeMs:750,pose:{head:{rotation:0}}}
    ]});
    const base={variant,layers:{body:{path:'body.png'},head:{path:'head.png'},outfit:{path:'outfit.png'}}};
    const result=renderNovaFrameSequence(base,{},clip,{fps:2,cycles:2});
    assert.equal(result.frameCount,4);
    assert.deepEqual(result.frames.map(f=>f.timeMs),[0,500,750,1250]);
    assert.equal(result.frames[0].svg,result.frames[2].svg);
    assert.equal(result.frames[1].svg,result.frames[3].svg);
  });
}

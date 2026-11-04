import test from 'node:test';
import assert from 'node:assert/strict';
import {createNovaClip} from './rig-presets.js';
import {exportNovaSvgSequence} from './svg-sequence.js';

test('exports deterministic chibi and adult frame sequences',()=>{
  for(const variant of ['chibi','adult']) {
    const clip=createNovaClip(variant,'walk');
    const sequence=exportNovaSvgSequence(clip,{head:{src:'head.png'}},{fps:8});
    assert.equal(sequence.frames.length,8);
    assert.equal(sequence.frames[0].filename,'frame-0000.svg');
    assert.equal(sequence.frames[7].time,7/8);
    assert.match(sequence.frames[0].svg,/head.png/);
    assert.equal(sequence.frames[0].svg,exportNovaSvgSequence(clip,{head:{src:'head.png'}},{fps:8}).frames[0].svg);
  }
});
test('rejects invalid FPS and runaway frame counts',()=>{
 const clip=createNovaClip('adult','idle');
 for(const fps of [0,-1,1.5,61,Infinity]) assert.throws(()=>exportNovaSvgSequence(clip,{}, {fps}),/FPS/);
 assert.throws(()=>exportNovaSvgSequence(clip,{}, {fps:60,maxFrames:10}),/frame limit/);
});
test('preserves caller layers and respects hidden items',()=>{
 const clip=createNovaClip('chibi','type'), layers={head:{src:'face.png'},hat:{src:'hat.png',hidden:true}};
 const result=exportNovaSvgSequence(clip,layers,{fps:10});
 assert.equal(result.frames.length,5);
 assert.ok(result.frames.every(frame=>!frame.svg.includes('hat.png')));
 assert.deepEqual(layers,{head:{src:'face.png'},hat:{src:'hat.png',hidden:true}});
});

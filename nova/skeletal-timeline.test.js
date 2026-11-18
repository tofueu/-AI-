import test from 'node:test';
import assert from 'node:assert/strict';
import {sampleNovaTimeline} from './skeletal-timeline.js';
const clip = {loop:false,frames:[{at:0,pose:{head:{rotation:0},armL:{x:0}}},{at:100,pose:{head:{rotation:40},armL:{x:1}}}]};
test('interpolates joint rotation and position',()=>{const r=sampleNovaTimeline(clip,50);assert.equal(r.pose.head.rotation,20);assert.equal(r.pose.armL.x,0.5);});
test('clamps completed non-looping clips',()=>assert.equal(sampleNovaTimeline(clip,300).pose.head.rotation,40));
test('loops at the duration boundary',()=>assert.equal(sampleNovaTimeline({...clip,loop:true},150).pose.head.rotation,20));
test('rejects invalid joints and timestamps',()=>{assert.throws(()=>sampleNovaTimeline({...clip,frames:[{at:0,pose:{}},{at:0,pose:{}}]},0));assert.throws(()=>sampleNovaTimeline({...clip,frames:[{at:0,pose:{wing:{x:1}}},clip.frames[1]]},0));});

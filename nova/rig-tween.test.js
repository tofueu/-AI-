import test from 'node:test';
import assert from 'node:assert/strict';
import {interpolateNovaPose} from './rig-tween.js';
const bones = [{id:'root',x:0,y:0,rotation:0},{id:'arm',parent:'root',x:5,y:0,rotation:0}];
test('interpolates local position and keeps unspecified joints at rest',()=>{
 const pose=interpolateNovaPose(bones,{arm:{x:5}},{arm:{x:15,y:10}},0.5);
 assert.deepEqual(pose.arm,{x:10,y:5,rotation:0});
 assert.deepEqual(pose.root,{x:0,y:0,rotation:0});
});
test('rotates by shortest path across 360 boundary',()=>{
 assert.equal(interpolateNovaPose(bones,{arm:{rotation:350}},{arm:{rotation:10}},0.5).arm.rotation,360);
});
test('endpoints are deterministic',()=>{
 assert.equal(interpolateNovaPose(bones,{arm:{x:2}},{arm:{x:8}},0).arm.x,2);
 assert.equal(interpolateNovaPose(bones,{arm:{x:2}},{arm:{x:8}},1).arm.x,8);
});
test('rejects malformed progress, poses, unknown joints and nonfinite values',()=>{
 assert.throws(()=>interpolateNovaPose(bones,{}, {}, 1.1));
 assert.throws(()=>interpolateNovaPose(bones,{}, {}, NaN));
 assert.throws(()=>interpolateNovaPose(bones,[],{},0));
 assert.throws(()=>interpolateNovaPose(bones,{ghost:{x:1}},{}));
 assert.throws(()=>interpolateNovaPose(bones,{arm:{x:Infinity}},{}));
});

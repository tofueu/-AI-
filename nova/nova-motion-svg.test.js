import test from 'node:test';
import assert from 'node:assert/strict';
import {renderNovaMotionSvg} from './nova-motion-svg.js';

test('both variants export a standalone looping SVG',()=>{
 for(const variant of ['chibi','adult']){
  const svg=renderNovaMotionSvg(variant,'walk');
  assert.match(svg,/^<svg /);
  assert.equal((svg.match(/data-frame="/g)||[]).length,12);
  assert.match(svg,/repeatCount="indefinite"/);
  assert.match(svg,/data-joint="head"/);
  assert.doesNotMatch(svg,/<script|https?:\/\//);
 }
});
test('animation has matching keyTimes and values',()=>{
 const svg=renderNovaMotionSvg('chibi','typing',{frames:4});
 for(const tag of svg.match(/<animate [^>]+\/>/g)){
  const values=tag.match(/values="([^"]+)"/)[1].split(';');
  const times=tag.match(/keyTimes="([^"]+)"/)[1].split(';');
  assert.equal(values.length,5);
  assert.equal(times.length,5);
  assert.equal(times.at(-1),'1');
 }
});
test('invalid frame counts and durations fail',()=>{
 for(const frames of [0,1,121,2.5,NaN])assert.throws(()=>renderNovaMotionSvg('chibi','idle',{frames}));
 for(const durationMs of [0,Infinity,60001])assert.throws(()=>renderNovaMotionSvg('chibi','idle',{durationMs}));
});
test('unknown motion and variant fail',()=>{
 assert.throws(()=>renderNovaMotionSvg('wrong','idle'));
 assert.throws(()=>renderNovaMotionSvg('chibi','wrong'));
});

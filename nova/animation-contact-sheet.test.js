import test from 'node:test';
import assert from 'node:assert/strict';
import {renderAnimationContactSheet} from './animation-contact-sheet.js';
const frames=[{layers:[{src:'q/head.png'}]},{layers:[{src:'adult/head.png',transform:{x:3}}]},{layers:[{src:'q/head.png',hidden:true}]}];
test('lays out frames in a two-column sheet without changing image sources',()=>{
 const svg=renderAnimationContactSheet({frames,width:100,height:80,columns:2,gap:10});
 assert.match(svg,/width="210" height="170"/);
 assert.match(svg,/translate\(110 0\)/);
 assert.match(svg,/translate\(0 90\)/);
 assert.match(svg,/q\/head.png/);
 assert.match(svg,/adult\/head.png/);
 assert.doesNotMatch(svg,/<script/i);
});
test('hides empty layers through existing renderer',()=>{
 const svg=renderAnimationContactSheet({frames:[frames[2]],width:64,height:64});
 assert.doesNotMatch(svg,/<image /);
});
test('rejects invalid dimensions, layouts and image sources',()=>{
 assert.throws(()=>renderAnimationContactSheet({frames:[],width:64,height:64}),/Invalid contact sheet frames/);
 assert.throws(()=>renderAnimationContactSheet({frames,width:64,height:64,columns:0}),/Invalid columns/);
 assert.throws(()=>renderAnimationContactSheet({frames,width:64,height:64,gap:-1}),/Invalid gap/);
 assert.throws(()=>renderAnimationContactSheet({frames,width:0,height:64}),/Invalid canvas size/);
 assert.throws(()=>renderAnimationContactSheet({frames:[{layers:[{src:'javascript:bad'}]}],width:64,height:64}),/Invalid image source/);
});

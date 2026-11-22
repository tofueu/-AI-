import test from 'node:test';
import assert from 'node:assert/strict';
import {renderLayerAnimationSvg} from './layer-animation-svg.js';
const frames = [{layers:[{src:'q/head.png'}]},{layers:[{src:'q/head.png',transform:{x:5}}]}];
test('loops two MOD frames without scripts and retains transforms',()=>{
 const svg=renderLayerAnimationSvg({frames,width:128,height:128,durationMs:500});
 assert.equal((svg.match(/<animate /g)||[]).length,2);
 assert.match(svg,/repeatCount="indefinite"/);
 assert.match(svg,/translate\(5 0\)/);
 assert.doesNotMatch(svg,/<script/i);
});
test('rejects invalid duration and frame counts',()=>{
 assert.throws(()=>renderLayerAnimationSvg({frames:[],width:128,height:128}),/Invalid animation frames/);
 assert.throws(()=>renderLayerAnimationSvg({frames,width:128,height:128,durationMs:0}),/Invalid duration/);
});
test('rejects invalid layers via existing renderer',()=>{
 assert.throws(()=>renderLayerAnimationSvg({frames:[{layers:[{src:'javascript:bad'}]},frames[1]],width:128,height:128}),/Invalid image source/);
});

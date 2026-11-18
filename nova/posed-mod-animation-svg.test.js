import test from 'node:test';
import assert from 'node:assert/strict';
import {renderNovaPosedModAnimationSvg} from './posed-mod-animation-svg.js';
const base={variant:'chibi',layers:{body:{path:'body.png'},head:{path:'head.png'},outfit:{path:'clothes.png'}}};
const clip={frames:[{at:0,pose:{head:{x:0}}},{at:1000,pose:{head:{x:.2}}}]};
test('non-looping animation retains final posed artwork',()=>{
 const {svg}=renderNovaPosedModAnimationSvg(base,{},clip,{width:100,height:100,fps:2});
 assert.match(svg,/repeatCount="1" fill="freeze"/);
 assert.match(svg,/translate\\(20 0\\)/);
 assert.equal((svg.match(/data-slot="head"/g)||[]).length,3);
});
test('looping artwork animation wraps without final duplicate',()=>{
 const {svg}=renderNovaPosedModAnimationSvg(base,{}, {...clip,loop:true},{fps:2});
 assert.match(svg,/repeatCount="indefinite"/);
 assert.equal((svg.match(/data-slot="head"/g)||[]).length,2);
});
test('outfit fallback persists across frames',()=>{
 const {svg,fallbacks}=renderNovaPosedModAnimationSvg(base,{layers:{outfit:null}},clip,{fps:2});
 assert.deepEqual(fallbacks,['outfit']);
 assert.equal((svg.match(/href="clothes.png"/g)||[]).length,3);
});
test('invalid fps and oversized frame count rejected',()=>{
 assert.throws(()=>renderNovaPosedModAnimationSvg(base,{},clip,{fps:0}),/FPS/);
 assert.throws(()=>renderNovaPosedModAnimationSvg(base,{},clip,{fps:60,maxFrames:2}),/frame cap/);
});

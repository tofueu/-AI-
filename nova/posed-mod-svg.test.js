import test from 'node:test';
import assert from 'node:assert/strict';
import {renderNovaPosedModSvg} from './posed-mod-svg.js';
const base = {variant:'chibi',layers:{body:{path:'body.png'},head:{path:'head.png'},outfit:{path:'clothes.png'},eyes:{path:'eyes.png'}}};
const clip = {frames:[{at:0,pose:{head:{x:0},root:{y:0}}},{at:1000,pose:{head:{x:.1,rotation:20},root:{y:.1}}}]};
test('head artwork follows head joint while outfit follows root',()=>{
 const {svg}=renderNovaPosedModSvg(base,{},clip,500,{width:200,height:400});
 assert.match(svg,/data-joint="head" transform="translate\(10 0\) rotate\(10 100 100\)"/);
 assert.match(svg,/data-joint="root" transform="translate\(0 20\) rotate\(0 100 212\)"/);
 assert.match(svg,/data-slot="outfit"/);
});
test('adult variant and hidden optional layers',()=>{
 const adult={...base,variant:'adult'};
 const {variant,svg}=renderNovaPosedModSvg(adult,{layers:{eyes:null}},clip,0);
 assert.equal(variant,'adult');
 assert.doesNotMatch(svg,/data-slot="eyes"/);
});
test('required clothing cannot disappear',()=>{
 const result=renderNovaPosedModSvg(base,{layers:{outfit:null}},clip,0);
 assert.deepEqual(result.fallbacks,['outfit']);
 assert.match(result.svg,/href="clothes.png"/);
});
test('rejects unsafe prefix and invalid canvas',()=>{
 assert.throws(()=>renderNovaPosedModSvg(base,{},clip,0,{assetPrefix:'../'}),/asset prefix/);
 assert.throws(()=>renderNovaPosedModSvg(base,{},clip,0,{width:0}),/dimensions/);
});

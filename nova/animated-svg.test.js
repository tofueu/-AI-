import test from 'node:test';
import assert from 'node:assert/strict';
import {renderNovaAnimatedSvg} from './animated-svg.js';
const pose=variant=>({variant,layers:[{src:'art/body.png',transform:{x:0,y:0,rotation:0,scaleX:1,scaleY:1}}]});
for(const variant of ['chibi','adult'])test(variant+' produces self-contained animated SVG',()=>{
 const result=renderNovaAnimatedSvg([pose(variant),pose(variant),pose(variant)],{width:128,height:256,durationMs:900});
 assert.match(result,/width="128" height="256"/);
 assert.equal((result.match(/<animate /g)||[]).length,3);
 assert.equal((result.match(/<image /g)||[]).length,3);
 assert.doesNotMatch(result,/<script|javascript:/i);
});
test('rejects unsafe dimensions, timing and frame counts',()=>{
 const p=pose('chibi');
 for(const frames of [[],[p],Array(61).fill(p)])assert.throws(()=>renderNovaAnimatedSvg(frames));
 for(const options of [{width:0},{height:4097},{durationMs:0},{durationMs:Infinity}])assert.throws(()=>renderNovaAnimatedSvg([p,p],options));
});
test('rejects invalid layer source',()=>assert.throws(()=>renderNovaAnimatedSvg([{variant:'chibi',layers:[{src:'https://bad.test/a.png',transform:{x:0,y:0,rotation:0,scaleX:1,scaleY:1}}]},pose('chibi')])));

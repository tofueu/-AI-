import test from 'node:test';
import assert from 'node:assert/strict';
import {composeNovaModSvg} from './nova-mod-svg-compositor.js';
for(const variant of ['chibi','adult'])test(`${variant}: PNG layers, fallback clothing and hidden accessories`,()=>{
 const {svg,canvas}=composeNovaModSvg(variant,{body:'body.png',head:'head.png',hat:null,top:null});
 assert.equal(canvas.height,variant==='chibi'?512:768);
 assert.match(svg,/<image data-layer="body" href="body.png"/);
 assert.match(svg,/<image data-layer="head" href="head.png"/);
 assert.doesNotMatch(svg,/data-layer="hat"/);
 for(const name of ['top','bottom','underwear'])assert.match(svg,new RegExp(`<rect data-layer="${name}"`));
});
test('MOD clothing overrides fallback and empty accessory stays hidden',()=>{
 const {svg}=composeNovaModSvg('chibi',{top:'clothes/top.png',accessory:''});
 assert.match(svg,/href="clothes\/top.png"/);
 assert.doesNotMatch(svg,/<rect data-layer="top"/);
 assert.doesNotMatch(svg,/data-layer="accessory"/);
});
test('unsafe paths and unknown slots rejected',()=>{
 for(const value of ['../evil.png','https://example.com/a.png','x.png" onload="alert(1)','a//b.png','a\\b.png'])
  assert.throws(()=>composeNovaModSvg('chibi',{hairFront:value}),/Unsafe PNG path/);
 assert.throws(()=>composeNovaModSvg('chibi',{unknown:'a.png'}),/Unknown layer/);
 assert.throws(()=>composeNovaModSvg('unknown'),/Unknown NOVA variant/);
});

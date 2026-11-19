import test from 'node:test';
import assert from 'node:assert/strict';
import {renderNovaRigSvg} from './nova-rig-svg-preview.js';
test('chibi and adult canvases',()=>{
 assert.match(renderNovaRigSvg('chibi'),/height="512"/);
 assert.match(renderNovaRigSvg('adult'),/height="768"/);
});
test('typing motion changes the output',()=>{
 assert.notEqual(renderNovaRigSvg('chibi','typing',0),renderNovaRigSvg('chibi','typing',200));
});
test('empty optional layers hidden and basic clothes retained',()=>{
 const svg=renderNovaRigSvg('chibi','idle',0,{hat:null,top:null,bottom:null});
 assert.doesNotMatch(svg,/data-layer="hat"/);
 assert.match(svg,/builtin:basic-top/);
});
test('escape untrusted metadata',()=>{
 const svg=renderNovaRigSvg('adult','idle',0,{hat:'<script>&"'});
 assert.match(svg,/&lt;script&gt;&amp;&quot;/);
 assert.doesNotMatch(svg,/<script>/);
});
test('reject invalid motion',()=>{
 assert.throws(()=>renderNovaRigSvg('chibi','unknown'),/Unknown NOVA motion/);
});

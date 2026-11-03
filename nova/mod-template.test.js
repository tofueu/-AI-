import test from 'node:test';
import assert from 'node:assert/strict';
import {createNovaModTemplate,validateNovaModTemplate} from './mod-template.js';
import {LAYER_SLOTS} from './mod-layers.js';
for(const variant of ['chibi','adult']) test(`${variant} complete blank layer manifest`,()=>{
 const m=createNovaModTemplate(variant);
 assert.equal(m.layers.length,LAYER_SLOTS.length);
 assert.equal(new Set(m.layers.map(l=>l.filename)).size,LAYER_SLOTS.length);
 assert.ok(m.layers.every(l=>l.hidden));
 assert.equal(validateNovaModTemplate(m),true);
});
test('rejects invalid dimensions and variants',()=>{
 assert.throws(()=>createNovaModTemplate('other'));
 assert.throws(()=>createNovaModTemplate('chibi',{width:0}));
});
test('rejects renamed slots, unsafe filenames and invalid anchors',()=>{
 for(const mutate of [m=>m.layers[0].slot='wrong',m=>m.layers[0].filename='../evil.png',m=>m.layers[0].anchor.x=-1]){
 const m=createNovaModTemplate('adult');mutate(m);assert.throws(()=>validateNovaModTemplate(m));
 }
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {createNovaModDrawingTemplate} from './nova-mod-drawing-template.js';
import {NOVA_LAYERS,NOVA_RIGS} from './nova-rig-motion.js';

for(const variant of ['chibi','adult']){
 test(`${variant} drawing template exposes each editable layer and all rig joints`,()=>{
  const result=createNovaModDrawingTemplate(variant);
  assert.deepEqual(result.layers,NOVA_LAYERS);
  assert.deepEqual([result.canvas.width,result.canvas.height],NOVA_RIGS[variant].canvas);
  for(const layer of NOVA_LAYERS)assert.match(result.svg,new RegExp(`id="layer-${layer}"`));
  for(const joint of Object.keys(NOVA_RIGS[variant].joints))assert.match(result.svg,new RegExp(`data-joint="${joint}"`));
  assert.equal((result.svg.match(/<g id="layer-/g)||[]).length,NOVA_LAYERS.length);
  assert.match(result.svg,/data-export="hide"/);
 });
}
test('unknown template variant is rejected',()=>assert.throws(()=>createNovaModDrawingTemplate('other'),/Unknown NOVA variant/));

for(const variant of ['chibi','adult']){
 test(`${variant} template draws rear hair behind body and face while retaining schema order`,()=>{
  const {svg,layers}=createNovaModDrawingTemplate(variant);
  const index=name=>svg.indexOf(`id="layer-${name}"`);
  assert.ok(index('hairBack')>=0);
  assert.ok(index('hairBack')<index('body'));
  assert.ok(index('body')<index('head'));
  assert.ok(index('head')<index('eyes'));
  assert.ok(index('eyes')<index('hairFront'));
  assert.deepEqual(layers,NOVA_LAYERS);
 });
}

for(const variant of ['chibi','adult']){
 test(`${variant} drawing guide connects joints with labelled bones without polluting MOD layer groups`,()=>{
  const {svg}=createNovaModDrawingTemplate(variant);
  const bones=['root:neck','neck:head','neck:shoulderL','neck:shoulderR','shoulderL:elbowL','elbowL:handL','shoulderR:elbowR','elbowR:handR','root:hipL','root:hipR','hipL:kneeL','kneeL:footL','hipR:kneeR','kneeR:footR'];
  for(const bone of bones)assert.ok(svg.includes(`data-bone="${bone}"`),bone);
  for(const name of Object.keys(NOVA_RIGS[variant].joints))assert.ok(svg.includes(`>${name}</text>`),name);
  assert.equal((svg.match(/data-bone=/g)||[]).length,bones.length);
  assert.equal((svg.match(/<g id="layer-/g)||[]).length,NOVA_LAYERS.length);
  assert.ok(svg.indexOf('id="rig-guides"')>svg.indexOf('id="layer-accessory"'));
 });
}

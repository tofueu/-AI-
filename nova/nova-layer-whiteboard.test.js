import test from 'node:test';
import assert from 'node:assert/strict';
import {createNovaLayerWhiteboard,createNovaWhiteboardManifest} from './nova-layer-whiteboard.js';
import {NOVA_LAYERS,NOVA_RIGS} from './nova-rig-motion.js';
for(const variant of ['chibi','adult']){
 test(variant+' transparent whiteboard includes every independent MOD slot',()=>{
  const svg=createNovaLayerWhiteboard(variant);
  const [w,h]=NOVA_RIGS[variant].canvas;
  assert.match(svg,new RegExp('width="'+w+'" height="'+h+'"'));
  for(const layer of NOVA_LAYERS)assert.ok(svg.includes('id="layer-'+layer+'"'));
  assert.match(svg,/id="joint-guides"/);
  assert.match(svg,/style="display:none"/);
  assert.doesNotMatch(svg,/<rect/);
 });
}
test('reject unknown variant',()=>assert.throws(()=>createNovaLayerWhiteboard('other')));
test('manifest provides separate empty chibi and adult slots',()=>{
 assert.deepEqual(createNovaWhiteboardManifest(),{version:1,variants:{chibi:{},adult:{}}});
});

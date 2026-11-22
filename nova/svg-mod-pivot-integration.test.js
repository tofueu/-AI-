import test from 'node:test';
import assert from 'node:assert/strict';
import { renderLayerFrameSvg } from './svg-frame-renderer.js';
import { applyNovaModManifest } from './apply-mod-manifest.js';

for (const variant of ['chibi','adult']) {
  test(variant + ' MOD replacement renders legacy array pivot', () => {
    const layers = applyNovaModManifest({
      variant,
      baseLayers: [
        {slot:'body',src:'base/body.png',pivot:[12,24]},
        {slot:'top',src:'base/top.png'},
        {slot:'hair_front',src:'base/hair.png',pivot:[5,6]}
      ],
      manifest:{schemaVersion:1,variant,layers:{
        hair_front:{src:'hair/replacement.png'},
        top:{operation:'hide'}
      }}
    });
    const svg=renderLayerFrameSvg({layers,width:128,height:128});
    assert.match(svg,/hair\/replacement\.png/);
    assert.match(svg,/translate\(5 6\)/);
    assert.match(svg,/base\/top\.png/);
    assert.match(svg,/base\/body\.png/);
  });
}
test('rejects malformed array pivot rather than silently using zero',()=>{
  assert.throws(()=>renderLayerFrameSvg({layers:[{src:'x.png',pivot:[3]}],width:32,height:32}),/Invalid pivot/);
  assert.throws(()=>renderLayerFrameSvg({layers:[{src:'x.png',pivot:[3,'bad']}],width:32,height:32}),/Invalid pivot x|Invalid pivot y/);
});

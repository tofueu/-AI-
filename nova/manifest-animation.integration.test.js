// End-to-end composition contract: manifest -> clothing resolution -> rig pose -> SVG animation.
// This test uses production modules (no mocked rig, resolver, or renderer).
import test from 'node:test';
import assert from 'node:assert/strict';
import {composeNovaManifestFrame} from './manifest-frame.js';
import {renderNovaFrameSvg} from './frame-svg.js';
import {renderNovaComposedAnimationSvg} from './composed-animation.js';

const outfit = {top:{src:'fallback/top.png'},bottom:{src:'fallback/bottom.png'}};
for (const variant of ['chibi','adult']) {
  test(variant+' real MOD -> animated SVG and clothing fallback', () => {
    const manifest = {schemaVersion:1,id:'smoke_hair',variant,layers:{
      hair_front:{operation:'replace',src:'mod/hair.png',width:96,height:112,anchorX:0.4,anchorY:0.2},
      top:{operation:'hide'},bottom:{operation:'hide'}
    }};
    const snapshot = structuredClone(manifest);
    const frames = [0,0.12,0.24,0.36].map(elapsedSeconds =>
      composeNovaManifestFrame({variant,manifests:[manifest],safeOutfit:outfit,state:'running',elapsedSeconds}));
    for (const frame of frames) {
      assert.equal(frame.variant,variant);
      assert.equal(frame.action,'type');
      const slots = new Map(frame.layers.map(layer=>[layer.slot,layer]));
      assert.equal(slots.get('hair_front')?.src,'mod/hair.png');
      assert.equal(slots.get('top')?.src,'fallback/top.png');
      assert.equal(slots.get('bottom')?.src,'fallback/bottom.png');
      const svg = renderNovaFrameSvg(frame);
      assert.match(svg, /mod\/hair\.png/);
      assert.match(svg, /fallback\/top\.png/);
      assert.match(svg, /width="96" height="112"/);
    }
    const animated = renderNovaComposedAnimationSvg(frames,{durationMs:800});
    assert.match(animated, /repeatCount="indefinite"/);
    assert.equal((animated.match(/<animate /g)||[]).length,4);
    assert.deepEqual(manifest,snapshot);
    // The running/typing action moves the shoulder-bound arm between frames.
    const armManifest = {schemaVersion:1,id:'moving_arm',variant,layers:{arm_l:{operation:'replace',src:'mod/arm.png'}}};
    const armFrames = [0,0.12,0.24].map(elapsedSeconds =>
      composeNovaManifestFrame({variant,manifests:[armManifest],safeOutfit:outfit,state:'running',elapsedSeconds}));
    const rotations = armFrames.map(frame => frame.layers.find(layer=>layer.slot==='arm_l')?.transform.rotation);
    assert.equal(new Set(rotations).size > 1,true,'Typing must animate the shoulder-bound arm');
  });
}
test('manifest image path rejected before rendering',()=>{
  assert.throws(()=>composeNovaManifestFrame({
    variant:'chibi',safeOutfit:outfit,
    manifests:[{schemaVersion:1,id:'bad',variant:'chibi',layers:{
      hair_front:{operation:'replace',src:'../escape.png'}
    }}]
  }),/PNG path/);
});

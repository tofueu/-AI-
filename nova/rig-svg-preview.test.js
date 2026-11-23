import test from 'node:test';
import assert from 'node:assert/strict';
import { renderRigSvgFrame, renderRigSvgSequence } from './rig-svg-preview.js';
import { buildRigFrameSequence } from './rig-frame-sequence.js';
import { NOVA_TYPING_CLIPS } from './typing-clips.js';
for (const variant of ['chibi','adult']) {
  test(`${variant} typing animation generates distinct safe SVG wireframes`, () => {
    const clip = structuredClone(NOVA_TYPING_CLIPS[variant]);
    const seq = buildRigFrameSequence(clip,{fps:20});
    const images = renderRigSvgSequence(seq);
    assert.equal(images.length,variant === 'chibi' ? 12 : 16);
    assert.match(images[0], /<svg xmlns=/);
    assert.match(images[0], /aria-label="NOVA/);
    assert.notEqual(images[0],images[3]);
    assert.deepEqual(clip,NOVA_TYPING_CLIPS[variant]);
  });
}
test('rejects invalid transforms and variants',()=>{
  assert.throws(()=>renderRigSvgFrame({pose:{head:{x:Infinity,y:0,rotation:0}}}),TypeError);
  assert.throws(()=>renderRigSvgFrame({pose:{}},{variant:'other'}),RangeError);
  assert.throws(()=>renderRigSvgSequence({variant:'chibi',frames:null}),TypeError);
});

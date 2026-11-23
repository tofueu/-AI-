import test from 'node:test';
import assert from 'node:assert/strict';
import { renderAnimatedRigSvg } from './rig-animated-svg.js';
import { buildRigFrameSequence } from './rig-frame-sequence.js';
import { NOVA_TYPING_CLIPS } from './typing-clips.js';
for (const variant of ['chibi','adult']) {
  test(`${variant} produces standalone loopable animated SVG`,()=>{
    const sequence=buildRigFrameSequence(NOVA_TYPING_CLIPS[variant],{fps:20});
    const svg=renderAnimatedRigSvg(sequence);
    assert.match(svg,/repeatCount="indefinite"/);
    assert.match(svg,/calcMode="discrete"/);
    assert.equal((svg.match(/<animate /g)||[]).length,sequence.frames.length);
    assert.match(svg,new RegExp(`NOVA ${variant} animated rig`));
  });
}
test('rejects missing and nonpositive frame durations',()=>{
  assert.throws(()=>renderAnimatedRigSvg({frames:[],frameDurationMs:0}),TypeError);
});

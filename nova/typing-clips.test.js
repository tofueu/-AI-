import test from 'node:test';
import assert from 'node:assert/strict';
import { NOVA_TYPING_CLIPS } from './typing-clips.js';
import { validateClip, sampleClip } from './rig-animation.js';

for (const variant of ['chibi', 'adult']) {
  test(variant + ' typing clip validates and loops without a seam', () => {
    const clip = NOVA_TYPING_CLIPS[variant];
    validateClip(clip);
    const duration = clip.frames.at(-1).time;
    const first = sampleClip(clip, 0);
    const last = sampleClip(clip, duration, { loop: false });
    assert.deepEqual(first.pose, last.pose);
    assert.deepEqual(sampleClip(clip, 0.1).pose, sampleClip(clip, duration + 0.1).pose);
    assert.notDeepEqual(sampleClip(clip, duration / 4).pose, first.pose);
  });
  test(variant + ' typing clip can be sampled without altering source', () => {
    const clip = NOVA_TYPING_CLIPS[variant];
    const before = structuredClone(clip);
    sampleClip(clip, 0.23).pose.wrist_l.y = 999;
    assert.deepEqual(clip, before);
  });
}

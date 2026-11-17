import { interpolateNovaPose } from './rig-tween.js';
// Sample keyframed local joint poses. The last frame blends back to the first when looping.
export function sampleNovaClip(bones, clip, elapsedMs, {loop = true} = {}) {
  if (!Array.isArray(clip) || clip.length < 2 || !Number.isFinite(elapsedMs) || elapsedMs < 0) throw new Error('Invalid clip');
  let total = 0;
  for (const frame of clip) {
    if (!frame || !Number.isFinite(frame.durationMs) || frame.durationMs <= 0 || !frame.pose || typeof frame.pose !== 'object' || Array.isArray(frame.pose)) throw new Error('Invalid clip frame');
    total += frame.durationMs;
  }
  if (!Number.isFinite(total)) throw new Error('Invalid clip duration');
  const time = loop ? elapsedMs % total : Math.min(elapsedMs, total);
  let offset = 0;
  for (let i = 0; i < clip.length; i++) {
    const frame = clip[i];
    const end = offset + frame.durationMs;
    if (time < end || i === clip.length - 1) {
      const next = clip[(i + 1) % clip.length];
      const progress = !loop && i === clip.length - 1 ? 0 : Math.min(1, (time - offset) / frame.durationMs);
      return interpolateNovaPose(bones, frame.pose, next.pose, progress);
    }
    offset = end;
  }
}

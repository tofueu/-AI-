// Deterministic NOVA rig animation sampler; independent of the renderer.
export const RIG_JOINTS = Object.freeze(['root','torso','neck','head','shoulder_l','elbow_l','wrist_l','shoulder_r','elbow_r','wrist_r','hip_l','knee_l','ankle_l','hip_r','knee_r','ankle_r']);
export const RIG_VARIANTS = Object.freeze(['chibi','adult']);
const finite = value => typeof value === 'number' && Number.isFinite(value);
export function validateClip(clip) {
  if (!clip || !RIG_VARIANTS.includes(clip.variant) || !Array.isArray(clip.frames) || clip.frames.length < 2) throw new Error('Invalid animation clip');
  let last = -Infinity;
  for (const frame of clip.frames) {
    if (!frame || !finite(frame.time) || frame.time < 0 || frame.time <= last || !frame.pose || typeof frame.pose !== 'object' || Array.isArray(frame.pose)) throw new Error('Invalid animation frame');
    last = frame.time;
    for (const [joint, transform] of Object.entries(frame.pose)) {
      if (!RIG_JOINTS.includes(joint) || !transform || typeof transform !== 'object' || Array.isArray(transform) || !['x','y','rotation'].every(k => finite(transform[k]))) throw new Error('Invalid joint transform: ' + joint);
    }
  }
  if (clip.frames[0].time !== 0 || last <= 0) throw new Error('Invalid clip duration');
  return clip;
}
export function sampleClip(clip, seconds, {loop = true} = {}) {
  validateClip(clip);
  if (!finite(seconds)) throw new Error('Invalid sample time');
  const frames = clip.frames;
  const duration = frames[frames.length - 1].time;
  const t = loop ? ((seconds % duration) + duration) % duration : Math.max(0, Math.min(duration, seconds));
  let i = 0;
  while (i < frames.length - 2 && frames[i + 1].time < t) i++;
  const a = frames[i], b = frames[i + 1];
  const alpha = (t - a.time) / (b.time - a.time);
  const pose = {};
  for (const joint of RIG_JOINTS) {
    const p = a.pose[joint] || {x:0,y:0,rotation:0};
    const q = b.pose[joint] || {x:0,y:0,rotation:0};
    pose[joint] = {x:p.x+(q.x-p.x)*alpha,y:p.y+(q.y-p.y)*alpha,rotation:p.rotation+(q.rotation-p.rotation)*alpha};
  }
  return {variant:clip.variant,time:t,duration,pose};
}

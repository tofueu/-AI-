// Pure NOVA skeletal timeline sampler. Coordinates are normalized to the character canvas.
export const NOVA_JOINTS = Object.freeze(['root','head','armL','armR','legL','legR']);
const finite = n => typeof n === 'number' && Number.isFinite(n);
function validatePose(pose) {
  if (!pose || typeof pose !== 'object' || Array.isArray(pose)) throw Error('Invalid pose');
  for (const [joint, transform] of Object.entries(pose)) {
    if (!NOVA_JOINTS.includes(joint)) throw Error('Unknown joint: ' + joint);
    if (!transform || typeof transform !== 'object' || Array.isArray(transform)) throw Error('Invalid joint transform');
    for (const [axis, value] of Object.entries(transform)) {
      if (!['x','y','rotation'].includes(axis) || !finite(value)) throw Error('Invalid joint coordinate');
    }
  }
}
export function sampleNovaTimeline(clip, elapsedMs) {
  if (!clip || !Array.isArray(clip.frames) || clip.frames.length < 2) throw Error('Timeline requires two frames');
  if (!finite(elapsedMs) || elapsedMs < 0) throw Error('Invalid elapsed time');
  const frames = clip.frames;
  let previous = -1;
  for (const frame of frames) {
    if (!frame || !finite(frame.at) || frame.at < 0 || frame.at <= previous) throw Error('Invalid frame timestamps');
    validatePose(frame.pose);
    previous = frame.at;
  }
  if (frames[0].at !== 0) throw Error('Timeline must start at zero');
  const duration = previous;
  if (clip.loop !== undefined && typeof clip.loop !== 'boolean') throw Error('Invalid loop flag');
  const t = clip.loop ? elapsedMs % duration : Math.min(elapsedMs, duration);
  let right = frames.findIndex(frame => frame.at > t);
  if (right === -1) right = frames.length - 1;
  const a = frames[Math.max(0,right-1)], b = frames[right];
  const alpha = a === b ? 1 : (t-a.at)/(b.at-a.at);
  const pose = {};
  for (const joint of NOVA_JOINTS) {
    const start = a.pose[joint] || {}, end = b.pose[joint] || {};
    if (!Object.keys(start).length && !Object.keys(end).length) continue;
    pose[joint] = {};
    for (const axis of ['x','y','rotation']) {
      const from = start[axis] ?? 0, to = end[axis] ?? from;
      pose[joint][axis] = from + (to-from)*alpha;
    }
  }
  return {timeMs:t,durationMs:duration,pose};
}

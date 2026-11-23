import { RIG_JOINTS } from './rig-animation.js';

// Diagnostic wireframe preview, not a replacement for the official layered art.
const BASE = {
  root:[160,195], torso:[160,142], neck:[160,104], head:[160,73],
  shoulder_l:[123,117], elbow_l:[103,155], wrist_l:[111,192],
  shoulder_r:[197,117], elbow_r:[217,155], wrist_r:[209,192],
  hip_l:[140,207], knee_l:[135,261], ankle_l:[128,311],
  hip_r:[180,207], knee_r:[185,261], ankle_r:[192,311]
};
const BONES = [['root','torso'],['torso','neck'],['neck','head'],
  ['torso','shoulder_l'],['shoulder_l','elbow_l'],['elbow_l','wrist_l'],
  ['torso','shoulder_r'],['shoulder_r','elbow_r'],['elbow_r','wrist_r'],
  ['root','hip_l'],['hip_l','knee_l'],['knee_l','ankle_l'],
  ['root','hip_r'],['hip_r','knee_r'],['knee_r','ankle_r']];
const fmt = n => Number(n.toFixed(3));
export function renderRigSvgFrame(frame, { variant = 'chibi' } = {}) {
  if (!['chibi','adult'].includes(variant)) throw new RangeError('Invalid variant');
  if (!frame || !frame.pose || typeof frame.pose !== 'object' || Array.isArray(frame.pose)) throw new TypeError('Invalid frame pose');
  const scaleY = variant === 'chibi' ? 0.76 : 1;
  const positions = {};
  for (const joint of RIG_JOINTS) {
    const transform = frame.pose[joint] ?? {x:0,y:0,rotation:0};
    if (!transform || !['x','y','rotation'].every(k => typeof transform[k] === 'number' && Number.isFinite(transform[k]))) throw new TypeError('Invalid transform: '+joint);
    positions[joint] = [fmt(BASE[joint][0] + transform.x),fmt(45+(BASE[joint][1]-45)*scaleY+transform.y)];
  }
  const lines = BONES.map(([a,b]) => `<line x1="${positions[a][0]}" y1="${positions[a][1]}" x2="${positions[b][0]}" y2="${positions[b][1]}"/>`).join('');
  const circles = RIG_JOINTS.map(j => `<circle cx="${positions[j][0]}" cy="${positions[j][1]}" r="4"/>`).join('');
  const head = positions.head;
  const radius = variant === 'chibi' ? 34 : 23;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 340" width="320" height="340" role="img" aria-label="NOVA ${variant} rig diagnostic preview"><g fill="none" stroke="#7c65ac" stroke-width="5" stroke-linecap="round">${lines}</g><circle cx="${head[0]}" cy="${head[1]}" r="${radius}" fill="#d7c7f3" stroke="#7c65ac" stroke-width="3"/><g fill="#56417e">${circles}</g></svg>`;
}
export function renderRigSvgSequence(sequence) {
  if (!sequence || !Array.isArray(sequence.frames) || !['chibi','adult'].includes(sequence.variant)) throw new TypeError('Invalid sequence');
  return sequence.frames.map(frame => renderRigSvgFrame(frame,{variant:sequence.variant}));
}

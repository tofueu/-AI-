// Render a sampled NOVA pose as a standalone SVG skeleton diagnostic.
// This is a rig-debugging preview, not finished character artwork.
import { NOVA_JOINTS, sampleNovaTimeline } from './skeletal-timeline.js';

const ANCHORS = Object.freeze({
  root: [0.5, 0.53], head: [0.5, 0.25],
  armL: [0.35, 0.48], armR: [0.65, 0.48],
  legL: [0.43, 0.77], legR: [0.57, 0.77]
});
const BONES = Object.freeze([
  ['root','head'],['root','armL'],['root','armR'],
  ['root','legL'],['root','legR']
]);
const safeNumber = n => Number(n.toFixed(4));
export function renderNovaRigSvg(clip, elapsedMs, {width=320,height=480}={}) {
  if (!Number.isInteger(width) || !Number.isInteger(height) ||
      width < 1 || height < 1 || width > 4096 || height > 4096)
    throw Error('Invalid rig canvas dimensions');
  const {pose} = sampleNovaTimeline(clip,elapsedMs);
  const positions = {};
  for (const joint of NOVA_JOINTS) {
    const [x,y] = ANCHORS[joint];
    const t = pose[joint] || {};
    positions[joint] = {
      x: safeNumber((x+(t.x||0))*width),
      y: safeNumber((y+(t.y||0))*height),
      rotation: safeNumber(t.rotation||0)
    };
  }
  const lines = BONES.map(([a,b]) =>
    `<line x1="${positions[a].x}" y1="${positions[a].y}" x2="${positions[b].x}" y2="${positions[b].y}" stroke="#a78bfa" stroke-width="4"/>`).join('');
  const nodes = NOVA_JOINTS.map(j => {
    const p=positions[j];
    return `<g transform="translate(${p.x} ${p.y}) rotate(${p.rotation})"><circle r="8" fill="#f5f3ff" stroke="#6d28d9" stroke-width="2"/><line x1="0" y1="0" x2="16" y2="0" stroke="#6d28d9" stroke-width="2"/></g>`;
  }).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${lines}${nodes}</svg>`;
}

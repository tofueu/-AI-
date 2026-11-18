import { renderNovaRigSvg } from './rig-debug-svg.js';
import { sampleNovaTimeline } from './skeletal-timeline.js';

/** Export a self-contained looping SVG rig diagnostic; no external assets required. */
export function renderNovaRigAnimationSvg(clip, { width=320, height=480, fps=12, maxFrames=240 }={}) {
  if (!Number.isInteger(fps) || fps < 1 || fps > 60) throw Error('Invalid animation FPS');
  if (!Number.isInteger(maxFrames) || maxFrames < 2 || maxFrames > 600) throw Error('Invalid frame cap');
  const { durationMs } = sampleNovaTimeline(clip, 0);
  const count = Math.max(2, Math.ceil(durationMs * fps / 1000));
  if (count > maxFrames) throw Error('Animation exceeds frame cap');
  const durationSeconds = durationMs / 1000;
  const frames = Array.from({length:count}, (_,i) => {
    const svg = renderNovaRigSvg(clip, i * durationMs / count, {width,height});
    const inner = svg.slice(svg.indexOf('>')+1, svg.lastIndexOf('</svg>'));
    const start = i / count;
    const end = (i+1) / count;
    return `<g visibility="hidden"><set attributeName="visibility" to="visible" begin="${(start*durationSeconds).toFixed(6)}s" dur="${((end-start)*durationSeconds).toFixed(6)}s" repeatCount="indefinite"/>${inner}</g>`;
  });
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${frames.join('')}</svg>`;
}

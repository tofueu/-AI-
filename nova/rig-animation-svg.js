import { renderNovaRigSvg } from './rig-debug-svg.js';
import { sampleNovaTimeline } from './skeletal-timeline.js';

/** Export a self-contained SVG rig diagnostic; no external assets required. */
export function renderNovaRigAnimationSvg(clip, { width=320, height=480, fps=12, maxFrames=240 }={}) {
  if (!Number.isInteger(fps) || fps < 1 || fps > 60) throw Error('Invalid animation FPS');
  if (!Number.isInteger(maxFrames) || maxFrames < 2 || maxFrames > 600) throw Error('Invalid frame cap');
  if (!Number.isInteger(width) || width < 1 || width > 8192 || !Number.isInteger(height) || height < 1 || height > 8192) throw Error('Invalid canvas dimensions');
  const { durationMs } = sampleNovaTimeline(clip, 0);
  const isLooping = clip.loop === true;
  const repeatCount = isLooping ? 'indefinite' : '1';
  const count = Math.max(2, Math.ceil(durationMs * fps / 1000));
  if (count > maxFrames) throw Error('Animation exceeds frame cap');
  const keyTimes = Array.from({length:count+1}, (_,i) => (i/count).toFixed(8)).join(';');
  const frameCount = isLooping ? count : count + 1;
  const frames = Array.from({length:frameCount}, (_,i) => {
    const svg = renderNovaRigSvg(clip, i * durationMs / count, {width,height});
    const inner = svg.slice(svg.indexOf('>')+1, svg.lastIndexOf('</svg>'));
    const values = Array.from({length:count+1}, (_,j) => ((isLooping ? j%count === i : j === i) ? 'visible' : 'hidden')).join(';');
    return `<g visibility="hidden"><animate attributeName="visibility" calcMode="discrete" values="${values}" keyTimes="${keyTimes}" dur="${durationMs}ms" repeatCount="${repeatCount}" fill="freeze"/>${inner}</g>`;
  });
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${frames.join('')}</svg>`;
}

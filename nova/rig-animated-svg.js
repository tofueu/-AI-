import { renderRigSvgSequence } from './rig-svg-preview.js';

// Standalone looping SVG diagnostic animation; no JavaScript needed for playback.
export function renderAnimatedRigSvg(sequence) {
  if (!sequence || !Number.isFinite(sequence.frameDurationMs) || sequence.frameDurationMs <= 0 || !Array.isArray(sequence.frames) || sequence.frames.length < 2 || sequence.frames.length > 12000) {
    throw new TypeError('Invalid frame sequence');
  }
  const images = renderRigSvgSequence(sequence);
  const n = images.length;
  const duration = (sequence.frameDurationMs * n / 1000).toFixed(6);
  const keyTimes = Array.from({length:n+1},(_,i)=>(i/n).toFixed(8)).join(';');
  const layers = images.map((svg,i) => {
    const body = svg.slice(svg.indexOf('>')+1, svg.lastIndexOf('</svg>'));
    const values = Array.from({length:n+1},(_,j)=>j===i ? 'visible' : 'hidden').join(';');
    return `<g visibility="hidden">${body}<animate attributeName="visibility" calcMode="discrete" dur="${duration}s" repeatCount="indefinite" keyTimes="${keyTimes}" values="${values}"/></g>`;
  }).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 340" width="320" height="340" role="img" aria-label="NOVA ${sequence.variant} animated rig diagnostic">${layers}</svg>`;
}

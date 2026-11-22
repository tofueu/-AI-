import { renderLayerFrameSvg } from './svg-frame-renderer.js';

/** Create a script-free looping SVG preview from already-bound MOD layer frames. */
export function renderLayerAnimationSvg({frames,width,height,durationMs=1000,background='none'}) {
  if (!Array.isArray(frames) || frames.length < 2 || frames.length > 60) throw new RangeError('Invalid animation frames');
  if (!Number.isFinite(durationMs) || durationMs < 20 || durationMs > 600000) throw new RangeError('Invalid duration');
  const rendered = frames.map(frame => renderLayerFrameSvg({layers:frame.layers,width,height,background}));
  const keyTimes = Array.from({length:frames.length+1},(_,i)=>(i/frames.length).toFixed(8)).join(';');
  const groups = rendered.map((svg,i) => {
    const start = svg.indexOf('>');
    const end = svg.lastIndexOf('</svg>');
    if (start < 0 || end <= start) throw new TypeError('Invalid generated SVG');
    const values = Array.from({length:frames.length+1},(_,j)=>(j%frames.length===i?'visible':'hidden')).join(';');
    return `<g visibility="${i===0?'visible':'hidden'}"><animate attributeName="visibility" calcMode="discrete" values="${values}" keyTimes="${keyTimes}" dur="${durationMs}ms" repeatCount="indefinite"/>${svg.slice(start+1,end)}</g>`;
  });
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${groups.join('')}</svg>`;
}

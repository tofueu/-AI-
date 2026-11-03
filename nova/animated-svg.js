import {renderNovaSvg} from './svg-renderer.js';

// Export a script-free, looped SVG preview from sampled NOVA poses.
// Discrete SVG keyTimes must end at 1; repeat the first value at that boundary.
export function renderNovaAnimatedSvg(frames,{width=320,height=320,durationMs=1000}={}) {
  if(!Array.isArray(frames)||frames.length<2||frames.length>60)throw new Error('Invalid animation frames');
  if(!Number.isInteger(width)||!Number.isInteger(height)||width<1||height<1||width>4096||height>4096)throw new Error('Invalid canvas size');
  if(!Number.isFinite(durationMs)||durationMs<20||durationMs>600000)throw new Error('Invalid animation duration');
  const n=frames.length;
  const keyTimes=Array.from({length:n+1},(_,j)=>(j/n).toFixed(8)).join(';');
  const children=frames.map((pose,i)=>{
    const svg=renderNovaSvg(pose,{width,height});
    const inner=svg.slice(svg.indexOf('>')+1,svg.lastIndexOf('</svg>'));
    const values=Array.from({length:n+1},(_,j)=>(j%n)===i?'visible':'hidden').join(';');
    return `<g visibility="${i===0?'visible':'hidden'}"><animate attributeName="visibility" calcMode="discrete" values="${values}" keyTimes="${keyTimes}" dur="${durationMs}ms" repeatCount="indefinite"/>${inner}</g>`;
  });
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${children.join('')}</svg>`;
}

import {renderNovaAnimationSvgFrames} from './nova-animation-svg-preview.js';

// Export a standalone, looping animated SVG from the diagnostic rig frames.
// This is a preview only: no MOD artwork is modified or embedded.
export function renderNovaAnimatedSvg(options = {}) {
 const sequence = renderNovaAnimationSvgFrames({...options, loops:1});
 const {frames, durationMs, variant, motion} = sequence;
 if (!frames.length) throw new Error('Animation has no frames');
 const first = frames[0].svg;
 const viewBox = first.match(/viewBox="([^"]+)"/)?.[1];
 if (!viewBox || !/^0 0 [0-9]+ [0-9]+$/.test(viewBox)) throw new Error('Invalid frame viewport');
 const frameCount = frames.length;
 const groups = frames.map((frame,index) => {
  const match = frame.svg.match(/^<svg\b[^>]*>([\s\S]*)<\/svg>$/);
  if (!match) throw new Error('Invalid SVG animation frame');
  return `<g class="nova-frame nova-frame-${index}">${match[1]}</g>`;
 }).join('');
 // Each frame is visible for exactly one slot; steps(1,end) prevents fades.
 const styles = frames.map((_,index) => {
  const start = (index/frameCount*100).toFixed(6);
  const end = ((index+1)/frameCount*100).toFixed(6);
  return `.nova-frame-${index}{animation:nova-frame-${index} ${durationMs}ms steps(1,end) infinite}@keyframes nova-frame-${index}{0%,100%{visibility:hidden}${start}%{visibility:visible}${end}%{visibility:hidden}}`;
 }).join('');
 return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" data-nova-variant="${variant}" data-motion="${motion}" role="img" aria-label="NOVA ${variant} ${motion} diagnostic animation"><style>.nova-frame{visibility:hidden}${styles}@media(prefers-reduced-motion:reduce){.nova-frame{animation:none!important}.nova-frame-0{visibility:visible}}</style>${groups}</svg>`;
}

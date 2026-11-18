import { renderNovaPosedModSvg } from './posed-mod-svg.js';
import { sampleNovaTimeline } from './skeletal-timeline.js';

/** Animate resolved MOD artwork without modifying the source PNG layers. */
export function renderNovaPosedModAnimationSvg(base, mod, clip, options = {}) {
  const {width=512,height=512,fps=12,maxFrames=240,assetPrefix=''} = options;
  if (!Number.isSafeInteger(fps) || fps < 1 || fps > 60) throw Error('Invalid animation FPS');
  if (!Number.isSafeInteger(maxFrames) || maxFrames < 2 || maxFrames > 600) throw Error('Invalid frame cap');
  const {durationMs} = sampleNovaTimeline(clip,0);
  const count = Math.max(2,Math.ceil(durationMs*fps/1000));
  if (count > maxFrames) throw Error('Animation exceeds frame cap');
  const looping = clip.loop === true;
  const keyTimes = Array.from({length:count+1},(_,i)=>(i/count).toFixed(8)).join(';');
  const groups = [];
  let fallbacks = [];
  for(let i=0;i<(looping?count:count+1);i++){
    const {svg,fallbacks:used} = renderNovaPosedModSvg(base,mod,clip,i*durationMs/count,{width,height,assetPrefix});
    fallbacks = used;
    const inner = svg.slice(svg.indexOf('>')+1,svg.lastIndexOf('</svg>'));
    const values = Array.from({length:count+1},(_,j)=>(looping?j%count===i:j===i)?'visible':'hidden').join(';');
    groups.push(`<g visibility="hidden"><animate attributeName="visibility" calcMode="discrete" values="${values}" keyTimes="${keyTimes}" dur="${durationMs}ms" repeatCount="${looping?'indefinite':'1'}" fill="freeze"/>${inner}</g>`);
  }
  return {fallbacks,svg:`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${groups.join('')}</svg>`};
}

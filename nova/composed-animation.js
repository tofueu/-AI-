import {renderNovaFrameSvg} from './frame-svg.js';

// Script-free looping preview of composed Q/adult MOD frames.
export function renderNovaComposedAnimationSvg(frames, options={}) {
  if (!Array.isArray(frames) || frames.length < 2 || frames.length > 60) throw new Error('Invalid NOVA animation frames');
  const {durationMs=1000, ...canvas}=options;
  if (typeof durationMs !== 'number' || !Number.isFinite(durationMs) || durationMs < 20 || durationMs > 600000) throw new Error('Invalid NOVA animation duration');
  const variant=frames[0]?.variant;
  if (!['chibi','adult'].includes(variant) || frames.some(f=>f?.variant!==variant)) throw new Error('Mixed NOVA rig variants');
  const rendered=frames.map(f=>renderNovaFrameSvg(f,canvas));
  const first=rendered[0];
  const open=first.slice(0,first.indexOf('>')+1);
  const times=Array.from({length:frames.length+1},(_,i)=>(i/frames.length).toFixed(8)).join(';');
  const groups=rendered.map((svg,i)=>{
    const inner=svg.slice(svg.indexOf('>')+1,svg.lastIndexOf('</svg>'));
    const values=Array.from({length:frames.length+1},(_,j)=>j%frames.length===i?'visible':'hidden').join(';');
    return `<g visibility="${i===0?'visible':'hidden'}"><animate attributeName="visibility" calcMode="discrete" values="${values}" keyTimes="${times}" dur="${durationMs}ms" repeatCount="indefinite"/>${inner}</g>`;
  });
  return `${open}${groups.join('')}</svg>`;
}

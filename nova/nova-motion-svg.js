import {renderNovaRigSvg} from './nova-rig-svg-preview.js';

// Export a self-contained, looping SVG storyboard; skeleton preview only, not final character art.
export function renderNovaMotionSvg(variant='chibi',motion='idle',options={}) {
 const {frames=12,durationMs=motion==='walk'?800:motion==='typing'?600:1200,mod={},base={}}=options;
 if(!Number.isInteger(frames)||frames<2||frames>120)throw new RangeError('frames must be 2..120');
 if(!Number.isFinite(durationMs)||durationMs<100||durationMs>60000)throw new RangeError('invalid durationMs');
 const first=renderNovaRigSvg(variant,motion,0,mod,base);
 const match=first.match(/^<svg([^>]*)>([\s\S]*)<\/svg>$/);
 if(!match)throw new Error('Invalid NOVA SVG frame');
 const [ ,attributes ]=match;
 const frameBodies=Array.from({length:frames},(_,i)=>{
   const svg=renderNovaRigSvg(variant,motion,i*durationMs/frames,mod,base);
   const body=svg.match(/^<svg[^>]*>([\s\S]*)<\/svg>$/);
   if(!body)throw new Error('Invalid NOVA SVG frame');
   // Visibility is driven by discrete SVG animation, with no scripts or remote resources.
   return '<g data-frame="'+i+'" visibility="'+(i===0?'visible':'hidden')+'">'+body[1]+
     '<animate attributeName="visibility" values="'+Array.from({length:frames},(_,j)=>j===i?'visible':'hidden').join(';')+
     '" keyTimes="'+Array.from({length:frames+1},(_,j)=>j/frames).join(';')+
     '" calcMode="discrete" dur="'+durationMs+'ms" repeatCount="indefinite"/></g>';
 });
 // For discrete animation the final value repeats the first value at the loop boundary.
 const fixed=frameBodies.map((body,i)=>body.replace(/values="([^"]+)"/,(_,values)=>'values="'+values+';'+(i===0?'visible':'hidden')+'"'));
 return '<svg'+attributes+'><title>NOVA animated joint preview, not final art</title>'+fixed.join('')+'</svg>';
}

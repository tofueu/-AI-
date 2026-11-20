import {composeNovaModSvg} from './nova-mod-svg-compositor.js';
import {NOVA_RIGS,sampleNovaPose} from './nova-rig-motion.js';

// Diagnostic MOD animation: full-canvas layers are translated by their nearest
// rig joint. This is NOT articulated mesh deformation or finished character art.
const ANCHORS={body:'root',underwear:'root',bottom:'hipL',top:'neck',neck:'neck',head:'head',eyes:'head',mouth:'head',hairBack:'head',hairFront:'head',hat:'head',accessory:'handR'};
const DURATIONS={idle:1200,walk:800,typing:600};
const escapeAttribute=value=>String(value).replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;').replaceAll('>','&gt;');
export function renderNovaAnimatedModSvg(variant,motion,mod={},base={},options={}){
 const {frames=12,durationMs=DURATIONS[motion]}=options;
 if(!Number.isInteger(frames)||frames<2||frames>60)throw new RangeError('frames must be 2..60');
 if(!Number.isFinite(durationMs)||durationMs<=0)throw new RangeError('Invalid duration');
 if(!Object.hasOwn(DURATIONS,motion))throw new Error('Unknown NOVA motion');
 const rig=NOVA_RIGS[variant];
 if(!rig)throw new Error('Unknown NOVA variant');
 const {svg,layers}=composeNovaModSvg(variant,mod,base);
 const [w,h]=rig.canvas;
 const layerMarkup=[...svg.matchAll(/<(?:image|rect)\b[^>]*data-layer="([^"]+)"[^>]*\/>/g)];
 const output=[`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" data-motion="${escapeAttribute(motion)}" data-variant="${escapeAttribute(variant)}">`];
 output.push('<style>');
 for(let i=0;i<frames;i++)output.push(`@keyframes nova-frame-${i}{0%,100%{opacity:0}${(100*i/frames).toFixed(5)}%{opacity:1}${(100*(i+1)/frames).toFixed(5)}%{opacity:0}}`);
 output.push('</style>');
 for(let i=0;i<frames;i++){
  const pose=sampleNovaPose(variant,motion,DURATIONS[motion]*i/frames);
  output.push(`<g data-frame="${i}" style="opacity:0;animation:nova-frame-${i} ${durationMs}ms steps(1,end) infinite">`);
  for(const [,name,markup] of layerMarkup){
   const anchor=ANCHORS[name],current=pose.joints[anchor],origin=rig.joints[anchor];
   const dx=Number((current[0]-origin[0]).toFixed(4)),dy=Number((current[1]-origin[1]).toFixed(4));
   output.push(`<g data-animated-layer="${name}" transform="translate(${dx} ${dy})">${markup[0]}</g>`);
  }
  output.push('</g>');
 }
 output.push('</svg>');
 return {svg:output.join('\n'),canvas:{width:w,height:h},layers,frames,durationMs};
}

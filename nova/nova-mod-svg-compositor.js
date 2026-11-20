import {NOVA_RIGS,NOVA_LAYERS,resolveNovaLayers} from './nova-rig-motion.js';
const SAFE=/^(?!\/)(?!.*(?:^|\/)\.\.?\/)(?!.*\\)[a-zA-Z0-9_./-]+\.png$/;
const PAINT_ORDER=['hairBack','body','underwear','bottom','top','neck','head','eyes','mouth','hairFront','hat','accessory'];
const escapeXml=s=>s.replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll("'",'&apos;');
// Full-canvas PNG composition; builtin clothing uses rig-aligned fallback shapes.
export function composeNovaModSvg(variant,mod={},base={}) {
 const rig=NOVA_RIGS[variant];
 if(!rig)throw new Error('Unknown NOVA variant');
 if(!mod||typeof mod!=='object'||Array.isArray(mod)||!base||typeof base!=='object'||Array.isArray(base))throw new TypeError('Invalid layers');
 for(const source of [mod,base])for(const key of Object.keys(source))if(!NOVA_LAYERS.includes(key))throw new Error('Unknown layer: '+key);
 const layers=resolveNovaLayers(mod,base),[w,h]=rig.canvas;
 const out=[`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">`],p=rig.joints;
 // Draw rear hair behind the body and face; keep the public MOD layer schema unchanged.
 for(const name of PAINT_ORDER){
  const value=layers[name];if(value===null)continue;
  if(value===`builtin:basic-${name}`&&['top','bottom','underwear'].includes(name)){
   const cx=p.root[0],y=name==='top'?p.shoulderL[1]:name==='bottom'?p.hipL[1]:p.root[1]+42;
   const width=name==='top'?Math.abs(p.shoulderR[0]-p.shoulderL[0])+16:Math.abs(p.hipR[0]-p.hipL[0])+20;
   const height=name==='top'?Math.max(24,p.hipL[1]-y):name==='bottom'?Math.max(22,p.kneeL[1]-y):28;
   out.push(`<rect data-layer="${name}" x="${cx-width/2}" y="${y}" width="${width}" height="${height}" rx="8" fill="#a99bbf"/>`);
   continue;
  }
  if(typeof value!=='string'||!SAFE.test(value)||value.includes('//'))throw new Error('Unsafe PNG path for '+name);
  out.push(`<image data-layer="${name}" href="${escapeXml(value)}" x="0" y="0" width="${w}" height="${h}"/>`);
 }
 out.push('</svg>');
 return {svg:out.join('\n'),canvas:{width:w,height:h},layers};
}

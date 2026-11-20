import {NOVA_RIGS,NOVA_LAYERS} from './nova-rig-motion.js';

// Editable, image-free MOD drawing guide. Exported SVG is a template, not final art.
// Each layer is a separate named group so illustrators can replace its contents.
export function createNovaModDrawingTemplate(variant){
 const rig=NOVA_RIGS[variant];
 if(!rig)throw new Error('Unknown NOVA variant');
 const [width,height]=rig.canvas;
 const bones=[['root','neck'],['neck','head'],['neck','shoulderL'],['neck','shoulderR'],['shoulderL','elbowL'],['elbowL','handL'],['shoulderR','elbowR'],['elbowR','handR'],['root','hipL'],['root','hipR'],['hipL','kneeL'],['kneeL','footL'],['hipR','kneeR'],['kneeR','footR']];
 const skeleton=bones.map(([a,b])=>{
  const [x1,y1]=rig.joints[a],[x2,y2]=rig.joints[b];
  return `<line data-bone="${a}:${b}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#b48ce8" stroke-width="2"/>`;
 }).join('\n');
 const joints=Object.entries(rig.joints).map(([name,[x,y]])=>
  `<circle data-joint="${name}" cx="${x}" cy="${y}" r="4" fill="#b48ce8"/><text x="${x+7}" y="${y-7}" font-size="10" fill="#7251a6">${name}</text>`).join('\n');
 // Keep editable groups in the same back-to-front order as the runtime compositor.
 // NOVA_LAYERS remains the public MOD schema, independent of SVG paint order.
 const paintOrder=['hairBack',...NOVA_LAYERS.filter(name=>name!=='hairBack')];
 const groups=paintOrder.map(name=>`<g id="layer-${name}" data-layer="${name}"></g>`).join('\n');
 const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" data-nova-variant="${variant}">
<title>NOVA ${variant} editable MOD template</title>
${groups}
<g id="rig-guides" data-export="hide" opacity=".5">${skeleton}\n${joints}</g>
</svg>`;
 return {variant,canvas:{width,height},layers:[...NOVA_LAYERS],svg};
}

// Strip only the dedicated guide group for clean artwork exports. Keep all
// editable MOD groups intact, including empty groups awaiting replacement art.
export function exportNovaModArtworkSvg(templateSvg){
 if(typeof templateSvg!=='string'||!templateSvg.includes('data-nova-variant='))throw new TypeError('Expected NOVA SVG template');
 const guide=/<g id="rig-guides" data-export="hide" opacity="\.5">[\s\S]*?<\/g>/g;
 const matches=templateSvg.match(guide)||[];
 if(matches.length!==1)throw new Error('Expected exactly one NOVA rig guide group');
 return templateSvg.replace(guide,'');
}

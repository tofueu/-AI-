import {NOVA_RIGS,NOVA_LAYERS} from './nova-rig-motion.js';

// Editable, image-free MOD drawing guide. Exported SVG is a template, not final art.
// Each layer is a separate named group so illustrators can replace its contents.
export function createNovaModDrawingTemplate(variant){
 const rig=NOVA_RIGS[variant];
 if(!rig)throw new Error('Unknown NOVA variant');
 const [width,height]=rig.canvas;
 const joints=Object.entries(rig.joints).map(([name,[x,y]])=>
  `<circle data-joint="${name}" cx="${x}" cy="${y}" r="4" fill="#b48ce8"/>`).join('\n');
 // Keep editable groups in the same back-to-front order as the runtime compositor.
 // NOVA_LAYERS remains the public MOD schema, independent of SVG paint order.
 const paintOrder=['hairBack',...NOVA_LAYERS.filter(name=>name!=='hairBack')];
 const groups=paintOrder.map(name=>`<g id="layer-${name}" data-layer="${name}"></g>`).join('\n');
 const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" data-nova-variant="${variant}">
<title>NOVA ${variant} editable MOD template</title>
${groups}
<g id="rig-guides" data-export="hide" opacity=".5">${joints}</g>
</svg>`;
 return {variant,canvas:{width,height},layers:[...NOVA_LAYERS],svg};
}

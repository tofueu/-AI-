import {NOVA_RIGS,NOVA_LAYERS} from './nova-rig-motion.js';

// Editable SVG whiteboard for drawing individual PNG MOD layers.
// Guides are non-export artwork; layer groups remain empty by design.
export function createNovaLayerWhiteboard(variant) {
 const rig=NOVA_RIGS[variant];
 if(!rig)throw new Error('Unknown NOVA variant');
 const [width,height]=rig.canvas;
 const guide=Object.entries(rig.joints).map(([name,[x,y]])=>
  `<circle cx="${x}" cy="${y}" r="4"/><text x="${x+7}" y="${y-7}">${name}</text>`).join('');
 const slots=NOVA_LAYERS.map(name=>
  `<g id="layer-${name}" data-nova-layer="${name}" data-export-png="${name}.png"></g>`).join('\n  ');
 return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" data-nova-variant="${variant}">
 <title>NOVA ${variant} transparent MOD whiteboard</title>
 <g id="artwork" data-export-root="true">
  ${slots}
 </g>
 <g id="joint-guides" fill="none" stroke="#9566bf" stroke-width="1" font-family="sans-serif" font-size="11" opacity=".65" style="display:none">
  ${guide}
 </g>
</svg>`;
}

export function createNovaWhiteboardManifest() {
 return {version:1,variants:{chibi:{},adult:{}}};
}

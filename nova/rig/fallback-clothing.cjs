'use strict';
// Renderable emergency clothing; this is not final character artwork.
const VARIANTS=Object.freeze({chibi:{top:268,bottom:399,halfWidth:77},adult:{top:220,bottom:368,halfWidth:59}});
function fallbackClothingSvg(variant){
 const spec=VARIANTS[variant];
 if(!spec)throw new TypeError('Unknown NOVA variant');
 const {top,bottom,halfWidth}=spec,left=256-halfWidth,right=256+halfWidth;
 return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512"><path d="M ${left} ${top+25} L ${left-24} ${top+48} L ${left-10} ${top+90} L ${left} ${top+84} L ${left} ${bottom} Q 256 ${bottom+20} ${right} ${bottom} L ${right} ${top+84} L ${right+10} ${top+90} L ${right+24} ${top+48} L ${right} ${top+25} Q 256 ${top-10} ${left} ${top+25} Z" fill="#9b86cb" stroke="#66528f" stroke-width="5" stroke-linejoin="round"/><path d="M 229 ${top+13} Q 256 ${top+49} 283 ${top+13}" fill="none" stroke="#66528f" stroke-width="5"/></svg>`;
}
function resolveBuiltinSource(source){
 if(typeof source!=='string')throw new TypeError('Invalid layer source');
 if(!source.startsWith('builtin://'))return source;
 const match=/^builtin:\/\/base-clothes\/(chibi|adult)$/.exec(source);
 if(!match)throw new TypeError('Unsupported builtin layer source');
 return 'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(fallbackClothingSvg(match[1]));
}
function resolveLayerSources(layers){
 if(!Array.isArray(layers))throw new TypeError('Expected composed layers');
 return layers.map(layer=>({...layer,src:resolveBuiltinSource(layer.src)}));
}
module.exports={fallbackClothingSvg,resolveBuiltinSource,resolveLayerSources};

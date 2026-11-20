import {NOVA_LAYERS} from './nova-rig-motion.js';

// Edit a named MOD group without touching any other layer or rig guides.
// SVG fragments are deliberately restricted to non-executable drawing primitives.
const SAFE_TAGS=new Set(['path','circle','ellipse','rect','line','polyline','polygon','g']);
const SAFE_ATTRS=new Set(['d','cx','cy','rx','ry','r','x','y','x1','y1','x2','y2','width','height','points','fill','stroke','stroke-width','opacity','transform','fill-rule','stroke-linecap','stroke-linejoin']);
export function validateNovaSvgArtwork(fragment){
 if(typeof fragment!=='string'||fragment.length>262144)throw new TypeError('Invalid NOVA artwork');
 const tags=fragment.match(/<[^>]*>/g)||[];
 if(fragment.replace(/<[^>]*>/g,'').trim())throw new Error('Unexpected SVG text');
 const stack=[];
 for(const tag of tags){
  const m=/^<\s*(\/?)\s*([a-zA-Z][\w-]*)([^<>]*?)(\/?)\s*>$/.exec(tag);
  if(!m||!SAFE_TAGS.has(m[2]))throw new Error('Unsupported SVG element');
  if(m[1]){if(m[3].trim()||m[4]||stack.pop()!==m[2])throw new Error('Invalid SVG nesting');continue;}
  const attrs=m[3];
  const attrPattern=/\s+([\w-]+)\s*=\s*"([^"]*)"/g;
  let remaining=attrs,match;
  const seenAttrs=new Set();
  while((match=attrPattern.exec(attrs))){
   if(seenAttrs.has(match[1]))throw new Error('Duplicate SVG attribute');
   seenAttrs.add(match[1]);
   if(!SAFE_ATTRS.has(match[1])||/[<>&]|url\s*\(|javascript:|data:/i.test(match[2]))throw new Error('Unsafe SVG attribute');
   remaining=remaining.replace(match[0],'');
  }
  if(remaining.trim())throw new Error('Invalid SVG attributes');
  if(!m[4])stack.push(m[2]);
 }
 if(stack.length)throw new Error('Unclosed SVG element');
 return fragment;
}
export function replaceNovaModSvgLayer(svg,layer,artwork){
 if(typeof svg!=='string'||!svg.includes('data-nova-variant='))throw new TypeError('Expected NOVA SVG');
 if(!NOVA_LAYERS.includes(layer))throw new Error('Unknown NOVA layer');
 validateNovaSvgArtwork(artwork);
 const marker=`<g id="layer-${layer}" data-layer="${layer}">`;
 const start=svg.indexOf(marker);
 if(start<0||svg.indexOf(marker,start+marker.length)>=0)throw new Error('Expected exactly one MOD layer');
 // Nested <g> artwork is valid; locate the matching closing group instead
 // of the first </g>, which could belong to an inner artwork group.
 const groupTags=/<\\/?g(?=[\\s>])[^>]*>/g;
 groupTags.lastIndex=start+marker.length;
 let depth=1,end=-1,match;
 while((match=groupTags.exec(svg))){
  if(/^<\\/g\\s*>$/.test(match[0])){
   if(--depth===0){end=match.index;break;}
  }else if(!/\\/\\s*>$/.test(match[0]))depth++;
 }
 if(end<0)throw new Error('Unclosed MOD layer');
 return svg.slice(0,start+marker.length)+artwork+svg.slice(end);
}

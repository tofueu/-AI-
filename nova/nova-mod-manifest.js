import {NOVA_LAYERS, resolveNovaLayers} from './nova-rig-motion.js';

// A deterministic MOD manifest resolver; no disk, network, or code execution.
const VALID_VARIANTS=new Set(['chibi','adult']);
const REQUIRED=new Set(['body','head','top','bottom','underwear']);
const SAFE_PATH=/^(?!\/)(?!.*(?:^|\/)\.\.?\/)(?!.*\\)[a-zA-Z0-9_./-]+\.png$/;
export function resolveNovaModManifest(manifest,variant,base={}) {
 if(!VALID_VARIANTS.has(variant))throw new Error('Unknown NOVA variant');
 if(!manifest||typeof manifest!=='object'||Array.isArray(manifest))throw new TypeError('Invalid MOD manifest');
 if(manifest.version!==1)throw new Error('Unsupported MOD manifest version');
 const variants=manifest.variants;
 if(!variants||typeof variants!=='object'||Array.isArray(variants))throw new TypeError('Missing MOD variants');
 const raw=variants[variant]??{};
 if(!raw||typeof raw!=='object'||Array.isArray(raw))throw new TypeError('Invalid variant layers');
 for(const name of Object.keys(raw))if(!NOVA_LAYERS.includes(name))throw new Error('Unknown MOD layer: '+name);
 const sanitized={};
 for(const name of NOVA_LAYERS){
  const value=raw[name];
  if(value===undefined)continue;
  if(value===null||value===''){sanitized[name]=null;continue;}
  if(typeof value!=='string'||!SAFE_PATH.test(value)||value.includes('//'))throw new Error('Unsafe MOD asset: '+name);
  sanitized[name]=value;
 }
 const layers=resolveNovaLayers(sanitized,base);
 // Missing essential art is explicit; only clothing has builtin fallbacks.
 const missing=[...REQUIRED].filter(name=>!layers[name]);
 return {variant,layers,missing,ready:missing.length===0};
}

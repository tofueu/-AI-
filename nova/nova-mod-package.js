import {NOVA_LAYERS, NOVA_RIGS, resolveNovaLayers} from './nova-rig-motion.js';

// Pure manifest validation: the caller owns image decoding and file I/O.
// No arbitrary paths or remote URLs are accepted as layer asset references.
const SAFE_ASSET = /^[a-zA-Z0-9_-]+(?:\/[a-zA-Z0-9_-]+)*\.(?:png|webp|svg)$/i;
export function validateNovaModPackage(input) {
 if(!input || typeof input !== 'object' || Array.isArray(input)) throw new TypeError('Expected NOVA MOD object');
 if(input.schemaVersion !== 1) throw new Error('Unsupported NOVA MOD schema version');
 if(!Object.hasOwn(NOVA_RIGS,input.variant)) throw new Error('Unknown NOVA variant');
 if(!input.layers || typeof input.layers !== 'object' || Array.isArray(input.layers)) throw new TypeError('Expected layers object');
 const layers={};
 for(const [name,value] of Object.entries(input.layers)) {
  if(!NOVA_LAYERS.includes(name)) throw new Error(`Unknown NOVA layer: ${name}`);
  if(value === null || value === false || value === '') {layers[name]=null;continue;}
  if(typeof value !== 'string' || !SAFE_ASSET.test(value)) throw new Error(`Invalid NOVA asset for ${name}`);
  layers[name]=value;
 }
 return {schemaVersion:1,variant:input.variant,layers};
}
export function applyNovaModPackage(input,base={}) {
 const mod=validateNovaModPackage(input);
 return {variant:mod.variant,layers:resolveNovaLayers(mod.layers,base)};
}

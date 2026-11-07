// Bind resolved MOD artwork slots to sampled rig joints without altering source art.
import {LAYER_SLOTS, NOVA_VARIANTS} from './mod-layers.js';
import {RIG_JOINTS} from './rig-animation.js';

export const NOVA_SLOT_JOINTS=Object.freeze({
 body:'torso',head:'head',eyes:'head',brows:'head',nose:'head',mouth:'head',
 hair_back:'head',hair_front:'head',hair_side:'head',hat:'head',face:'head',
 top:'torso',bottom:'hip_l',dress:'torso',outer:'torso',shoes:'ankle_l',
 accessory:'torso',wings:'torso',tail:'torso',
 leg_l:'hip_l',leg_r:'hip_r',shoes_l:'ankle_l',shoes_r:'ankle_r',
 arm_l:'shoulder_l',arm_r:'shoulder_r',hand_l:'wrist_l',hand_r:'wrist_r'
});

/** Renderer-ready, ordered draw records; callers apply rotation in degrees. */
export function bindNovaLayersToPose({variant,layers,pose}) {
 if(!NOVA_VARIANTS.includes(variant)) throw new Error('Unsupported NOVA variant');
 if(!Array.isArray(layers)||!pose||typeof pose!=='object'||Array.isArray(pose)) throw new Error('Invalid NOVA layer pose input');
 const seen=new Set();
 return layers.map(layer=>{
  if(!layer||!LAYER_SLOTS.includes(layer.slot)||seen.has(layer.slot)||typeof layer.src!=='string'||!layer.src.trim()||layer.hidden===true||layer.transparent===true) throw new Error('Invalid visible NOVA layer');
  seen.add(layer.slot);
  const joint=NOVA_SLOT_JOINTS[layer.slot];
  if(!RIG_JOINTS.includes(joint)) throw new Error('Unbound NOVA joint');
  const transform=pose[joint];
  if(!transform||!['x','y','rotation'].every(axis=>typeof transform[axis]==='number'&&Number.isFinite(transform[axis]))) throw new Error('Missing NOVA joint pose: '+joint);
  // Preserve validated per-part dimensions/pivots all the way to the SVG renderer.
  const sizing={};
  for(const key of ['width','height','anchorX','anchorY']) {
   if(layer[key]!==undefined) {
    const value=layer[key];
    if(typeof value!=='number'||!Number.isFinite(value)||
       (key==='width'||key==='height' ? value<=0||value>8192 : value<0||value>1)) throw new Error('Invalid NOVA layer '+key);
    sizing[key]=value;
   }
  }
  return {slot:layer.slot,src:layer.src,joint,...sizing,transform:{x:transform.x,y:transform.y,rotation:transform.rotation}};
 });
}

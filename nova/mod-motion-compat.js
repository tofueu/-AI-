// NOVA MOD-to-motion contract: artists replace images; runtime reuses the
// matching rig's named animations. This module does not animate pixels.
import {LAYER_SLOTS,NOVA_VARIANTS} from './mod-layers.js';

const MOTIONS=Object.freeze({
  idle:[], blink:['head','eyes'], talk:['head','mouth'],
  walk:['body','head'], typing:['body','head'], cry:['head','eyes']
});

export function resolveNovaMotionCompatibility({variant,rig,visibleLayers,motions=MOTIONS}={}) {
  if(!NOVA_VARIANTS.includes(variant)) throw new Error('Unsupported NOVA variant');
  if(!rig || rig.variant!==variant || !Array.isArray(rig.bones) || !Array.isArray(rig.animations)) throw new Error('Incompatible NOVA rig');
  if(!Array.isArray(visibleLayers)) throw new Error('Invalid visible layers');
  const slots=new Set();
  for(const layer of visibleLayers) {
    if(!layer || !LAYER_SLOTS.includes(layer.slot) || slots.has(layer.slot)) throw new Error('Invalid or duplicate visible slot');
    slots.add(layer.slot);
  }
  const boneNames=new Set();
  for(const bone of rig.bones) {
    if(typeof bone!=='string' || !bone.trim() || boneNames.has(bone)) throw new Error('Invalid rig bone');
    boneNames.add(bone);
  }
  const available=new Set();
  for(const animation of rig.animations) {
    if(!animation || typeof animation.name!=='string' || !Array.isArray(animation.bones)) throw new Error('Invalid animation');
    if(available.has(animation.name)) throw new Error('Duplicate animation');
    for(const bone of animation.bones) if(!boneNames.has(bone)) throw new Error('Animation references unknown bone');
    available.add(animation.name);
  }
  return Object.entries(motions).map(([name,requiredSlots])=>{
    if(!Array.isArray(requiredSlots)||requiredSlots.some(s=>!LAYER_SLOTS.includes(s))) throw new Error('Invalid motion requirements');
    const missingSlots=requiredSlots.filter(s=>!slots.has(s));
    const missingAnimation=!available.has(name);
    return {name,enabled:missingSlots.length===0&&!missingAnimation,missingSlots,missingAnimation};
  });
}

import {NOVA_RIGS,NOVA_LAYERS,resolveNovaLayers} from './nova-rig-motion.js';

// Stable, machine-readable template specification for external MOD artists.
// No artwork is embedded or overwritten.
export function createNovaModTemplate(variant) {
 const rig=NOVA_RIGS[variant];
 if(!rig)throw new Error('Unknown NOVA variant');
 const layers=Object.fromEntries(NOVA_LAYERS.map(name=>[name,{
  file:`${name}.png`,visible:!['hat','accessory'].includes(name),
  required:['body','head'].includes(name)
 }]));
 return {
  schemaVersion:1,variant,canvas:{width:rig.canvas[0],height:rig.canvas[1]},
  joints:structuredClone(rig.joints),layers,
  fallback:resolveNovaLayers({},{}),
  notes:'Each PNG is a transparent full-canvas RGBA image; preserve canvas dimensions and joint coordinates. Empty optional layers are hidden.'
 };
}
export function validateNovaModTemplate(template) {
 if(!template||typeof template!=='object'||!NOVA_RIGS[template.variant])return false;
 const rig=NOVA_RIGS[template.variant];
 if(template.canvas?.width!==rig.canvas[0]||template.canvas?.height!==rig.canvas[1])return false;
 if(!template.layers||typeof template.layers!=='object')return false;
 return NOVA_LAYERS.every(name=>{
  const layer=template.layers[name];
  return layer&&layer.file===`${name}.png`&&typeof layer.visible==='boolean'&&typeof layer.required==='boolean';
 });
}

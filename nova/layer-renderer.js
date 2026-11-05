// Renderer-independent draw commands for NOVA layered PNG characters.
// Draw order is supplied by the resolved MOD layer order; never mutate source layers.
import {sampleNovaWorldPose} from './pose-composer.js';
const DEFAULT_BONES=Object.freeze({
 body:'body',head:'head',face:'head',eyes:'head',brows:'head',nose:'head',mouth:'head',
 hair_back:'head',hair_front:'head',hair_side:'head',hat:'head',
 top:'body',bottom:'body',dress:'body',outer:'body',
 arm_l:'arm_l',arm_r:'arm_r',hand_l:'hand_l',hand_r:'hand_r',
 leg_l:'leg_l',leg_r:'leg_r',shoes_l:'leg_l',shoes_r:'leg_r',
 shoes:'body',accessory:'head',wings:'body',tail:'body'
});
export function createNovaDrawCommands(rig,visibleLayers,motionName,timeMs,{slotBones=DEFAULT_BONES}={}) {
 if(!Array.isArray(visibleLayers)||!slotBones||typeof slotBones!=='object') throw new Error('Invalid draw layers');
 const pose=sampleNovaWorldPose(rig,motionName,timeMs);
 const commands=[],seen=new Set();
 for(const layer of visibleLayers) {
  if(!layer||typeof layer.slot!=='string'||seen.has(layer.slot)) throw new Error('Duplicate or invalid draw slot');
  seen.add(layer.slot);
  if(layer.hidden===true||layer.transparent===true) continue;
  if(typeof layer.src!=='string'||!layer.src.trim()) throw new Error('Missing PNG source');
  const bone=slotBones[layer.slot];
  if(typeof bone!=='string'||!Object.hasOwn(pose.matrices,bone)) throw new Error('Unbound layer bone: '+layer.slot);
  commands.push({slot:layer.slot,src:layer.src,bone,matrix:[...pose.matrices[bone]]});
 }
 return {variant:rig.variant,motionName,timeMs:pose.timeMs,commands};
}
export function drawNovaCommands(ctx,frame,images) {
 if(!ctx||typeof ctx.save!=='function'||typeof ctx.setTransform!=='function'||typeof ctx.drawImage!=='function'||typeof ctx.restore!=='function') throw new Error('Invalid 2D canvas context');
 if(!frame||!Array.isArray(frame.commands)||!images) throw new Error('Invalid draw frame');
 for(const command of frame.commands) {
  const img=images[command.src];
  if(!img) throw new Error('Missing decoded image: '+command.src);
  ctx.save();
  try {ctx.setTransform(...command.matrix);ctx.drawImage(img,0,0);}
  finally {ctx.restore();}
 }
}

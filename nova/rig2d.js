// Host-independent NOVA 2D rig sampler. Coordinates are local to each bone.
// A layered MOD can bind each slot to a named bone without redrawing the art.
export const RIG_BONES=Object.freeze(['root','hips','torso','neck','head','hair_back','hair_front','hat','upper_arm_l','lower_arm_l','hand_l','upper_arm_r','lower_arm_r','hand_r','upper_leg_l','lower_leg_l','foot_l','upper_leg_r','lower_leg_r','foot_r','skirt','wing_l','wing_r','tail']);
const parent={root:null,hips:'root',torso:'hips',neck:'torso',head:'neck',hair_back:'head',hair_front:'head',hat:'head',upper_arm_l:'torso',lower_arm_l:'upper_arm_l',hand_l:'lower_arm_l',upper_arm_r:'torso',lower_arm_r:'upper_arm_r',hand_r:'lower_arm_r',upper_leg_l:'hips',lower_leg_l:'upper_leg_l',foot_l:'lower_leg_l',upper_leg_r:'hips',lower_leg_r:'upper_leg_r',foot_r:'lower_leg_r',skirt:'hips',wing_l:'torso',wing_r:'torso',tail:'hips'};
const slots={body:'torso',head:'head',eyes:'head',brows:'head',nose:'head',mouth:'head',hair_back:'hair_back',hair_front:'hair_front',hair_side:'head',hat:'hat',top:'torso',bottom:'hips',dress:'skirt',shoes:'foot_l',accessory:'torso',wings:'wing_l',tail:'tail'};
export const DEFAULT_BONE_FOR_SLOT=Object.freeze(slots);
export const RIG_VARIANTS=Object.freeze({
 chibi:{height:320,headScale:1.4,legScale:0.7},
 adult:{height:640,headScale:1,legScale:1}
});
function finite(n,name){if(typeof n!=='number'||!Number.isFinite(n))throw new Error('Invalid '+name);return n;}
function transform(x=0,y=0,rotation=0,scaleX=1,scaleY=1){return {x:finite(x,'x'),y:finite(y,'y'),rotation:finite(rotation,'rotation'),scaleX:finite(scaleX,'scaleX'),scaleY:finite(scaleY,'scaleY')};}
export function validateRig(rig){
 if(!rig||!RIG_VARIANTS[rig.variant]||!rig.bones||typeof rig.bones!=='object')throw new Error('Invalid rig');
 for(const name of RIG_BONES){
  const bone=rig.bones[name];if(!bone)continue;
  if(typeof bone!=='object'||Array.isArray(bone))throw new Error('Invalid bone: '+name);
  transform(bone.x??0,bone.y??0,bone.rotation??0,bone.scaleX??1,bone.scaleY??1);
 }
 for(const name of Object.keys(rig.bones))if(!RIG_BONES.includes(name))throw new Error('Unknown bone: '+name);
 return true;
}
export function sampleRig(rig,action,timeMs){
 validateRig(rig);
 if(!action||!Array.isArray(action.keyframes)||!action.keyframes.length)throw new Error('Missing keyframes');
 finite(timeMs,'time');
 const frames=[...action.keyframes].sort((a,b)=>a.time-b.time);
 for(const f of frames){
  if(!f||typeof f!=='object'||!f.bones||typeof f.bones!=='object')throw new Error('Invalid keyframe');
  finite(f.time,'keyframe time');
  for(const name of Object.keys(f.bones))if(!RIG_BONES.includes(name))throw new Error('Unknown animated bone: '+name);
 }
 const duration=action.duration??frames.at(-1).time;
 if(!Number.isFinite(duration)||duration<0)throw new Error('Invalid duration');
 const t=duration>0&&action.loop!==false?((timeMs%duration)+duration)%duration:Math.max(0,Math.min(timeMs,duration));
 let left=frames[0],right=frames.at(-1);
 if(t<=frames[0].time)right=left;
 else if(t>=right.time)left=right;
 else for(let i=1;i<frames.length;i++)if(t<=frames[i].time){left=frames[i-1];right=frames[i];break;}
 const ratio=left===right?0:(t-left.time)/(right.time-left.time);
 const output={};
 for(const name of RIG_BONES){
  const base=rig.bones[name]??{};
  const a=left.bones[name]??{},b=right.bones[name]??{};
  const value={};
  for(const prop of ['x','y','rotation','scaleX','scaleY']){
   const defaultValue=prop.startsWith('scale')?1:0;
   const av=finite(a[prop]??base[prop]??defaultValue,prop),bv=finite(b[prop]??base[prop]??defaultValue,prop);
   value[prop]=av+(bv-av)*ratio;
  }
  output[name]={parent:parent[name],...value};
 }
 return output;
}
export function composeRigWorld(local){
 const world={};
 for(const name of RIG_BONES){
  const bone=local[name];if(!bone)throw new Error('Missing bone: '+name);
  const p=bone.parent?world[bone.parent]:null;
  if(!p){world[name]={...bone};continue;}
  const angle=p.rotation*Math.PI/180;
  const dx=bone.x*p.scaleX,dy=bone.y*p.scaleY;
  world[name]={...bone,x:p.x+Math.cos(angle)*dx-Math.sin(angle)*dy,y:p.y+Math.sin(angle)*dx+Math.cos(angle)*dy,rotation:p.rotation+bone.rotation,scaleX:p.scaleX*bone.scaleX,scaleY:p.scaleY*bone.scaleY};
 }
 return world;
}
export function bindModLayers(layers,world){
 if(!Array.isArray(layers))throw new Error('Invalid layers');
 return layers.map(layer=>{
  const bone=layer.bone??slots[layer.slot];
  if(!RIG_BONES.includes(bone)||!world[bone])throw new Error('Unbound layer: '+layer.slot);
  return {...layer,bone,transform:world[bone]};
 });
}

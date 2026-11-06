// Demonstration rigs, NOT bindings for official NOVA artwork.
const BONES=['root','torso','head','hair','arm_l','forearm_l','arm_r','forearm_r','leg_l','leg_r'];
const PARENTS={torso:'root',head:'torso',hair:'head',arm_l:'torso',forearm_l:'arm_l',arm_r:'torso',forearm_r:'arm_r',leg_l:'root',leg_r:'root'};
const frame=(timeMs,rotation=0)=>({timeMs,rotation});
const track=(bone,angles)=>({bone,keyframes:angles.map(([t,a])=>frame(t,a))});
const animations=[
 {name:'idle',durationMs:1200,loop:true,tracks:[track('head',[[0,-3],[600,3],[1200,-3]]),track('hair',[[0,4],[600,-4],[1200,4]]),track('arm_l',[[0,5],[600,-4],[1200,5]]),track('arm_r',[[0,-5],[600,4],[1200,-5]])]},
 {name:'wave',durationMs:1000,loop:true,tracks:[track('arm_r',[[0,-25],[250,-105],[500,-75],[750,-110],[1000,-25]]),track('forearm_r',[[0,0],[250,-25],[500,20],[750,-25],[1000,0]]),track('head',[[0,0],[500,8],[1000,0]])]},
 {name:'walk',durationMs:800,loop:true,tracks:[track('leg_l',[[0,-22],[400,22],[800,-22]]),track('leg_r',[[0,22],[400,-22],[800,22]]),track('arm_l',[[0,18],[400,-18],[800,18]]),track('arm_r',[[0,-18],[400,18],[800,-18]])]}
];
function rig(variant,scale){
 const offset={root:[0,0],torso:[0,-34],head:[0,-38],hair:[0,-12],arm_l:[-19,-22],forearm_l:[-4,24],arm_r:[19,-22],forearm_r:[4,24],leg_l:[-11,0],leg_r:[11,0]};
 const bones=BONES.slice();
 return {variant,bones,parents:{...PARENTS},scale,rest:Object.fromEntries(bones.map(b=>[b,{x:offset[b][0]*scale,y:offset[b][1]*scale}])),animations:structuredClone(animations)};
}
export const createNovaDemoRig=(variant)=>{
 if(variant!=='chibi'&&variant!=='adult')throw new Error('Unknown NOVA demo variant');
 return rig(variant,variant==='chibi'?1:1.5);
};
// Add static rest offsets before calling production composeNovaPose.
export function addNovaRestPose(rig,sample){
 if(!rig?.rest||!sample?.transforms)throw new Error('Invalid demo rest pose');
 const transforms=Object.fromEntries(rig.bones.map(b=>{
  const rest=rig.rest[b],t=sample.transforms[b];
  if(!rest||!t)throw new Error('Missing demo bone '+b);
  return [b,{...t,x:t.x+rest.x,y:t.y+rest.y}];
 }));
 return {...sample,transforms};
}

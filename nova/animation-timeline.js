// Deterministic, renderer-independent NOVA skeletal animation timeline.
// Coordinates are in template pixels; angles in degrees. No source art is modified.
export const NOVA_BONES=Object.freeze(['root','torso','neck','head','arm_l','forearm_l','hand_l','arm_r','forearm_r','hand_r','thigh_l','shin_l','foot_l','thigh_r','shin_r','foot_r']);
export const NOVA_ANIMATIONS=Object.freeze(['idle','walk','type','cry']);
const finite=n=>typeof n==='number'&&Number.isFinite(n);
const lerp=(a,b,t)=>a+(b-a)*t;
function validatePose(pose){
 if(!pose||typeof pose!=='object'||Array.isArray(pose))throw new Error('Invalid pose');
 for(const [bone,v] of Object.entries(pose)){
  if(!NOVA_BONES.includes(bone)||!v||typeof v!=='object'||Array.isArray(v))throw new Error('Invalid bone: '+bone);
  for(const [axis,n] of Object.entries(v))if(!['x','y','rotation','scale'].includes(axis)||!finite(n)||(axis==='scale'&&n<=0))throw new Error('Invalid bone transform: '+bone+'.'+axis);
 }
}
export function createNovaClip({variant,name,durationMs,frames,loop=true}){
 if(!['chibi','adult'].includes(variant))throw new Error('Invalid NOVA variant');
 if(!NOVA_ANIMATIONS.includes(name))throw new Error('Invalid NOVA animation');
 if(!finite(durationMs)||durationMs<=0)throw new Error('Invalid clip duration');
 if(!Array.isArray(frames)||frames.length<2)throw new Error('At least two keyframes required');
 let prev=-1;
 const copy=frames.map(({timeMs,pose})=>{
  if(!finite(timeMs)||timeMs<=prev||timeMs<0||timeMs>durationMs)throw new Error('Invalid keyframe time');
  validatePose(pose);prev=timeMs;
  return {timeMs,pose:Object.fromEntries(Object.entries(pose).map(([bone,t])=>[bone,{...t}]))};
 });
 if(copy[0].timeMs!==0||copy.at(-1).timeMs!==durationMs)throw new Error('Clip must span its duration');
 return {variant,name,durationMs,loop:loop===true,frames:copy};
}
export function sampleNovaClip(clip,timeMs){
 if(!clip||!Array.isArray(clip.frames)||!finite(timeMs))throw new Error('Invalid clip sample');
 const t=clip.loop?((timeMs%clip.durationMs)+clip.durationMs)%clip.durationMs:Math.max(0,Math.min(clip.durationMs,timeMs));
 let i=0;while(i<clip.frames.length-2&&clip.frames[i+1].timeMs<t)i++;
 const a=clip.frames[i],b=clip.frames[i+1];
 const alpha=(t-a.timeMs)/(b.timeMs-a.timeMs);
 const pose={};
 for(const bone of new Set([...Object.keys(a.pose),...Object.keys(b.pose)])){
  const start=a.pose[bone]??{},end=b.pose[bone]??{};
  pose[bone]={};
  for(const axis of ['x','y','rotation','scale']){
   const defaultValue=axis==='scale'?1:0;
   pose[bone][axis]=lerp(start[axis]??defaultValue,end[axis]??defaultValue,alpha);
  }
 }
 return {variant:clip.variant,name:clip.name,timeMs:t,pose};
}

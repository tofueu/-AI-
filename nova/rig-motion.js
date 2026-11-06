// Deterministic joint pose interpolation for both NOVA rigs; no artwork is modified.
export const RIG_VARIANTS=Object.freeze(['chibi','adult']);
export const RIG_JOINTS=Object.freeze(['root','head','hair_back','hair_front','hat','torso','arm_l','arm_r','hand_l','hand_r','leg_l','leg_r','foot_l','foot_r','accessory']);
const finite=n=>typeof n==='number'&&Number.isFinite(n);
export function sampleNovaMotion({variant,frames,timeMs,loop=true}) {
 if(!RIG_VARIANTS.includes(variant)) throw new Error('Unsupported NOVA variant');
 if(!Array.isArray(frames)||!frames.length||!finite(timeMs)) throw new Error('Invalid motion timeline');
 let previous=-1;
 for(const frame of frames){
  if(!frame||!finite(frame.atMs)||frame.atMs<0||frame.atMs<=previous||!frame.pose||typeof frame.pose!=='object'||Array.isArray(frame.pose)) throw new Error('Invalid motion frame');
  for(const [joint,transform] of Object.entries(frame.pose)){
   if(!RIG_JOINTS.includes(joint)||!transform||typeof transform!=='object'||Array.isArray(transform)) throw new Error('Invalid joint');
   for(const [axis,value] of Object.entries(transform))
    if(!['x','y','rotation','scaleX','scaleY'].includes(axis)||!finite(value)||(axis.startsWith('scale')&&value<=0)) throw new Error('Invalid transform');
  }
  previous=frame.atMs;
 }
 const duration=previous;
 const t=loop&&duration>0?((timeMs%duration)+duration)%duration:Math.max(0,Math.min(duration,timeMs));
 let upper=frames.findIndex(f=>f.atMs>=t);
 if(upper<0) upper=frames.length-1;
 const a=frames[Math.max(0,upper-1)],b=frames[upper];
 const blend=a===b?0:(t-a.atMs)/(b.atMs-a.atMs);
 const pose={};
 for(const joint of RIG_JOINTS){
  if(!Object.hasOwn(a.pose,joint)&&!Object.hasOwn(b.pose,joint)) continue;
  const start=a.pose[joint]||{},end=b.pose[joint]||{},transform={};
  for(const axis of ['x','y','rotation','scaleX','scaleY']){
   const fallback=axis.startsWith('scale')?1:0;
   const v0=start[axis]??fallback,v1=end[axis]??fallback;
   transform[axis]=v0+(v1-v0)*blend;
  }
  pose[joint]=transform;
 }
 return {variant,timeMs:t,pose};
}

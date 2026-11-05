// Bridge canonical 16-joint clips into the existing 2D MOD renderer action format.
import {RIG_JOINTS, validateClip} from './rig-animation.js';
import {RIG_BONES} from './rig2d.js';

const JOINT_TO_BONE=Object.freeze({
 root:'root',torso:'torso',neck:'neck',head:'head',
 shoulder_l:'upper_arm_l',elbow_l:'lower_arm_l',wrist_l:'hand_l',
 shoulder_r:'upper_arm_r',elbow_r:'lower_arm_r',wrist_r:'hand_r',
 hip_l:'upper_leg_l',knee_l:'lower_leg_l',ankle_l:'foot_l',
 hip_r:'upper_leg_r',knee_r:'lower_leg_r',ankle_r:'foot_r'
});
export function clipToRig2dAction(clip,{loop=true}={}) {
 validateClip(clip);
 if(typeof loop!=='boolean')throw new TypeError('loop must be boolean');
 const frames=clip.frames.map(frame=>{
  const bones={};
  for(const joint of RIG_JOINTS){
   const pose=frame.pose[joint];
   if(!pose)continue;
   const bone=JOINT_TO_BONE[joint];
   if(!RIG_BONES.includes(bone))throw new Error('Missing renderer bone: '+bone);
   // Preserve authored bone anchors: canonical x/y are offsets, not bind positions.
   bones[bone]={rotation:pose.rotation};
   if(joint==='root'){bones[bone].x=pose.x;bones[bone].y=pose.y;}
  }
  return {time:frame.time*1000,bones};
 });
 return {duration:frames.at(-1).time,loop,keyframes:frames};
}

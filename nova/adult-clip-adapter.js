// Convert adult motion poses into the canonical NOVA clip format.
// Artwork stays untouched; the resulting transforms can drive replaceable MOD layers.
import {ADULT_JOINTS, ADULT_ACTIONS, sampleAdultPose} from './adult-rig.js';
import {RIG_JOINTS, validateClip} from './rig-animation.js';

const JOINT_MAP=Object.freeze({
 root:'root', pelvis:'root', torso:'torso', neck:'neck', head:'head',
 left_shoulder:'shoulder_l', left_elbow:'elbow_l', left_wrist:'wrist_l',
 right_shoulder:'shoulder_r', right_elbow:'elbow_r', right_wrist:'wrist_r',
 left_hip:'hip_l', left_knee:'knee_l', left_ankle:'ankle_l',
 right_hip:'hip_r', right_knee:'knee_r', right_ankle:'ankle_r'
});
const finite=n=>typeof n==='number'&&Number.isFinite(n);
export function adultPoseToRig(pose) {
 if(!pose || pose.format!=='nova-adult-pose-v1' || !pose.angles || !pose.offsets)
  throw new TypeError('Invalid adult pose');
 const result=Object.fromEntries(RIG_JOINTS.map(j=>[j,{x:0,y:0,rotation:0}]));
 for(const joint of Object.keys(ADULT_JOINTS)) {
  const value=pose.angles[joint];
  if(!finite(value))throw new TypeError('Invalid angle: '+joint);
  if(joint==='pelvis')continue; // pelvis has no independent canonical slot
  result[JOINT_MAP[joint]].rotation=value;
 }
 const root=pose.offsets.root;
 if(!root||!finite(root.x)||!finite(root.y))throw new TypeError('Invalid root offset');
 result.root.x=root.x;
 result.root.y=root.y;
 return result;
}
export function makeAdultClip(action,{duration=2,fps=24}={}) {
 if(!ADULT_ACTIONS.includes(action))throw new RangeError('Unknown adult action');
 if(!finite(duration)||duration<=0||duration>30||!Number.isInteger(fps)||fps<1||fps>120)
  throw new RangeError('Invalid frame settings');
 const count=Math.ceil(duration*fps);
 const frames=Array.from({length:count+1},(_,index)=>{
  const time=index===count?duration:index/fps;
  return {time,pose:adultPoseToRig(sampleAdultPose(action,time))};
 });
 return validateClip({variant:'adult',action,frames});
}

// Adult NOVA motion rig: 16 articulated descendants plus a root.
// Neutral keyframes only: artwork/artist originals are never modified.
export const ADULT_JOINTS=Object.freeze({
 root:null,pelvis:'root',torso:'pelvis',neck:'torso',head:'neck',
 left_shoulder:'torso',left_elbow:'left_shoulder',left_wrist:'left_elbow',
 right_shoulder:'torso',right_elbow:'right_shoulder',right_wrist:'right_elbow',
 left_hip:'pelvis',left_knee:'left_hip',left_ankle:'left_knee',
 right_hip:'pelvis',right_knee:'right_hip',right_ankle:'right_knee'
});
export const ADULT_ACTIONS=Object.freeze(['idle','walk','run','typing','cry','sleep']);
const wave=p=>Math.sin(2*Math.PI*p);
export function sampleAdultPose(action,time){
 if(!ADULT_ACTIONS.includes(action))throw new RangeError('Unknown adult action');
 if(!Number.isFinite(time))throw new TypeError('Invalid time');
 const rate={idle:.55,walk:1.4,run:2.4,typing:1.7,cry:.7,sleep:.24}[action];
 const phase=((time*rate)%1+1)%1,s=wave(phase);
 const angles=Object.fromEntries(Object.keys(ADULT_JOINTS).map(k=>[k,0]));
 const offsets={root:{x:0,y:0}};
 if(action==='idle'){angles.head=2*s;angles.torso=1.5*s;offsets.root.y=1.4*s;}
 if(action==='walk'||action==='run'){
  const k=action==='run'?1.65:1;
  angles.left_hip=25*s*k;angles.right_hip=-25*s*k;
  angles.left_knee=24*Math.max(0,-s)*k;angles.right_knee=24*Math.max(0,s)*k;
  angles.left_shoulder=-19*s*k;angles.right_shoulder=19*s*k;
  angles.left_elbow=-9;angles.right_elbow=9;
  offsets.root.y=(action==='run'?6:2)*Math.abs(s);
 }
 if(action==='typing'){
  angles.left_shoulder=-32;angles.right_shoulder=32;
  angles.left_elbow=-55+6*s;angles.right_elbow=55-6*s;
  angles.left_wrist=9*s;angles.right_wrist=-9*s;angles.head=2*s;
 }
 if(action==='cry'){
  angles.head=12+3*s;angles.left_shoulder=-26;angles.right_shoulder=26;
  angles.left_elbow=-65;angles.right_elbow=65;offsets.root.y=2*Math.abs(s);
 }
 if(action==='sleep'){
  angles.torso=4*s;angles.head=12+2*s;
  angles.left_shoulder=-8;angles.right_shoulder=8;offsets.root.y=1.5*s;
 }
 return {format:'nova-adult-pose-v1',action,time,phase,angles,offsets};
}
export function sampleAdultFrames(action,{duration=2,fps=24}={}){
 if(!Number.isFinite(duration)||duration<=0||duration>30||
    !Number.isInteger(fps)||fps<1||fps>120)throw new RangeError('Invalid frame settings');
 return Array.from({length:Math.ceil(duration*fps)},(_,index)=>({
  index,time:index/fps,pose:sampleAdultPose(action,index/fps)
 }));
}

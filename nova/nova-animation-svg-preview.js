import {sampleNovaPose} from './nova-rig-motion.js';
import {planNovaAnimationFrames} from './nova-animation-timeline.js';

// Diagnostic SVG previews of animated joint positions, not finished character art.
// Every frame is a standalone SVG and does not alter user-provided MOD assets.
const BONES=[['root','neck'],['neck','head'],['neck','shoulderL'],['shoulderL','elbowL'],['elbowL','handL'],['neck','shoulderR'],['shoulderR','elbowR'],['elbowR','handR'],['root','hipL'],['hipL','kneeL'],['kneeL','footL'],['root','hipR'],['hipR','kneeR'],['kneeR','footR']];
export function renderNovaPoseSvg(variant,motion,elapsedMs=0) {
 const pose=sampleNovaPose(variant,motion,elapsedMs);
 const [width,height]=pose.canvas;
 const lines=BONES.map(([a,b])=>{
  const [x1,y1]=pose.joints[a],[x2,y2]=pose.joints[b];
  return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/>`;
 }).join('');
 const dots=Object.entries(pose.joints).map(([name,[x,y]])=>
  `<circle data-joint="${name}" cx="${x}" cy="${y}" r="5"/>`).join('');
 return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" data-nova-variant="${variant}" data-motion="${motion}"><g stroke="#9370bc" stroke-width="8" stroke-linecap="round" fill="none">${lines}</g><g fill="#d7b4f5">${dots}</g></svg>`;
}
export function renderNovaAnimationSvgFrames(options) {
 const schedule=planNovaAnimationFrames(options);
 return {...schedule,frames:schedule.frames.map(frame=>({...frame,svg:renderNovaPoseSvg(schedule.variant,schedule.motion,frame.elapsedMs)}))};
}

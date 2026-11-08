'use strict';
const fs = require('node:fs');
const path = require('node:path');
const {pose,clips,variants} = require('../rig/joint-animation.cjs');

const BONES = [
 ['head','neck'],['neck','torso'],['torso','hip'],
 ['neck','leftShoulder'],['leftShoulder','leftElbow'],['leftElbow','leftHand'],
 ['neck','rightShoulder'],['rightShoulder','rightElbow'],['rightElbow','rightHand'],
 ['hip','leftKnee'],['leftKnee','leftFoot'],['hip','rightKnee'],['rightKnee','rightFoot']
];
function renderSvg(variant,clip,time) {
 const joints=pose(variant,clip,time);
 const lines=BONES.map(([a,b])=>'<line x1="'+joints[a][0]+'" y1="'+joints[a][1]+'" x2="'+joints[b][0]+'" y2="'+joints[b][1]+'"/>').join('');
 const dots=Object.entries(joints).map(([name,[x,y]])=>'<circle cx="'+x+'" cy="'+y+'" r="5"><title>'+name+'</title></circle>').join('');
 return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512" role="img" aria-label="'+variant+' '+clip+' rig frame"><rect width="512" height="512" fill="#f7f3ff"/><g fill="none" stroke="#7654b5" stroke-width="8" stroke-linecap="round">'+lines+'</g><g fill="#e49cc8" stroke="#7654b5" stroke-width="2">'+dots+'</g></svg>\n';
}
function exportFrames(directory,variant,clip,count=12) {
 if(!Object.hasOwn(variants,variant)||!Object.hasOwn(clips,clip)||!Number.isInteger(count)||count<2||count>120)throw new TypeError('Invalid export settings');
 fs.mkdirSync(directory,{recursive:true});
 const files=[];
 for(let i=0;i<count;i++){
  const name=variant+'-'+clip+'-'+String(i).padStart(3,'0')+'.svg';
  fs.writeFileSync(path.join(directory,name),renderSvg(variant,clip,clips[clip].duration*i/count));
  files.push(name);
 }
 return files;
}
if(require.main===module){
 const [directory,variant,clip,count]=process.argv.slice(2);
 if(!directory||!variant||!clip){console.error('Usage: node nova/tools/export-rig-frames.cjs OUTPUT_DIR chibi|adult idle|walk|typing [count]');process.exitCode=2;}
 else {try{console.log(exportFrames(directory,variant,clip,count===undefined?12:Number(count)).join('\n'));}catch(e){console.error(e.message);process.exitCode=1;}}
}
module.exports={BONES,renderSvg,exportFrames};

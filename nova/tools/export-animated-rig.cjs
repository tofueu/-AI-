'use strict';
const fs=require('node:fs');
const path=require('node:path');
const {pose,clips,variants}=require('../rig/joint-animation.cjs');
const {BONES}=require('./export-rig-frames.cjs');
function animatedSvg(variant,clip,steps=24){
 if(!Object.hasOwn(variants,variant)||!Object.hasOwn(clips,clip)||!Number.isInteger(steps)||steps<4||steps>120)throw new TypeError('Invalid animation settings');
 const duration=clips[clip].duration;
 const poses=Array.from({length:steps+1},(_,i)=>pose(variant,clip,duration*i/steps));
 const values=(fn)=>poses.map(fn).join(';');
 const anim=(attr,fn)=>'<animate attributeName="'+attr+'" values="'+values(fn)+'" dur="'+duration+'ms" repeatCount="indefinite" calcMode="linear"/>';
 const lines=BONES.map(([a,b])=>'<line x1="'+poses[0][a][0]+'" y1="'+poses[0][a][1]+'" x2="'+poses[0][b][0]+'" y2="'+poses[0][b][1]+'">'+['x1','y1','x2','y2'].map((attr,i)=>anim(attr,p=>p[i<2?a:b][i%2])).join('')+'</line>').join('');
 const dots=Object.keys(poses[0]).map(j=>'<circle r="5" cx="'+poses[0][j][0]+'" cy="'+poses[0][j][1]+'">'+anim('cx',p=>p[j][0])+anim('cy',p=>p[j][1])+'<title>'+j+'</title></circle>').join('');
 return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512" role="img" aria-label="'+variant+' '+clip+' animated rig"><rect width="512" height="512" fill="#f7f3ff"/><g fill="none" stroke="#7654b5" stroke-width="8" stroke-linecap="round">'+lines+'</g><g fill="#e49cc8" stroke="#7654b5" stroke-width="2">'+dots+'</g></svg>\n';
}
function exportAnimated(directory){
 fs.mkdirSync(directory,{recursive:true});
 const files=[];
 for(const variant of Object.keys(variants))for(const clip of Object.keys(clips)){
  const name=variant+'-'+clip+'-animated.svg';
  fs.writeFileSync(path.join(directory,name),animatedSvg(variant,clip));
  files.push(name);
 }
 return files;
}
if(require.main===module){try{console.log(exportAnimated(process.argv[2]||path.join(process.cwd(),'nova-rig-animated')).join('\n'));}catch(e){console.error(e.message);process.exitCode=1;}}
module.exports={animatedSvg,exportAnimated};

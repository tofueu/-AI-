'use strict';
const variants = Object.freeze({
 chibi:{head:[256,145],neck:[256,228],torso:[256,315],hip:[256,385],leftShoulder:[192,255],rightShoulder:[320,255],leftElbow:[160,318],rightElbow:[352,318],leftHand:[146,370],rightHand:[366,370],leftKnee:[224,430],rightKnee:[288,430],leftFoot:[215,486],rightFoot:[297,486]},
 adult:{head:[256,105],neck:[256,175],torso:[256,268],hip:[256,350],leftShoulder:[202,199],rightShoulder:[310,199],leftElbow:[173,276],rightElbow:[339,276],leftHand:[158,345],rightHand:[354,345],leftKnee:[225,425],rightKnee:[287,425],leftFoot:[215,492],rightFoot:[297,492]}
});
const clips=Object.freeze({
 idle:{duration:1200,loop:true,frames:[{t:0,offset:{torso:[0,0],head:[0,0]}},{t:600,offset:{torso:[0,-4],head:[0,-3]}},{t:1200,offset:{torso:[0,0],head:[0,0]}}]},
 walk:{duration:800,loop:true,frames:[{t:0,offset:{leftFoot:[-12,0],rightFoot:[12,-8],leftHand:[8,0],rightHand:[-8,0]}},{t:400,offset:{leftFoot:[12,-8],rightFoot:[-12,0],leftHand:[-8,0],rightHand:[8,0]}},{t:800,offset:{leftFoot:[-12,0],rightFoot:[12,-8],leftHand:[8,0],rightHand:[-8,0]}}]},
 typing:{duration:600,loop:true,frames:[{t:0,offset:{leftHand:[38,-30],rightHand:[-38,-30]}},{t:300,offset:{leftHand:[38,-35],rightHand:[-38,-25]}},{t:600,offset:{leftHand:[38,-30],rightHand:[-38,-30]}}]}
});
function pose(variant,clip,time){
 const base=variants[variant],anim=clips[clip];
 if(!base||!anim||!Number.isFinite(time))throw new TypeError('Invalid variant, clip or time');
 const t=anim.loop?((time%anim.duration)+anim.duration)%anim.duration:Math.max(0,Math.min(time,anim.duration));
 let a=anim.frames[0],b=anim.frames.at(-1);
 for(let i=1;i<anim.frames.length;i++)if(t<=anim.frames[i].t){a=anim.frames[i-1];b=anim.frames[i];break}
 const f=b.t===a.t?0:(t-a.t)/(b.t-a.t),result={};
 for(const [joint,xy] of Object.entries(base)){
  const x=a.offset[joint]||[0,0],y=b.offset[joint]||[0,0];
  result[joint]=[xy[0]+x[0]+(y[0]-x[0])*f,xy[1]+x[1]+(y[1]-x[1])*f];
 }
 return result;
}
module.exports={variants,clips,pose};

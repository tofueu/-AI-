// Data-only joint animation for both NOVA variants; independent of AI Workbench.
export const NOVA_RIGS = Object.freeze({
  chibi:{canvas:[512,512],joints:{root:[256,300],head:[256,165],neck:[256,251],shoulderL:[200,274],shoulderR:[312,274],elbowL:[169,328],elbowR:[343,328],handL:[166,372],handR:[346,372],hipL:[225,371],hipR:[287,371],kneeL:[221,419],kneeR:[291,419],footL:[216,464],footR:[296,464]}},
  adult:{canvas:[512,768],joints:{root:[256,414],head:[256,145],neck:[256,255],shoulderL:[196,288],shoulderR:[316,288],elbowL:[174,380],elbowR:[338,380],handL:[165,466],handR:[347,466],hipL:[222,476],hipR:[290,476],kneeL:[215,585],kneeR:[297,585],footL:[207,706],footR:[305,706]}}
});
export const NOVA_LAYERS=Object.freeze(['body','underwear','bottom','top','neck','head','eyes','mouth','hairBack','hairFront','hat','accessory']);
export function resolveNovaLayers(mod={},base={}) {
 const result={};
 for(const name of NOVA_LAYERS) {
  const selected=Object.hasOwn(mod,name)?mod[name]:base[name];
  result[name]=(selected===null||selected===false||selected==='')?null:(selected??null);
 }
 if(!result.top)result.top=base.top||'builtin:basic-top';
 if(!result.bottom)result.bottom=base.bottom||'builtin:basic-bottom';
 if(!result.underwear)result.underwear=base.underwear||'builtin:basic-underwear';
 return result;
}
const lerp=(a,b,t)=>a+(b-a)*t;
const MOTIONS={
 idle:{duration:1200,frames:[{},{head:[0,-3],handL:[0,2],handR:[0,2]},{}]},
 walk:{duration:800,frames:[{handL:[-9,-8],handR:[9,8],footL:[-13,-9],footR:[13,8]},{},{handL:[9,8],handR:[-9,-8],footL:[13,8],footR:[-13,-9]},{}]},
 typing:{duration:600,frames:[{elbowL:[8,-16],elbowR:[-8,-16],handL:[35,-38],handR:[-35,-38]},{elbowL:[8,-16],elbowR:[-8,-16],handL:[35,-42],handR:[-35,-34]},{elbowL:[8,-16],elbowR:[-8,-16],handL:[35,-34],handR:[-35,-42]}]}
};
export function sampleNovaPose(variant,motion,elapsedMs=0) {
 const rig=NOVA_RIGS[variant],clip=MOTIONS[motion];
 if(!rig)throw new Error('Unknown NOVA rig variant');
 if(!clip)throw new Error('Unknown NOVA motion');
 if(!Number.isFinite(elapsedMs))throw new Error('Invalid animation time');
 const count=clip.frames.length,phase=((elapsedMs%clip.duration)+clip.duration)%clip.duration/clip.duration*count;
 const index=Math.floor(phase),t=phase-index,a=clip.frames[index],b=clip.frames[(index+1)%count],joints={};
 for(const [name,point] of Object.entries(rig.joints)){
  const da=a[name]??[0,0],db=b[name]??[0,0];
  joints[name]=[point[0]+lerp(da[0],db[0],t),point[1]+lerp(da[1],db[1],t)];
 }
 return {variant,motion,canvas:[...rig.canvas],joints};
}
export function novaMotionNames(){return Object.keys(MOTIONS);}

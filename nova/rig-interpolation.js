export const NOVA_VARIANTS = Object.freeze(['chibi','adult']);
const neutral = {x:0,y:0,rotation:0,scaleX:1,scaleY:1};
export function normalizePose(pose={}) {
  if (!pose || typeof pose!=='object' || Array.isArray(pose)) throw new TypeError('Invalid pose');
  const result={};
  for (const [joint,channels] of Object.entries(pose)) {
    if (!/^[a-z][a-z0-9_]*$/i.test(joint) || !channels || typeof channels!=='object' || Array.isArray(channels)) throw new TypeError('Invalid joint');
    for (const key of Object.keys(channels)) if (!(key in neutral)) throw new TypeError('Unknown channel');
    result[joint]={};
    for (const [key,value] of Object.entries(neutral)) {
      const n=channels[key]??value;
      if (typeof n!=='number'||!Number.isFinite(n)) throw new TypeError('Nonfinite transform');
      result[joint][key]=n;
    }
  }
  return result;
}
export function interpolatePose(from,to,progress) {
  if (!Number.isFinite(progress)) throw new TypeError('Invalid progress');
  const t=Math.max(0,Math.min(1,progress)),a=normalizePose(from),b=normalizePose(to),out={};
  for (const joint of new Set([...Object.keys(a),...Object.keys(b)])) {
    out[joint]={};
    for (const key of Object.keys(neutral)) {
      const start=(a[joint]??neutral)[key],end=(b[joint]??neutral)[key];
      const delta=key==='rotation'?((end-start+540)%360)-180:end-start;
      out[joint][key]=start+delta*t;
    }
  }
  return out;
}
export function sampleAnimation({variant,frames,durationMs,loop=true},timeMs) {
  if (!NOVA_VARIANTS.includes(variant)) throw new TypeError('Invalid variant');
  if (!Number.isFinite(durationMs)||durationMs<=0||!Number.isFinite(timeMs)) throw new TypeError('Invalid time');
  if (!Array.isArray(frames)||frames.length<2) throw new TypeError('Need two frames');
  const timeline=frames.map(frame=>{
    if (!frame||!Number.isFinite(frame.at)||frame.at<0||frame.at>1) throw new TypeError('Invalid frame');
    return {at:frame.at,pose:normalizePose(frame.pose)};
  }).sort((a,b)=>a.at-b.at);
  if (timeline[0].at!==0||timeline.at(-1).at!==1) throw new RangeError('Timeline must cover 0 to 1');
  for(let i=1;i<timeline.length;i++) if(timeline[i].at===timeline[i-1].at) throw new RangeError('Duplicate frame');
  const elapsed=loop?((timeMs%durationMs)+durationMs)%durationMs:Math.max(0,Math.min(durationMs,timeMs));
  const position=elapsed/durationMs,index=timeline.findIndex(frame=>frame.at>=position);
  if(index===0)return timeline[0].pose;
  const start=timeline[index-1],end=timeline[index];
  return interpolatePose(start.pose,end.pose,(position-start.at)/(end.at-start.at));
}

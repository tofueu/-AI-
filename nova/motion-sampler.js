// Deterministic, renderer-independent keyframe sampling for NOVA rigs.
// Frames are milliseconds; transforms are local to each named bone.
// The renderer composes parent transforms and draws assigned PNG layers.
export function sampleNovaMotion(rig, motionName, timeMs) {
  if(!rig || !Array.isArray(rig.bones) || !Array.isArray(rig.animations)) throw new Error('Invalid rig');
  if(!Number.isFinite(timeMs) || timeMs<0) throw new Error('Invalid time');
  const bones=new Set(rig.bones);
  if(bones.size!==rig.bones.length || [...bones].some(b=>typeof b!=='string'||!b.trim())) throw new Error('Invalid bones');
  const motion=rig.animations.find(a=>a.name===motionName);
  if(!motion || !Array.isArray(motion.tracks) || !Number.isFinite(motion.durationMs) || motion.durationMs<=0) throw new Error('Invalid motion');
  const elapsed=motion.loop===false ? Math.min(timeMs,motion.durationMs) : timeMs%motion.durationMs;
  const transforms=Object.fromEntries(rig.bones.map(b=>[b,{x:0,y:0,rotation:0,scaleX:1,scaleY:1}]));
  const seen=new Set();
  for(const track of motion.tracks) {
    if(!bones.has(track.bone) || seen.has(track.bone) || !Array.isArray(track.keyframes) || !track.keyframes.length) throw new Error('Invalid track');
    seen.add(track.bone);
    let previous=-1;
    for(const frame of track.keyframes) {
      if(!Number.isFinite(frame.timeMs) || frame.timeMs<0 || frame.timeMs>motion.durationMs || frame.timeMs<=previous) throw new Error('Invalid keyframe time');
      previous=frame.timeMs;
      for(const key of ['x','y','rotation','scaleX','scaleY']) if(frame[key]!==undefined && !Number.isFinite(frame[key])) throw new Error('Invalid keyframe transform');
    }
    const frames=track.keyframes;
    let left=frames[0],right=frames[frames.length-1];
    if(elapsed<=left.timeMs) right=left;
    else if(elapsed>=right.timeMs) left=right;
    else for(let i=1;i<frames.length;i++) if(elapsed<=frames[i].timeMs) {left=frames[i-1];right=frames[i];break;}
    const ratio=right.timeMs===left.timeMs?0:(elapsed-left.timeMs)/(right.timeMs-left.timeMs);
    const defaults=transforms[track.bone];
    for(const key of Object.keys(defaults)) {
      const a=left[key]??defaults[key],b=right[key]??defaults[key];
      defaults[key]=a+(b-a)*ratio;
    }
  }
  return {name:motionName,timeMs:elapsed,transforms};
}

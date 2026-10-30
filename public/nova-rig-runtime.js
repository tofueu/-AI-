/** NOVA rig v1 — portable, data-only, 2D articulated puppet runtime.
 * Animations are keyed to common bone names, never a particular character image.
 * Real layered transparent PNGs are REQUIRED for deformable-looking motion.
 */
export const NOVA_RIG_FORMAT = 'nova.rig.v1';
export const REQUIRED_BONES = Object.freeze([
  'root','pelvis','torso','neck','head',
  'shoulder_l','elbow_l','wrist_l','shoulder_r','elbow_r','wrist_r',
  'hip_l','knee_l','ankle_l','hip_r','knee_r','ankle_r'
]);
const finite = x => typeof x === 'number' && Number.isFinite(x);
const bounded = (x, min, max) => finite(x) && x>=min && x<=max;
const safeImagePath = p => typeof p === 'string' && p.length<=128 &&
  /^(?:[\w-]+\/)*[\w-]+\.(?:png|webp)$/i.test(p) &&
  !p.split('/').some(s => !s || s==='.' || s==='..');
const assert = (cond,msg) => { if(!cond)throw new Error('NOVA rig: '+msg); };
const own = (o,k) => Object.prototype.hasOwnProperty.call(o,k);
export const defaultStateToMotion = Object.freeze({
  idle:'idle',running:'typing',working:'typing',typing:'typing',
  thinking:'thinking',waiting_research:'thinking',queued:'thinking',
  error:'error',done:'celebrate',handoff:'thinking',waiting_auth:'thinking',
  wave:'wave',walk:'walk',run:'run',jump:'jump',sleep:'sleep',sit:'sit'
});

/** Reject code, unsafe URLs, cycles and invalid bones/animation timings. */
export function validateRig(raw) {
  assert(raw && raw.format===NOVA_RIG_FORMAT && raw.version===1,'unsupported manifest format');
  assert(Array.isArray(raw.canvas) && raw.canvas.length===2 && raw.canvas.every(v=>bounded(v,16,4096)),'canvas must be [width,height]');
  assert(Array.isArray(raw.bones) && raw.bones.length>=REQUIRED_BONES.length && raw.bones.length<=80,'bone count invalid');
  const seen=new Set();
  for(const [i,b] of raw.bones.entries()){
    assert(b && typeof b.id==='string' && /^[a-z][a-z0-9_]{1,36}$/.test(b.id) && !seen.has(b.id),'duplicate or invalid bone id');
    if(i===0)assert(b.id==='root' && b.parent===null,'first bone must be root');
    else assert(typeof b.parent==='string' && seen.has(b.parent),'parent must precede its child');
    assert(bounded(b.x,-4096,4096)&&bounded(b.y,-4096,4096),'bone coordinates invalid');
    assert(b.angle===undefined||bounded(b.angle,-360,360),'bone rest angle invalid');
    seen.add(b.id);
  }
  for(const id of REQUIRED_BONES)assert(seen.has(id),'missing required bone '+id);
  assert(Array.isArray(raw.parts) && raw.parts.length<=100,'parts invalid');
  const parts=new Set();
  for(const p of raw.parts){
    assert(p && typeof p.id==='string' && /^[a-z][\w-]{1,36}$/.test(p.id) && !parts.has(p.id),'part id invalid');
    parts.add(p.id);
    assert(seen.has(p.bone) && safeImagePath(p.file),'part must reference a known bone and local PNG/WebP');
    assert(Array.isArray(p.pivot) && p.pivot.length===2 && p.pivot.every(n=>bounded(n,-4096,4096)),'part pivot invalid');
    assert(p.z===undefined||bounded(p.z,-1000,1000),'part z-order invalid');
  }
  assert(raw.clips && typeof raw.clips==='object' && !Array.isArray(raw.clips) && Object.keys(raw.clips).length<=32,'invalid clips');
  for(const [name,clip] of Object.entries(raw.clips)){
    assert(/^[a-z][a-z0-9_]{1,29}$/.test(name),'invalid clip name');
    assert(clip && bounded(clip.duration,100,60000) &&
       (clip.loop===undefined || typeof clip.loop==='boolean'),'invalid clip timing');
    assert(clip.tracks && typeof clip.tracks==='object' && !Array.isArray(clip.tracks),'invalid clip tracks');
    for(const [bone,keys] of Object.entries(clip.tracks)){
      assert(seen.has(bone),'animation refers to missing bone '+bone);
      assert(Array.isArray(keys) && keys.length>=1 && keys.length<=80,'invalid keyframes');
      let previous=-1;
      for(const k of keys){
        assert(k && bounded(k.t,0,clip.duration) && k.t>previous,'times must increase and fit clip');
        previous=k.t;
        for(const axis of ['angle','x','y'])assert(k[axis]===undefined||bounded(k[axis],-4096,4096),'invalid '+axis+' key');
      }
    }
  }
  return raw;
}

export function ease(t) { const x=Math.max(0,Math.min(1,t)); return x*x*(3-2*x); }
const lerp=(a,b,t)=>a+(b-a)*t;
function angularLerp(a,b,t){const delta=((b-a+540)%360)-180;return a+delta*t;}
function trackSample(keys,time){
  if(time<=keys[0].t)return {angle:keys[0].angle||0,x:keys[0].x||0,y:keys[0].y||0};
  for(let i=1;i<keys.length;i++){
    if(time<=keys[i].t){
      const l=keys[i-1],r=keys[i],f=ease((time-l.t)/(r.t-l.t));
      return {angle:angularLerp(l.angle||0,r.angle||0,f),x:lerp(l.x||0,r.x||0,f),y:lerp(l.y||0,r.y||0,f)};
    }
  }
  const last=keys[keys.length-1];return {angle:last.angle||0,x:last.x||0,y:last.y||0};
}
export function sampleClip(rig,clipName,elapsedMs){
  const clip=rig.clips[clipName]||rig.clips.idle;
  if(!clip)return Object.fromEntries(rig.bones.map(b=>[b.id,{angle:0,x:0,y:0}]));
  const t=clip.loop===false?Math.max(0,Math.min(clip.duration,elapsedMs)):
    ((elapsedMs%clip.duration)+clip.duration)%clip.duration;
  return Object.fromEntries(rig.bones.map(b=>[b.id,clip.tracks[b.id]?
    trackSample(clip.tracks[b.id],t):{angle:0,x:0,y:0}]));
}
export function blendPoses(rig,a,b,weight){
  const w=ease(weight);
  return Object.fromEntries(rig.bones.map(({id})=>{
    const x=a?.[id]||{},y=b?.[id]||{};
    return [id,{angle:angularLerp(x.angle||0,y.angle||0,w),x:lerp(x.x||0,y.x||0,w),y:lerp(x.y||0,y.y||0,w)}];
  }));
}
/** Affine matrices [a,b,c,d,tx,ty], in pixels; each joint inherits its parent's rotation. */
export function worldMatrices(rig,pose){
  const output=Object.create(null);
  for(const bone of rig.bones){
    const p=pose?.[bone.id]||{},theta=((bone.angle||0)+(p.angle||0))*Math.PI/180;
    const cos=Math.cos(theta),sin=Math.sin(theta);
    const local=[cos,sin,-sin,cos,bone.x+(p.x||0),bone.y+(p.y||0)];
    const parent=bone.parent?output[bone.parent]:[1,0,0,1,0,0];
    const [a,b,c,d,tx,ty]=parent,[A,B,C,D,X,Y]=local;
    output[bone.id]=[a*A+c*B,b*A+d*B,a*C+c*D,b*C+d*D,a*X+c*Y+tx,b*X+d*Y+ty];
  }
  return output;
}
/** Draw uploaded artist layers against the shared rig. Image resources are already validated. */
export function paintRig(ctx,rig,pose,images){
  const world=worldMatrices(rig,pose);
  const sorted=[...rig.parts].sort((a,b)=>(a.z||0)-(b.z||0));
  ctx.save();
  for(const p of sorted){
    const img=images[p.file];if(!img)continue;
    const [a,b,c,d,tx,ty]=world[p.bone];
    ctx.setTransform(a,b,c,d,tx,ty);
    ctx.drawImage(img,-p.pivot[0],-p.pivot[1]);
  }
  ctx.restore();
}
/** Keeps previous pose at state change; blends smoothly to the new action. */
export class RigAnimator {
  constructor(rig,{motion='idle',transitionMs=220}={}){
    this.rig=validateRig(rig);
    this.motion=rig.clips[motion]?motion:'idle';
    this.started=0;this.transitionMs=transitionMs;
    this.from=null;this.changedAt=0;
  }
  sample(now){
    const p=sampleClip(this.rig,this.motion,now-this.started);
    if(this.from && now<this.changedAt+this.transitionMs)
      return blendPoses(this.rig,this.from,p,(now-this.changedAt)/this.transitionMs);
    this.from=null;return p;
  }
  play(motion,now){
    const next=this.rig.clips[motion]?motion:'idle';
    if(this.motion===next)return false;
    const previous=this.sample(now);
    this.from=previous;this.changedAt=now;this.motion=next;this.started=now;
    return true;
  }
  setTaskStatus(status,now){return this.play(defaultStateToMotion[status]||'idle',now);}
}
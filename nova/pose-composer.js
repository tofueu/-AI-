// Compose NOVA local bone transforms into world-space 2D affine matrices.
// Bone coordinates use pixels; rotation is degrees. Parent is applied before child.
import {sampleNovaMotion} from './motion-sampler.js';

const identity=()=>[1,0,0,1,0,0];
const multiply=(a,b)=>[
 a[0]*b[0]+a[2]*b[1],a[1]*b[0]+a[3]*b[1],
 a[0]*b[2]+a[2]*b[3],a[1]*b[2]+a[3]*b[3],
 a[0]*b[4]+a[2]*b[5]+a[4],a[1]*b[4]+a[3]*b[5]+a[5]
];
export function composeNovaPose(rig,sample) {
 if(!rig || !Array.isArray(rig.bones) || !sample || !sample.transforms) throw new Error('Invalid pose');
 const names=rig.bones,known=new Set(names);
 if(known.size!==names.length || names.some(n=>typeof n!=='string'||!n.trim())) throw new Error('Invalid bones');
 const parents=rig.parents??{};
 if(!parents || typeof parents!=='object' || Array.isArray(parents)) throw new Error('Invalid parents');
 for(const [bone,parent] of Object.entries(parents)) if(!known.has(bone)||!known.has(parent)||bone===parent) throw new Error('Invalid bone parent');
 // Null-prototype map prevents special bone names from shadowing Object internals.
 const matrices=Object.create(null),visiting=new Set();
 function resolve(bone) {
  if(Object.hasOwn(matrices,bone)) return matrices[bone];
  if(visiting.has(bone)) throw new Error('Cyclic bone hierarchy');
  visiting.add(bone);
  const t=sample.transforms[bone];
  if(!t || ['x','y','rotation','scaleX','scaleY'].some(k=>!Number.isFinite(t[k]))) throw new Error('Invalid bone transform');
  const angle=t.rotation*Math.PI/180,c=Math.cos(angle),s=Math.sin(angle);
  const local=[c*t.scaleX,s*t.scaleX,-s*t.scaleY,c*t.scaleY,t.x,t.y];
  const parent=Object.hasOwn(parents,bone)?resolve(parents[bone]):identity();
  const world=multiply(parent,local);
  visiting.delete(bone);
  matrices[bone]=world;
  return world;
 }
 for(const bone of names) resolve(bone);
 return {name:sample.name,timeMs:sample.timeMs,matrices};
}
export function sampleNovaWorldPose(rig,motionName,timeMs) {
 return composeNovaPose(rig,sampleNovaMotion(rig,motionName,timeMs));
}
export function transformNovaPoint(matrix,x,y) {
 if(!Array.isArray(matrix)||matrix.length!==6||matrix.some(v=>!Number.isFinite(v))||!Number.isFinite(x)||!Number.isFinite(y)) throw new Error('Invalid point transform');
 return {x:matrix[0]*x+matrix[2]*y+matrix[4],y:matrix[1]*x+matrix[3]*y+matrix[5]};
}

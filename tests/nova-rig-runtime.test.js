import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {validateRig,sampleClip,blendPoses,worldMatrices,RigAnimator,paintRig,resolveLayer,defaultStateToMotion} from '../public/nova-rig-runtime.js';
import {indexArtistFiles} from '../public/nova-rig-import.js';
const readRig=style=>JSON.parse(readFileSync(new URL(`../templates/nova-character-mod/${style}/rig.json`,import.meta.url),'utf8'));
for(const style of ['chibi','mature']){
 test(`${style} template validates standard humanoid joints and actions`,()=>{
  const rig=validateRig(readRig(style));
  for(const motion of ['idle','typing','walk','run','wave','sit','sleep','error','jump','celebrate']){
   assert.ok(rig.clips[motion]);assert.ok(sampleClip(rig,motion,100));
  }
  assert.ok(rig.parts.length>=16);
 });
 test(`${style} typing motion changes wrists independently, with no sudden 800ms seam`,()=>{
  const rig=readRig(style),at0=sampleClip(rig,'typing',0),at200=sampleClip(rig,'typing',200),at800=sampleClip(rig,'typing',800);
  assert.notEqual(at0.wrist_l.angle,at200.wrist_l.angle);
  assert.notEqual(at0.wrist_r.angle,at200.wrist_r.angle);
  assert.deepEqual(at0,at800);
 });
 test(`${style} bone rotations affect descendants, not just full-image bouncing`,()=>{
  const rig=readRig(style),pose=sampleClip(rig,'typing',200),world=worldMatrices(rig,pose),rest=worldMatrices(rig,sampleClip(rig,'idle',0));
  assert.notDeepEqual(world.wrist_l,rest.wrist_l);
  assert.notDeepEqual(world.wrist_r,rest.wrist_r);
  assert.deepEqual(world.root,rest.root);
 });
}
test('action blend changes no more than intermediate values during transition',()=>{
 const rig=readRig('chibi'); const anim=new RigAnimator(rig);
 const idle=anim.sample(300);anim.setTaskStatus('running',300);assert.equal(anim.motion,'typing');
 const first=anim.sample(300);assert.deepEqual(first,idle);
 const middle=anim.sample(410);assert.notDeepEqual(middle,first);
 const complete=anim.sample(520);assert.deepEqual(complete,sampleClip(rig,'typing',220));
 assert.equal(defaultStateToMotion.error,'error');
});
test('rejects traversal, cycles, scripts, invalid bones, and invalid keyframe times',()=>{
 const rig=readRig('chibi');
 const bad=[
  r=>{r.parts[0].file='../secret.png'},
  r=>{r.parts[0].file='parts/evil.svg'},
  r=>{r.parts[0].file='https://other.site/head.png'},
  r=>{r.bones[1].parent='wrist_l'},
  r=>{r.bones.splice(1,1)},
  r=>{r.clips.typing.tracks.wrist_l[1].t=-1},
  r=>{r.clips.typing.tracks.wrist_l[1].angle=NaN},
 ];
 for(const mutate of bad){const value=structuredClone(rig);mutate(value);assert.throws(()=>validateRig(value));}
});
test('renderer paints different part transforms using connected hierarchy',()=>{
 const rig=readRig('mature'),ctx={calls:[],save(){},restore(){},setTransform(...args){this.calls.push(args);},drawImage(){}};
 const images=Object.fromEntries(rig.parts.map(p=>[p.file,{width:256,height:256}]));
 paintRig(ctx,rig,sampleClip(rig,'typing',250),images);
 assert.equal(ctx.calls.length,rig.parts.filter(p=>resolveLayer(rig,p)).length);
 assert.notDeepEqual(ctx.calls[0],ctx.calls[1]);
});
test('local folder import indexes only files under manifest root and rejects paths/duplicates',()=>{
 const fake=(p,size=100)=>({webkitRelativePath:p,name:p.split('/').at(-1),size});
 const map=indexArtistFiles([fake('Alice/rig.json'),fake('Alice/parts/head.png'),fake('Other/parts/ignored.png')]);
 assert.equal(map.size,2);assert.ok(map.has('parts/head.png'));
 assert.throws(()=>indexArtistFiles([fake('Alice/parts/head.png')]));
 assert.throws(()=>indexArtistFiles([fake('Alice/rig.json'),fake('Alice/parts/../evil.png')]));
});
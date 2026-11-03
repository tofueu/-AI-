import test from 'node:test';
import assert from 'node:assert/strict';
import {sampleNovaActionFrames,renderNovaActionSheet} from './action-preview.js';
const base={body:{src:'art/body.png'},top:{src:'art/top.png'},bottom:{src:'art/bottom.png'}};
const safeOutfit={top:{src:'art/safe-top.png'},bottom:{src:'art/safe-bottom.png'}};
const rig=variant=>({variant,bones:{root:{x:100,y:100},torso:{y:10},head:{y:-20}}});
for(const variant of ['chibi','adult']){
 test(variant+' preview samples distinct loop poses and renders SVG',()=>{
  const options={variant,base,safeOutfit,rig:rig(variant),actionName:'walk',frameCount:4};
  const result=sampleNovaActionFrames(options);
  assert.equal(result.frames.length,4);
  assert.equal(result.durationMs,800);
  assert.notDeepEqual(result.frames[0].layers,result.frames[1].layers);
  const svg=renderNovaActionSheet(options,{frameWidth:128,frameHeight:128,columns:2});
  assert.match(svg,/width="256" height="256"/);
  assert.equal((svg.match(/<image /g)||[]).length,12);
 });
}
test('rejects invalid frame counts, action and mismatched rig',()=>{
 const options={variant:'chibi',base,safeOutfit,rig:rig('chibi')};
 for(const frameCount of [0,1,61,2.5])assert.throws(()=>sampleNovaActionFrames({...options,frameCount}));
 assert.throws(()=>sampleNovaActionFrames({...options,actionName:'unknown'}));
 assert.throws(()=>sampleNovaActionFrames({...options,rig:rig('adult')}));
});
test('fallback outfit stays visible when MOD hides top',()=>{
 const result=sampleNovaActionFrames({variant:'chibi',base,mods:[{variant:'chibi',layers:{top:{hidden:true}}}],safeOutfit,rig:rig('chibi'),frameCount:2});
 assert.equal(result.frames[0].layers.find(x=>x.slot==='top').src,'art/safe-top.png');
});

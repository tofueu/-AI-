import test from 'node:test';
import assert from 'node:assert/strict';
import {renderNovaPose} from './mod-runtime.js';
const rig={variant:'chibi',bones:{root:{x:0,y:0},hips:{x:0,y:5},torso:{x:0,y:10},neck:{x:0,y:5},head:{x:0,y:5}}};
const action={duration:1000,loop:false,keyframes:[{time:0,bones:{head:{rotation:0}}},{time:1000,bones:{head:{rotation:90}}}]};
const safeOutfit={top:{src:'safe/top.png'},bottom:{src:'safe/bottom.png'}};
const base={body:{src:'body.png'},head:{src:'head.png'},top:{src:'top.png'},bottom:{src:'bottom.png'}};
test('integrates clothing fallback with animated rig',()=>{
 const result=renderNovaPose({variant:'chibi',base,safeOutfit,rig,action,timeMs:500,mods:[{variant:'chibi',layers:{top:{hidden:true},hair_front:{src:'hair.png'}}}]});
 assert.equal(result.layers.find(x=>x.slot==='top').src,'safe/top.png');
 assert.equal(result.layers.find(x=>x.slot==='head').transform.rotation,45);
 assert.equal(result.layers.find(x=>x.slot==='hair_front').bone,'hair_front');
 assert.equal(base.top.src,'top.png');
});
test('rejects mismatched adult rig',()=>assert.throws(()=>renderNovaPose({variant:'adult',base,safeOutfit,rig,action}),/Rig variant mismatch/));
test('hidden layers never bind to skeleton',()=>{
 const result=renderNovaPose({variant:'chibi',base,safeOutfit,rig,action,mods:[{variant:'chibi',layers:{head:{hidden:true}}}]});
 assert.equal(result.layers.some(x=>x.slot==='head'),false);
});

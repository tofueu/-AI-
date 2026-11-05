import test from 'node:test';
import assert from 'node:assert/strict';
import {resolveChibiMod} from './character-parts.js';
const base={id:'artist_base',mode:'whole',parts:{body:'base/body.png',top:'base/top.png',bottom:'base/bottom.png',head:'base/head.png',left_arm:'base/la.png',right_arm:'base/ra.png',left_leg:'base/ll.png',right_leg:'base/rl.png',hat:'base/hat.png'}};
test('preserves artist layers and skeletal coverage',()=>{
 const out=resolveChibiMod({base});
 assert.equal(out.skeletalReady,true);
 assert.equal(out.layers.find(x=>x.part==='head').path,'base/head.png');
});
test('whole-body replacement and part overrides compose without changing base',()=>{
 const whole={id:'whole_swap',mode:'whole',parts:{body:'swap/body.png',top:'swap/top.png',bottom:'swap/bottom.png'}};
 const overrides={id:'hat_swap',mode:'parts',parts:{hat:'user/hat.png'}};
 const out=resolveChibiMod({base,whole,overrides});
 assert.equal(out.layers.find(x=>x.part==='body').path,'swap/body.png');
 assert.equal(out.layers.find(x=>x.part==='hat').path,'user/hat.png');
 assert.equal(base.parts.hat,'base/hat.png');
});
test('empty optional layers hide and missing clothes use base fallback',()=>{
 const out=resolveChibiMod({base,overrides:{id:'empty',mode:'parts',parts:{hat:null,top:null,bottom:null}}});
 assert.equal(out.layers.some(x=>x.part==='hat'),false);
 assert.equal(out.layers.find(x=>x.part==='top').path,'base/top.png');
 assert.equal(out.layers.find(x=>x.part==='bottom').path,'base/bottom.png');
});
test('rejects traversal, unknown parts and non-PNG files',()=>{
 for(const parts of [{hat:'../bad.png'},{hat:'/tmp/bad.png'},{unknown:'x/a.png'},{hat:'x/a.svg'}])
  assert.throws(()=>resolveChibiMod({base,overrides:{id:'unsafe',mode:'parts',parts}}));
});
test('flattened body-only image is not skeleton-ready',()=>{
 const out=resolveChibiMod({base:{id:'flat',mode:'whole',parts:{body:'flat/body.png',top:'flat/top.png',bottom:'flat/bottom.png'}}});
 assert.equal(out.skeletalReady,false);
});

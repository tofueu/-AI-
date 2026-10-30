import test from 'node:test';
import assert from 'node:assert/strict';
import {validateNovaMod,taskState,spriteFrame} from '../public/nova-official-player.js';
const sample={
 format:'nova.character.mod',manifestVersion:2,
 characters:{
  chibi:{root:'characters/chibi/sprites',animations:{idle:{fps:2,frames:['idle.png']},working:{fps:8,frames:['work_00.png','work_01.png']}}},
  mature:{root:'characters/mature/sprites',views:{front:'front_reference.png'}}
 }
};
test('official MOD accepts two separately styled official characters',()=>{
 const m=validateNovaMod(sample);
 assert.equal(spriteFrame(m,'chibi','idle',0),'/assets/nova-official/characters/chibi/sprites/idle.png');
 assert.equal(spriteFrame(m,'chibi','working',200),'/assets/nova-official/characters/chibi/sprites/work_01.png');
 assert.equal(spriteFrame(m,'mature','idle',0),'/assets/nova-official/characters/mature/sprites/front_reference.png');
});
test('MOD is data-only and rejects path traversal or remote sources',()=>{
 for(const p of ['../evil.png','http://evil.com/track.png','a\\evil.png','/etc/passwd.png','assets/foo.svg']){
  const bad=structuredClone(sample);bad.characters.chibi.animations.idle.frames=[p];
  assert.throws(()=>validateNovaMod(bad));
 }
 const bad=structuredClone(sample);bad.characters.chibi.root='../secret';
 assert.throws(()=>validateNovaMod(bad));
});
test('real task priority controls NOVA animation, no fabricated success',()=>{
 assert.deepEqual(taskState([]),{status:'idle',action:'idle',label:'NOVA 陪伴中'});
 assert.equal(taskState([{status:'done'},{status:'running'}]).action,'working');
 assert.equal(taskState([{status:'error'},{status:'running'}]).action,'error');
 assert.equal(taskState([{status:'handoff'}]).action,'waiting_auth');
 assert.throws(()=>taskState({status:'done'}));
});

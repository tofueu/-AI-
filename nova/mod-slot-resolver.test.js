import test from 'node:test';
import assert from 'node:assert/strict';
import {composeNovaMod} from './mod-slot-resolver.js';
const base={body:'base/body.png',top:'base/top.png',bottom:'base/bottom.png',shoes:'base/shoes.png',head:'base/head.png'};
for(const variant of ['chibi','adult']) {
 test(`${variant}: replace, hide, clothing fallback`,()=>{
  const result=composeNovaMod({variant,base,mod:{head:'mods/new-head.png',hat:null,top:null}});
  assert.equal(result.layers.head,'mods/new-head.png');
  assert.equal(result.layers.top,'base/top.png');
  assert.deepEqual(result.clothingFallback,['top']);
  assert.ok(result.hidden.includes('hat'));
 });
 test(`${variant}: missing base clothes rejected`,()=>assert.throws(()=>composeNovaMod({variant,base:{body:'base/body.png'}}),/Missing base clothing/));
 test(`${variant}: path traversal rejected`,()=>assert.throws(()=>composeNovaMod({variant,base,mod:{hat:'../secret.png'}}),/Unsafe/));
 test(`${variant}: unknown slot rejected`,()=>assert.throws(()=>composeNovaMod({variant,base,mod:{unknown:'x.png'}}),/Unknown/));
}

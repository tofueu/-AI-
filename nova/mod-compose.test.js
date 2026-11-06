import test from 'node:test';
import assert from 'node:assert/strict';
import {composeMod} from './mod-compose.js';
const base={layers:{body:'base/body.png',top:'base/top.png',bottom:'base/bottom.png',hair_front:'base/hair.png',hat:'base/hat.png'}};
test('replace hair and clothes without changing body',()=>{const r=composeMod(base,{layers:{hair_front:'mod/hair.png',top:'mod/top.png'}});assert.equal(r.layers.hair_front,'mod/hair.png');assert.equal(r.layers.body,'base/body.png');});
test('null optional layer hides it',()=>{const r=composeMod(base,{layers:{hat:null}});assert.equal('hat' in r.layers,false);});
test('required clothing falls back',()=>{const r=composeMod(base,{layers:{top:null}});assert.equal(r.layers.top,'base/top.png');assert.ok(r.fallbackSlots.includes('top'));});
test('unsafe paths and unknown slots rejected',()=>{assert.throws(()=>composeMod(base,{layers:{top:'../secret.png'}}));assert.throws(()=>composeMod(base,{layers:{unknown:'a.png'}}));});
test('required base clothing cannot be absent',()=>{assert.throws(()=>composeMod({layers:{body:'body.png'}},{layers:{}}));});

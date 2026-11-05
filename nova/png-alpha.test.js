import test from 'node:test';
import assert from 'node:assert/strict';
import {isFullyTransparentRgba} from './png-alpha.js';
for(const filter of [0,1,2,3,4]) test('transparent RGBA filter '+filter,()=>{
  assert.equal(isFullyTransparentRgba(Uint8Array.from([filter,255,0,0,0,0,255,0,0]),2,1),true);
});
test('visible alpha prevents blank classification',()=>assert.equal(isFullyTransparentRgba(Uint8Array.from([0,0,0,0,255]),1,1),false));
test('invalid dimensions are rejected',()=>assert.throws(()=>isFullyTransparentRgba(new Uint8Array(0),0,1)));

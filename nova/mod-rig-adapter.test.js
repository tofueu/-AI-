import test from 'node:test';
import assert from 'node:assert/strict';
import {modLayersToRigMap} from './mod-rig-adapter.js';
for (const variant of ['chibi','adult']) {
 test(`${variant}: resolved layers retain order and offsets`, () => {
   const result=modLayersToRigMap([{slot:'body',src:`${variant}/body.png`},{slot:'hair_front',src:'hair.png',offset:{x:3,y:0,rotation:0}}]);
   assert.deepEqual(Object.keys(result),['body','hair_front']);
   assert.equal(result.hair_front.offset.x,3);
 });
}
test('hidden layers never render',()=>assert.deepEqual(Object.keys(modLayersToRigMap([{slot:'hat',src:'hat.png',hidden:true}])),[]));
test('duplicate slots rejected',()=>assert.throws(()=>modLayersToRigMap([{slot:'head',src:'a'},{slot:'head',src:'b'}]),/duplicate/));
test('prototype key rejected',()=>assert.throws(()=>modLayersToRigMap([{slot:'__proto__',src:'a'}]),/Invalid/));
test('missing image rejected',()=>assert.throws(()=>modLayersToRigMap([{slot:'head'}]),/Missing/));
test('invalid input rejected',()=>assert.throws(()=>modLayersToRigMap({}),/array/));

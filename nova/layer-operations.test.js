import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeLayerOperation,applyLayerOperations} from './layer-operations.js';

test('blank template inherits rather than erases prior art',()=>{
 const prior={hair_front:{src:'first.png'},eyes:{src:'eyes.png'}};
 assert.deepEqual(applyLayerOperations(prior,{hair_front:{hidden:true},eyes:{operation:'inherit'}}),prior);
});
test('explicit hide removes a prior part without mutating input',()=>{
 const prior={hat:{src:'hat.png'},body:{src:'body.png'}};
 const next=applyLayerOperations(prior,{hat:{operation:'hide'}});
 assert.equal(next.hat,undefined);
 assert.equal(prior.hat.src,'hat.png');
 assert.equal(next.body.src,'body.png');
});
test('replacement takes precedence and rejects invalid operations',()=>{
 assert.equal(applyLayerOperations({eyes:{src:'old'}},{eyes:{operation:'replace',src:'new'}}).eyes.src,'new');
 assert.throws(()=>normalizeLayerOperation({operation:'erase'}),/Unknown/);
 assert.throws(()=>normalizeLayerOperation({operation:'replace'}),/needs an image/);
});

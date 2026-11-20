import test from 'node:test';
import assert from 'node:assert/strict';
import {validateNovaModPackage,applyNovaModPackage} from './nova-mod-package.js';
for(const variant of ['chibi','adult']) {
 test(`${variant} supports replaceable layers, hidden accessories, clothing fallback`,()=>{
  const result=applyNovaModPackage({schemaVersion:1,variant,layers:{head:'parts/head.png',hairFront:'hair/front.webp',top:null,bottom:'',hat:false}});
  assert.equal(result.layers.head,'parts/head.png');
  assert.equal(result.layers.hairFront,'hair/front.webp');
  assert.equal(result.layers.hat,null);
  assert.equal(result.layers.top,'builtin:basic-top');
  assert.equal(result.layers.bottom,'builtin:basic-bottom');
  assert.equal(result.layers.underwear,'builtin:basic-underwear');
 });
}
test('rejects unknown layer, remote URL, traversal and unsupported schema',()=>{
 const mk=layers=>({schemaVersion:1,variant:'chibi',layers});
 assert.throws(()=>validateNovaModPackage(mk({wings:'x.png'})),/Unknown NOVA layer/);
 for(const path of ['../secret.png','https://host/a.png','a/../../b.png','a.js','/absolute.png']) assert.throws(()=>validateNovaModPackage(mk({head:path})),/Invalid NOVA asset/);
 assert.throws(()=>validateNovaModPackage({...mk({}),schemaVersion:2}),/Unsupported/);
 assert.throws(()=>validateNovaModPackage({...mk({}),variant:'other'}),/Unknown NOVA variant/);
});

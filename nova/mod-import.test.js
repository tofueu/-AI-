import test from 'node:test';
import assert from 'node:assert/strict';
import {importNovaModManifest} from './mod-import.js';
for(const variant of ['chibi','adult']) {
 test(variant+' imports interchangeable PNG slots without mutating the manifest',()=>{
  const manifest={schemaVersion:1,variant,layers:{head:{src:'heads/custom.png'},hair_front:{src:'hair/front.png'},hat:{operation:'hide'},top:{operation:'inherit'}}};
  const snapshot=JSON.stringify(manifest);
  const result=importNovaModManifest(manifest,{assetRoot:'mods/example'});
  assert.equal(result.layers.head.src,'mods/example/heads/custom.png');
  assert.equal(result.layers.hat.operation,'hide');
  assert.equal(result.layers.top.operation,'inherit');
  assert.equal(JSON.stringify(manifest),snapshot);
 });
}
test('supports universal complete-character replacements',()=>{
 const result=importNovaModManifest({schemaVersion:1,variant:'universal',layers:{body:{src:'character/body.png'},head:{src:'character/head.png'},dress:{src:'clothes/dress.png'}}});
 assert.equal(Object.keys(result.layers).length,3);
});
for(const src of ['../escape.png','/absolute.png','https://bad.example/a.png','C:/bad.png','a\\b.png','a//b.png','a/./b.png','a/../b.png','a.png?token=x','bad.jpg']) {
 test('rejects unsafe or non-PNG path '+src,()=>assert.throws(()=>importNovaModManifest({schemaVersion:1,variant:'chibi',layers:{hair_front:{src}}}),/Invalid MOD PNG path/));
}
test('rejects unknown slots and invalid operation combinations',()=>{
 assert.throws(()=>importNovaModManifest({schemaVersion:1,variant:'adult',layers:{unknown:{src:'a.png'}}}),/Invalid MOD slot/);
 assert.throws(()=>importNovaModManifest({schemaVersion:1,variant:'adult',layers:{hat:{operation:'hide',src:'hat.png'}}}),/Non-replacement/);
});

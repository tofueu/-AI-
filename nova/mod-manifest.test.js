import test from 'node:test';
import assert from 'node:assert/strict';
import {importNovaModManifest} from './mod-manifest.js';
const sample={schemaVersion:1,id:'zixia',variant:'chibi',layers:{hair_front:{operation:'replace',src:'parts/hair.png',width:120,anchorX:0.25},hat:{operation:'hide'},eyes:{operation:'inherit'}}};
for(const variant of ['chibi','adult']) test(`${variant} imports replace/hide/inherit without mutating input`,()=>{
  const input={...sample,variant};
  const result=importNovaModManifest(input);
  assert.equal(result.layers.hair_front.width,120);
  assert.equal(result.layers.hat.operation,'hide');
  assert.equal(input.layers.hair_front.src,'parts/hair.png');
});
test('rejects unsafe artwork paths and invalid dimensions',()=>{
  for(const src of ['../secret.png','https://host/x.png','/root/a.png','data:image/png;base64,AA','x.svg','a.png?token=1','a\\..\\b.png']) {
    assert.throws(()=>importNovaModManifest({...sample,layers:{head:{operation:'replace',src}}}));
  }
  assert.throws(()=>importNovaModManifest({...sample,layers:{head:{operation:'replace',src:'head.png',anchorX:2}}}));
});
test('rejects unknown slots and invalid operation combinations',()=>{
  assert.throws(()=>importNovaModManifest({...sample,layers:{unknown:{operation:'hide'}}}));
  assert.throws(()=>importNovaModManifest({...sample,layers:{hat:{operation:'hide',src:'hat.png'}}}));
});

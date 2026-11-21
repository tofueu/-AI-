import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {importNovaModManifest} from './mod-manifest.js';

const html=await readFile(fileURLToPath(new URL('./mod-studio.html',import.meta.url)),'utf8');

test('MOD Studio is an additive browser UI with a valid module entrypoint',()=>{
 assert.match(html,/<script type="module">/);
 assert.match(html,/from '\.\/mod-manifest\.js'/);
 assert.match(html,/from '\.\/mod-layers\.js'/);
 assert.match(html,/id="variant"/);
 assert.match(html,/id="png"/);
 assert.match(html,/id="save"/);
 assert.match(html,/URL\.revokeObjectURL/);
 assert.doesNotMatch(html,/innerHTML\s*=/);
});

for(const variant of ['chibi','adult']){
 test('Studio manifest contract supports '+variant+' replace, hide and inherit',()=>{
  const data={schemaVersion:1,id:'studio_example',variant,layers:{
   hair_front:{operation:'replace',src:'hair_front.png'},
   hat:{operation:'hide'},eyes:{operation:'inherit'}
  }};
  const result=importNovaModManifest(data);
  assert.equal(result.variant,variant);
  assert.equal(result.layers.hair_front.src,'hair_front.png');
  assert.equal(result.layers.hat.operation,'hide');
  assert.equal(result.layers.eyes.operation,'inherit');
 });
}

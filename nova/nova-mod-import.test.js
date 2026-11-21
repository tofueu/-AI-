import test from 'node:test';
import assert from 'node:assert/strict';
import {importNovaModJson} from './nova-mod-import.js';
for(const variant of ['chibi','adult']) {
 test(`${variant} imports complete layers with hidden accessory and clothing fallback`, () => {
  const json=JSON.stringify({schemaVersion:1,variant,layers:{head:'face/head.png',hairFront:'hair/front.webp',hat:null,top:false}});
  const result=importNovaModJson(json,['face/head.png','hair/front.webp']);
  assert.equal(result.variant,variant);
  assert.equal(result.layers.head,'face/head.png');
  assert.equal(result.layers.hat,null);
  assert.equal(result.layers.top,'builtin:basic-top');
 });
}
test('rejects missing archive entries, invalid JSON, and invalid paths', () => {
 const json=JSON.stringify({schemaVersion:1,variant:'chibi',layers:{head:'parts/head.png'}});
 assert.throws(()=>importNovaModJson(json,[]),/Missing NOVA MOD assets: parts\/head.png/);
 assert.throws(()=>importNovaModJson('{',[]),/Invalid NOVA MOD JSON/);
 assert.throws(()=>importNovaModJson(JSON.stringify({schemaVersion:1,variant:'chibi',layers:{head:'..\/bad.png'}}),[]),/Invalid NOVA asset/);
 assert.throws(()=>importNovaModJson(json,'parts/head.png'),/Expected NOVA asset name list/);
 assert.throws(()=>importNovaModJson(' '.repeat(1024*1024+1),[]),/Invalid NOVA MOD manifest size/);
});

test('enforces UTF-8 byte limit for non-ASCII manifests', () => {
 const json=JSON.stringify({schemaVersion:1,variant:'chibi',layers:{},note:'紫'.repeat(350000)});
 assert.ok(json.length < 1024*1024);
 assert.throws(()=>importNovaModJson(json,[]),/Invalid NOVA MOD manifest size/);
});

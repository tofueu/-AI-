import test from 'node:test';
import assert from 'node:assert/strict';
import {importNovaModPackage} from './mod-package.js';
const base={body:'base/body.png',head:'base/head.png',top:'base/top.png',bottom:'base/bottom.png',shoes:'base/shoes.png'};
for (const variant of ['chibi','adult']) {
  test(`${variant} imports and preserves clothing`,()=>{
    const result=importNovaModPackage(JSON.stringify({schemaVersion:1,variant,layers:{head:'mod/head.png',top:null,hat:null}}),{base,variant});
    assert.equal(result.layers.head,'mod/head.png');
    assert.equal(result.layers.top,'base/top.png');
    assert.deepEqual(result.clothingFallback,['top']);
    assert.ok(result.hidden.includes('hat'));
  });
  test(`${variant} rejects unsafe paths`,()=>assert.throws(()=>importNovaModPackage(JSON.stringify({schemaVersion:1,variant,layers:{hat:'../private.png'}}),{base}),/Unsafe/));
  test(`${variant} rejects mismatched variant`,()=>assert.throws(()=>importNovaModPackage(JSON.stringify({schemaVersion:1,variant,layers:{}}),{base,variant:variant==='chibi'?'adult':'chibi'}),/mismatch/));
}
test('rejects malformed and oversized input',()=>{
  assert.throws(()=>importNovaModPackage('{',{base}),/JSON/);
  assert.throws(()=>importNovaModPackage(' '.repeat(1024*1024+1),{base}),/size/);
});
test('rejects unsupported fields and unknown slots',()=>{
  assert.throws(()=>importNovaModPackage(JSON.stringify({schemaVersion:1,variant:'chibi',layers:{},unexpected:1}),{base}),/field/);
  assert.throws(()=>importNovaModPackage(JSON.stringify({schemaVersion:1,variant:'chibi',layers:{unknown:'x.png'}}),{base}),/slot/);
});

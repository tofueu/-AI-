import test from 'node:test';
import assert from 'node:assert/strict';
import {createNovaModTemplate,validateNovaModTemplate} from './nova-mod-template-spec.js';
for(const variant of ['chibi','adult']){
 test(`${variant} MOD spec has canvas, joint positions and all PNG slots`,()=>{
  const spec=createNovaModTemplate(variant);
  assert.equal(validateNovaModTemplate(spec),true);
  assert.equal(Object.keys(spec.layers).length,12);
  assert.equal(spec.layers.hat.visible,false);
  assert.equal(spec.layers.accessory.visible,false);
  assert.equal(spec.layers.body.required,true);
  assert.equal(spec.layers.head.required,true);
  assert.equal(spec.fallback.top,'builtin:basic-top');
  assert.equal(spec.fallback.bottom,'builtin:basic-bottom');
  assert.equal(spec.fallback.underwear,'builtin:basic-underwear');
 });
}
test('invalid variants and malformed templates rejected',()=>{
 assert.throws(()=>createNovaModTemplate('unknown'));
 const spec=createNovaModTemplate('chibi');
 spec.canvas.width=1;
 assert.equal(validateNovaModTemplate(spec),false);
 assert.equal(validateNovaModTemplate(null),false);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {createNovaBlankTemplate} from './blank-template.js';
import {NOVA_SLOTS} from './character-mod.js';
for (const variant of ['chibi','adult']) {
  test(`${variant} includes each editable empty slot once`,()=>{
    const result=createNovaBlankTemplate(variant);
    assert.deepEqual(result.slots,NOVA_SLOTS);
    for (const slot of NOVA_SLOTS) assert.equal(result.svg.split(`id="layer-${slot}"`).length-1,1);
    assert.ok(result.svg.includes('data-export="exclude"'));
    assert.ok(!result.svg.includes('<image'));
  });
  test(`${variant} exports clean transparent template without guides`,()=>{
    const result=createNovaBlankTemplate(variant,{guides:false});
    assert.ok(!result.svg.includes('id="guides"'));
    assert.ok(result.svg.includes('data-nova-variant'));
  });
}
test('variant and option validation',()=>{
  assert.throws(()=>createNovaBlankTemplate('unknown'));
  assert.throws(()=>createNovaBlankTemplate('chibi',{guides:'yes'}));
});
test('adult and chibi dimensions differ',()=>{
  assert.equal(createNovaBlankTemplate('chibi').height,512);
  assert.equal(createNovaBlankTemplate('adult').height,768);
});
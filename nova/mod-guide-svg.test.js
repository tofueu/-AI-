import test from 'node:test';
import assert from 'node:assert/strict';
import { makeNovaModGuide, makeNovaModGuideSet } from './mod-guide-svg.js';
import { NOVA_SLOTS } from './character-mod.js';

test('both variants provide a guide for every MOD slot', () => {
  for (const variant of ['chibi','adult']) {
    const set = makeNovaModGuideSet(variant);
    assert.equal(Object.keys(set).length, NOVA_SLOTS.length);
    for (const slot of NOVA_SLOTS) {
      assert.match(set[slot+'.svg'], /id="artwork"/);
      assert.match(set[slot+'.svg'], /id="joint-guide"/);
    }
  }
});
test('head and limbs match renderer pivot coordinates', () => {
  assert.match(makeNovaModGuide('chibi','head',100), /cx="50" cy="25" r="5"/);
  assert.match(makeNovaModGuide('adult','armL',100), /cx="35" cy="38" r="5"/);
  assert.match(makeNovaModGuide('adult','legR',100), /cx="57" cy="68" r="5"/);
});
test('required layers marked, optional layers not marked', () => {
  assert.match(makeNovaModGuide('chibi','outfit'), /data-required="true"/);
  assert.match(makeNovaModGuide('chibi','hat'), /data-required="false"/);
});
test('invalid variant, slot and size rejected', () => {
  assert.throws(()=>makeNovaModGuide('unknown','head'), /variant/);
  assert.throws(()=>makeNovaModGuide('chibi','unknown'), /slot/);
  assert.throws(()=>makeNovaModGuide('chibi','head',0), /size/);
});

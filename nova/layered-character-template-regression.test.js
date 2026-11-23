import test from 'node:test';
import assert from 'node:assert/strict';
import { renderLayeredCharacterTemplate, NOVA_MOD_SLOTS } from './layered-character-template.js';

for (const variant of ['chibi', 'adult']) {
  test(`${variant}: blank template hides unused slots and retains clothing`, () => {
    const svg = renderLayeredCharacterTemplate({ variant });
    assert.match(svg, /id="nova-slot-outfit"[^>]*><path /);
    assert.match(svg, /id="nova-slot-hair"[^>]* display="none"/);
    assert.match(svg, /id="nova-slot-accessory"[^>]* display="none"/);
    assert.match(svg, new RegExp(`data-variant="${variant}"`));
  });

  test(`${variant}: replacing clothing preserves other fallback layers`, () => {
    const svg = renderLayeredCharacterTemplate({ variant, layers: { outfit: 'mods/clothes.png', hair: 'mods/hair.png' } });
    assert.match(svg, /href="mods\/clothes.png"/);
    assert.match(svg, /href="mods\/hair.png"/);
    assert.doesNotMatch(svg, /fill="#9b82c7"/);
    assert.match(svg, /id="nova-slot-head"[^>]*><circle /);
  });

  test(`${variant}: complete-character PNG excludes all individual slots`, () => {
    const svg = renderLayeredCharacterTemplate({ variant, fullCharacter: 'mods/character.png' });
    assert.match(svg, /id="nova-full-character"/);
    assert.doesNotMatch(svg, /nova-slot-/);
    assert.throws(() => renderLayeredCharacterTemplate({ variant, fullCharacter: 'mods/character.png', layers: { hat: 'mods/hat.png' } }), /cannot mix/);
  });
}

test('MOD slots are stable and unique', () => {
  assert.equal(new Set(NOVA_MOD_SLOTS).size, NOVA_MOD_SLOTS.length);
  assert.deepEqual([...NOVA_MOD_SLOTS], ['body', 'head', 'eyes', 'mouth', 'hair', 'outfit', 'hat', 'accessory']);
});

test('rejects unsafe paths, invalid slots and malformed input', () => {
  for (const path of ['../evil.png', '/root.png', 'a/<script>.png', 'https://example.com/a.png', 'a.svg', 'a/../b.png']) {
    assert.throws(() => renderLayeredCharacterTemplate({ layers: { hair: path } }), /Invalid MOD PNG path/);
    assert.throws(() => renderLayeredCharacterTemplate({ fullCharacter: path }), /Invalid MOD PNG path/);
  }
  assert.throws(() => renderLayeredCharacterTemplate({ layers: { unknown: 'x.png' } }), /Unknown MOD slot/);
  assert.throws(() => renderLayeredCharacterTemplate({ layers: [] }), /Invalid layers/);
  assert.throws(() => renderLayeredCharacterTemplate({ variant: 'other' }), /Invalid NOVA variant/);
});

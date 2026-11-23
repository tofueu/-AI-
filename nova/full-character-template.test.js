import test from 'node:test';
import assert from 'node:assert/strict';
import {renderLayeredCharacterTemplate} from './layered-character-template.js';
for (const variant of ['chibi','adult']) {
  test(variant+' complete-character PNG replaces modular fallback',()=>{
    const svg=renderLayeredCharacterTemplate({variant,fullCharacter:'mods/character.png'});
    assert.match(svg,/id="nova-full-character"/);
    assert.match(svg,/href="mods\/character.png"/);
    assert.doesNotMatch(svg,/nova-slot-outfit|fill="#f1dbe8"/);
  });
}
test('full character cannot mix with partial layer assets',()=>{
  assert.throws(()=>renderLayeredCharacterTemplate({fullCharacter:'whole.png',layers:{hair:'hair.png'}}),TypeError);
});
test('reject unsafe full-character paths',()=>{
  for(const path of ['../bad.png','/tmp/character.png','https://site/a.png','bad.svg','a.png" onload="alert(1)'])
    assert.throws(()=>renderLayeredCharacterTemplate({fullCharacter:path}),TypeError);
});
test('modular clothing fallback remains present',()=>{
  assert.match(renderLayeredCharacterTemplate({layers:{hair:'hair.png'}}),/id="nova-slot-outfit"[^>]*><path/);
});

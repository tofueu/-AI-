import test from 'node:test';
import assert from 'node:assert/strict';
import {NOVA_MOD_SLOTS,renderLayeredCharacterTemplate} from './layered-character-template.js';
test('Q/adult slots, hidden empty layers, default clothing',()=>{
 for(const variant of ['chibi','adult']){
  const svg=renderLayeredCharacterTemplate({variant});
  for(const slot of NOVA_MOD_SLOTS) assert.match(svg,new RegExp('id="nova-slot-'+slot+'"'));
  assert.match(svg,/id="nova-slot-outfit"[^>]*><path/);
  assert.match(svg,/id="nova-slot-hat"[^>]*display="none"/);
 }
});
test('PNG replacement and fallback clothing',()=>{
 const svg=renderLayeredCharacterTemplate({layers:{hair:'mods/hair.png',eyes:null}});
 assert.match(svg,/href="mods\/hair.png"/);
 assert.match(svg,/id="nova-slot-eyes"[^>]*display="none"/);
 assert.match(svg,/id="nova-slot-outfit"[^>]*><path/);
});
test('reject unsafe paths and unknown slots',()=>{
 for(const path of ['../secret.png','/absolute.png','evil.svg','a.png" onload="x','http://evil/a.png'])
  assert.throws(()=>renderLayeredCharacterTemplate({layers:{hair:path}}),TypeError);
 assert.throws(()=>renderLayeredCharacterTemplate({layers:{wings:'a.png'}}),RangeError);
 assert.throws(()=>renderLayeredCharacterTemplate({variant:'other'}),RangeError);
});

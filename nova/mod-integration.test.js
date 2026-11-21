import test from 'node:test';
import assert from 'node:assert/strict';
import {importNovaModManifest} from './mod-manifest.js';
import {resolveNovaLayers} from './mod-layers.js';

for (const variant of ['chibi', 'adult']) {
  test(variant + ': imported MOD applies hide and replacement without changing base', () => {
    const base = {head:{src:'official/head.png'}, top:{src:'official/top.png'}, bottom:{src:'official/bottom.png'}, hair_front:{src:'official/hair.png'}};
    const safeOutfit = {top:{src:'safe/top.png'},bottom:{src:'safe/bottom.png'}};
    const manifest = importNovaModManifest({schemaVersion:1,id:'custom',variant,layers:{
      head:{operation:'replace',src:'mods/head.png'},
      hair_front:{operation:'hide'},
      top:{operation:'hide'},
      bottom:{operation:'hide'}
    }});
    const resolved = resolveNovaLayers({variant,base,mods:[manifest],safeOutfit});
    const bySlot = Object.fromEntries(resolved.map(part=>[part.slot,part.src]));
    assert.equal(bySlot.head,'mods/head.png');
    assert.equal(bySlot.hair_front,undefined);
    assert.equal(bySlot.top,'safe/top.png');
    assert.equal(bySlot.bottom,'safe/bottom.png');
    assert.equal(base.head.src,'official/head.png');
    assert.equal(base.top.src,'official/top.png');
  });

  test(variant + ': full dress suppresses two-piece fallback', () => {
    const mod=importNovaModManifest({schemaVersion:1,id:'dress_mod',variant,layers:{
      dress:{operation:'replace',src:'dress.png'},top:{operation:'hide'},bottom:{operation:'hide'}
    }});
    const result=resolveNovaLayers({variant,mods:[mod],safeOutfit:{}});
    assert.deepEqual(result.map(part=>part.slot),['dress']);
  });

  test(variant + ': missing safe clothing is a hard error', () => {
    const mod=importNovaModManifest({schemaVersion:1,id:'naked',variant,layers:{top:{operation:'hide'},bottom:{operation:'hide'}}});
    assert.throws(()=>resolveNovaLayers({variant,mods:[mod],safeOutfit:{}}),/Missing safe outfit fallback/);
  });
}

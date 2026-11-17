import test from 'node:test';
import assert from 'node:assert/strict';
import {resolveNovaMod,NOVA_SLOTS} from './character-mod.js';
const base = variant => ({variant,layers:{body:{path:'body.png'},head:{path:'head.png'},outfit:{path:'outfit.png'},hairFront:{path:'hair.png'}}});
for(const variant of ['chibi','adult']) {
 test(`${variant}: optional empty layers are hidden`,()=>{const r=resolveNovaMod(base(variant),{layers:{hairFront:null}});assert.equal(r.layers.hairFront,null);assert.deepEqual(r.fallbacks,[]);});
 test(`${variant}: essential clothing falls back`,()=>{const r=resolveNovaMod(base(variant),{layers:{outfit:{path:'nude.png',visible:false},head:null}});assert.deepEqual(r.fallbacks,['head','outfit']);assert.equal(r.layers.outfit.path,'outfit.png');});
 test(`${variant}: replaces PNG parts`,()=>{const r=resolveNovaMod(base(variant),{variant,layers:{hairFront:{path:'mods/new-hair.png'},hat:{path:'hat.png'}}});assert.equal(r.layers.hairFront.path,'mods/new-hair.png');assert.equal(r.layers.hat.path,'hat.png');assert.equal(Object.keys(r.layers).length,NOVA_SLOTS.length);});
}
test('rejects traversal and absolute paths',()=>{for(const path of ['../secret.png','/root/a.png','a\\b.png','a/./b.png','a.jpg'])assert.throws(()=>resolveNovaMod(base('chibi'),{layers:{hat:{path}}}));});
test('rejects unknown slots, variants and invalid base',()=>{assert.throws(()=>resolveNovaMod(base('chibi'),{layers:{unknown:null}}));assert.throws(()=>resolveNovaMod(base('chibi'),{variant:'adult'}));assert.throws(()=>resolveNovaMod({variant:'chibi',layers:{}}));});
test('no false fallback on untouched outfit',()=>assert.deepEqual(resolveNovaMod(base('adult')).fallbacks,[]));

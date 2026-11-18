import test from 'node:test';
import assert from 'node:assert/strict';
import {renderPortableNovaModSvg} from './portable-mod-svg.js';
const png=()=>{const b=new Uint8Array(24);b.set([137,80,78,71,13,10,26,10]);b.set([73,72,68,82],12);b[19]=2;b[23]=2;return b;};
const base=variant=>({variant,layers:{body:{path:'base/body.png'},head:{path:'base/head.png'},outfit:{path:'base/outfit.png'}}});
const assets=()=>Object.fromEntries(['base/body.png','base/head.png','base/outfit.png','mods/hat.png'].map(p=>[p,png()]));
for(const variant of ['chibi','adult']) test(`${variant} portable SVG embeds all visible PNG layers`,()=>{
 const result=renderPortableNovaModSvg(base(variant),{},assets());
 assert.equal(result.variant,variant);
 assert.equal(result.embeddedPaths.length,3);
 assert.equal((result.svg.match(/data:image\/png;base64,/g)||[]).length,3);
 assert.doesNotMatch(result.svg,/href="base\//);
});
test('MOD accessory override and outfit fallback are applied before embedding',()=>{
 const result=renderPortableNovaModSvg(base('chibi'),{layers:{outfit:null,hat:{path:'mods/hat.png'}}},assets());
 assert.deepEqual(result.fallbacks,['outfit']);
 assert.deepEqual(result.embeddedPaths,['base/body.png','base/head.png','base/outfit.png','mods/hat.png']);
});
test('missing referenced PNG fails rather than emitting broken preview',()=>assert.throws(()=>renderPortableNovaModSvg(base('adult'),{},{}),/Missing/));
test('rejects invalid preview dimensions',()=>assert.throws(()=>renderPortableNovaModSvg(base('adult'),{},assets(),{width:0}),/dimensions/));

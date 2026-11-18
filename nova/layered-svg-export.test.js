import test from 'node:test';
import assert from 'node:assert/strict';
import {composeNovaLayeredSvg} from './layered-svg-export.js';

const base = variant => ({variant,layers:{
  body:{path:'base/body.png'},head:{path:'base/head.png'},outfit:{path:'base/outfit.png'},
  eyes:{path:'base/eyes.png'},hat:null
}});

for (const [variant,height] of [['chibi',512],['adult',768]]) {
  test(`${variant}: editable slot groups and variant dimensions`, () => {
    const result = composeNovaLayeredSvg(base(variant));
    assert.equal(result.height,height);
    assert.equal(result.width,512);
    assert.equal(result.slots.length,9);
    for (const slot of result.slots) assert.equal(result.svg.split(`id="layer-${slot}"`).length-1,1);
    assert.ok(result.svg.includes('base/outfit.png'));
    assert.ok(!result.svg.includes('id="guides"'));
  });
}
test('optional hidden layers and mandatory clothing fallback',()=>{
  const result=composeNovaLayeredSvg(base('chibi'),{layers:{eyes:null,outfit:null}});
  assert.deepEqual(result.fallbacks,['outfit']);
  assert.ok(!result.svg.includes('base/eyes.png'));
  assert.ok(result.svg.includes('base/outfit.png'));
});
test('XML escaping, guides and asset prefix',()=>{
  const result=composeNovaLayeredSvg(base('chibi'),{layers:{hat:{path:'mods/a&b.png'}}},{assetPrefix:'assets/',guides:true});
  assert.ok(result.svg.includes('assets/mods/a&amp;b.png'));
  assert.ok(result.svg.includes('id="guides"'));
});
test('reject invalid prefixes and incompatible variants',()=>{
  assert.throws(()=>composeNovaLayeredSvg(base('chibi'),{}, {assetPrefix:'../'}));
  assert.throws(()=>composeNovaLayeredSvg(base('chibi'),{}, {guides:'yes'}));
  assert.throws(()=>composeNovaLayeredSvg(base('chibi'),{variant:'adult'}));
});

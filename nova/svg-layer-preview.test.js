import test from 'node:test';
import assert from 'node:assert/strict';
import {renderNovaModSvg} from './svg-layer-preview.js';
const base = variant => ({variant,layers:{body:{path:'body.png'},head:{path:'head.png'},outfit:{path:'outfit.png'},eyes:{path:'eyes.png'},hat:{path:'hat.png'}}});
for (const variant of ['chibi','adult']) {
  test(`${variant} preview respects order, hiding and clothing fallback`,()=>{
    const r=renderNovaModSvg(base(variant),{layers:{hat:null,eyes:{path:'mods/new-eyes.png'},outfit:null}});
    assert.deepEqual(r.fallbacks,['outfit']);
    assert.ok(r.svg.indexOf('data-slot="body"')<r.svg.indexOf('data-slot="head"'));
    assert.ok(r.svg.includes('mods/new-eyes.png'));
    assert.ok(r.svg.includes('outfit.png'));
    assert.ok(!r.svg.includes('data-slot="hat"'));
  });
}
test('rejects unsafe paths and preview prefix',()=>{
  assert.throws(()=>renderNovaModSvg(base('chibi'),{layers:{hat:{path:'../bad.png'}}}));
  assert.throws(()=>renderNovaModSvg(base('adult'),{}, {assetPrefix:'https://evil.test/'}));
});
test('dimensions and XML escaping',()=>{
  const b=base('chibi');b.layers.hat={path:'a&b.png'};
  const r=renderNovaModSvg(b,{}, {width:200,height:300,assetPrefix:'assets/'});
  assert.ok(r.svg.includes('href="assets/a&amp;b.png"'));
  assert.ok(r.svg.includes('viewBox="0 0 200 300"'));
  assert.throws(()=>renderNovaModSvg(b,{}, {width:0}));
});

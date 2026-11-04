import test from 'node:test';
import assert from 'node:assert/strict';
import {buildPortableNovaPreview} from './portable-preview.js';
const png = Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]), Buffer.alloc(24)]);
const svg='<svg xmlns="http://www.w3.org/2000/svg"><image href="hair.png" width="10" height="10"/></svg>';
const seq={variant:'chibi',action:'walk',fps:8,frames:[{svg},{svg}]};
test('embeds PNG layers in every frame',()=>{
  const html=buildPortableNovaPreview(seq,{'hair.png':png});
  const encoded=html.match(/const frames=(\[[^;]+\]);/)[1];
  const frames=JSON.parse(encoded);
  assert.equal(frames.length,2);
  assert.match(Buffer.from(frames[0],'base64').toString(),/data:image\/png;base64/);
});
test('rejects missing layer',()=>assert.throws(()=>buildPortableNovaPreview(seq,{}),/Missing MOD layer/));
test('rejects non-PNG layer',()=>assert.throws(()=>buildPortableNovaPreview(seq,{'hair.png':Buffer.from('not png')}),/Invalid PNG/));

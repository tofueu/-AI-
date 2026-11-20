import test from 'node:test';
import assert from 'node:assert/strict';
import {createNovaModDrawingTemplate,exportNovaModArtworkSvg} from './nova-mod-drawing-template.js';
import {replaceNovaModSvgLayer,validateNovaSvgArtwork} from './nova-mod-svg-layer-editor.js';

for(const variant of ['chibi','adult']){
 test(`${variant}: replace face and hair while preserving other MOD layers`,()=>{
  const original=createNovaModDrawingTemplate(variant).svg;
  const face=replaceNovaModSvgLayer(original,'eyes','<circle cx="20" cy="30" r="5" fill="#fff"/>');
  const hair=replaceNovaModSvgLayer(face,'hairFront','<path d="M0 0L10 10" fill="#b48ce8"/>');
  assert.match(hair,/<circle cx="20"/);
  assert.match(hair,/<path d="M0 0L10 10"/);
  assert.ok(hair.includes('id="layer-top"'));
  assert.ok(hair.includes('id="rig-guides"'));
  assert.ok(!exportNovaModArtworkSvg(hair).includes('id="rig-guides"'));
 });
}
test('reject executable SVG and unsafe attributes',()=>{
 for(const fragment of ['<script>alert(1)</script>','<image href="https://example.com/a"/>','<path onload="alert(1)"/>','<path fill="url(#evil)"/>','<g><path/></path>','<path d="M0 0" style="display:none"/>'])
  assert.throws(()=>validateNovaSvgArtwork(fragment));
});
test('reject unknown layers and malformed inputs',()=>{
 const svg=createNovaModDrawingTemplate('chibi').svg;
 assert.throws(()=>replaceNovaModSvgLayer(svg,'unknown',''));
 assert.throws(()=>replaceNovaModSvgLayer('invalid','eyes',''));
 assert.throws(()=>replaceNovaModSvgLayer(svg,'eyes','<rect width="1">'));
});

for(const variant of ['chibi','adult']){
 test(`${variant}: replace nested SVG groups without corrupting sibling layers`,()=>{
  const original=createNovaModDrawingTemplate(variant).svg;
  const nested='<g opacity="0.5"><g transform="translate(2 3)"><circle cx="4" cy="5" r="2"/></g></g>';
  const withNested=replaceNovaModSvgLayer(original,'eyes',nested);
  const replaced=replaceNovaModSvgLayer(withNested,'eyes','<rect x="1" y="2" width="3" height="4"/>');
  assert.ok(replaced.includes('<rect x="1"'));
  assert.ok(!replaced.includes('<circle cx="4"'));
  assert.ok(replaced.includes('id="layer-hairFront"'));
  assert.ok(replaced.includes('id="rig-guides"'));
  assert.equal((replaced.match(/id="layer-eyes"/g)||[]).length,1);
 });
}

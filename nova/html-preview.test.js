import test from 'node:test';
import assert from 'node:assert/strict';
import {buildNovaPreviewHtml} from './html-preview.js';
const svg='<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512"></svg>';
const seq={variant:'chibi',action:'walk',fps:8,frames:[{svg},{svg}]};
test('creates standalone animated preview without external scripts',()=>{const html=buildNovaPreviewHtml(seq);assert.match(html,/NOVA chibi walk/);assert.match(html,/data:image\/svg\+xml;base64/);assert.match(html,/Pause/);assert.ok(html.includes(Buffer.from(svg).toString('base64')));});
test('escapes title and rejects active SVG content',()=>{assert.match(buildNovaPreviewHtml({...seq,action:'<img>'}),/&lt;img&gt;/);for(const bad of ['<svg xmlns="http://www.w3.org/2000/svg"><script/></svg>','<svg xmlns="http://www.w3.org/2000/svg" onload="evil()"></svg>']) assert.throws(()=>buildNovaPreviewHtml({...seq,frames:[{svg:bad}]}),/Unsafe/);});
test('rejects invalid sequences',()=>{for(const bad of [{...seq,fps:0},{...seq,frames:[]},{...seq,variant:'other'}]) assert.throws(()=>buildNovaPreviewHtml(bad),/Invalid/);});

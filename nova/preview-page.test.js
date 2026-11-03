import test from 'node:test';
import assert from 'node:assert/strict';
import {renderNovaPreviewPage} from './preview-page.js';
const svg='<svg xmlns="http://www.w3.org/2000/svg" width="10"><g><animate attributeName="visibility" dur="1s"/></g></svg>';
test('generates standalone offline HTML with inline SVG animation',()=>{const html=renderNovaPreviewPage(svg);assert.match(html,/<!doctype html>/);assert.match(html,/<animate /);assert.match(html,/Content-Security-Policy/);});
test('escapes title markup',()=>{const html=renderNovaPreviewPage(svg,{title:'<hi>&"'});assert.match(html,/&lt;hi&gt;&amp;&quot;/);});
test('rejects unsafe markup and invalid inputs',()=>{for(const s of ['', '<svg/>',svg.replace('</svg>','<script>alert(1)</script></svg>'),svg.replace('<g>','<g onload="x()">')])assert.throws(()=>renderNovaPreviewPage(s));assert.throws(()=>renderNovaPreviewPage(svg,{title:4}));});
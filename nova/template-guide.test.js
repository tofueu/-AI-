import test from 'node:test';
import assert from 'node:assert/strict';
import {createNovaModTemplate} from './mod-template.js';
import {renderNovaTemplateGuide} from './template-guide.js';
for (const variant of ['chibi','adult']) {
  test(variant+' guide lists all slots',()=>{
    const svg=renderNovaTemplateGuide(createNovaModTemplate(variant));
    assert.match(svg,/<svg /);
    assert.match(svg,/01_body.png/);
    assert.match(svg,/17_tail.png/);
    assert.match(svg,new RegExp('NOVA '+variant));
  });
}
test('rejects malformed template',()=>assert.throws(()=>renderNovaTemplateGuide({}),/Unsupported|Invalid/));

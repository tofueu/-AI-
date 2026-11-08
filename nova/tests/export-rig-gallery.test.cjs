'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const {galleryHtml,exportGallery}=require('../tools/export-rig-gallery.cjs');
test('gallery contains all six variant/clip animations without external assets',()=>{
 const html=galleryHtml();
 assert.match(html,/<!doctype html>/);
 assert.equal((html.match(/<figure>/g)||[]).length,6);
 assert.equal((html.match(/data:image\/svg\+xml;charset=utf-8,/g)||[]).length,6);
 for(const v of ['chibi','adult'])for(const c of ['idle','walk','typing'])assert.ok(html.includes(v+' / '+c));
 assert.ok(!/<script\b/i.test(html));
});
test('gallery exports a standalone HTML file',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'nova-gallery-'));
 try{
  const file=path.join(dir,'nested','gallery.html');
  assert.equal(exportGallery(file),file);
  assert.equal(fs.readFileSync(file,'utf8'),galleryHtml());
 }finally{fs.rmSync(dir,{recursive:true,force:true})}
});

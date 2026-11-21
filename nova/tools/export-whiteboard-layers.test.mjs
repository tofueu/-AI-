import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { extractLayers, exportWhiteboard } from './export-whiteboard-layers.mjs';

for (const variant of ['chibi','adult']) {
  test(variant+' whiteboard exports 17 transparent standalone SVGs', async () => {
    const dir = await mkdtemp(path.join(tmpdir(),'nova-layers-'));
    try {
      assert.equal(await exportWhiteboard(variant,dir),17);
      const files = await readdir(dir);
      assert.equal(files.length,17);
      for (const file of files) {
        const svg = await readFile(path.join(dir,file),'utf8');
        assert.match(svg,/^<svg /);
        assert.match(svg,/<\/svg>\s*$/);
        assert.doesNotMatch(svg,/id="guides"/);
        assert.match(svg,new RegExp('id="'+file.replace(/\.svg$/,'')+'"'));
      }
    } finally { await rm(dir,{recursive:true,force:true}); }
  });
}
test('missing slot fails before writing',()=>{
  assert.throws(()=>extractLayers('<svg></svg>'),/Missing or duplicate slot/);
});
test('malformed SVG root rejected',()=>{
  assert.throws(()=>extractLayers('not svg'),/Invalid SVG root/);
});

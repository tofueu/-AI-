import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {blankRgbaPng,exportFirstSheetPack} from './export-first-sheet-pack.js';
import {validateNovaPngPack} from './mod-pack-validator.js';
for(const variant of ['chibi','adult']){
  test(variant+' exports importer-valid blank RGBA PNG pack',async()=>{
    const root=await mkdtemp(join(tmpdir(),'nova-artist-'));
    try{
      const dir=join(root,'pack');
      const result=await exportFirstSheetPack(variant,dir);
      assert.equal(result.verifiedLayers,17);
      assert.equal(result.allHidden,true);
      const manifest=JSON.parse(await readFile(join(dir,'manifest.json'),'utf8'));
      assert.equal(manifest.variant,variant);
      const verified=await validateNovaPngPack(dir);
      assert.equal(verified.layers.length,17);
      await assert.rejects(()=>exportFirstSheetPack(variant,dir),/EEXIST/);
    }finally{await rm(root,{recursive:true,force:true});}
  });
}
test('PNG bytes use RGBA IHDR and reject unsafe dimensions',()=>{
  const png=blankRgbaPng(64,64);
  assert.equal(png.subarray(0,8).toString('hex'),'89504e470d0a1a0a');
  assert.equal(png[25],6);
  assert.throws(()=>blankRgbaPng(5000,64),/Invalid/);
});

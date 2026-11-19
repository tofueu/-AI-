import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,writeFile,mkdir,rm,readdir} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {exportPortableNovaPreviews} from './nova-export-portable-previews.js';
const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/lXcAAAAASUVORK5CYII=','base64');
test('both variants export portable embedded PNG previews',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'nova-portable-'));
 try{
  await mkdir(join(dir,'assets'));
  await writeFile(join(dir,'assets','body.png'),png);
  await writeFile(join(dir,'mod.json'),JSON.stringify({chibi:{body:'assets/body.png'},adult:{head:'assets/body.png'}}));
  const files=await exportPortableNovaPreviews(join(dir,'mod.json'),join(dir,'out'));
  assert.equal(files.length,2);
  for(const file of files){
   const svg=await readFile(file,'utf8');
   assert.match(svg,/href="data:image\/png;base64,/);
   assert.doesNotMatch(svg,/href="assets\/body.png"/);
   assert.match(svg,/data-layer="top"/);
  }
 }finally{await rm(dir,{recursive:true,force:true});}
});
test('missing PNG prevents output creation',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'nova-portable-missing-'));
 try{
  await writeFile(join(dir,'mod.json'),JSON.stringify({chibi:{body:'missing.png'}}));
  await assert.rejects(exportPortableNovaPreviews(join(dir,'mod.json'),join(dir,'out')),{code:'ENOENT'});
  await assert.rejects(readdir(join(dir,'out')),{code:'ENOENT'});
 }finally{await rm(dir,{recursive:true,force:true});}
});
test('rejects non-PNG file content',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'nova-portable-invalid-'));
 try{
  await writeFile(join(dir,'fake.png'),'not a png');
  await writeFile(join(dir,'mod.json'),JSON.stringify({adult:{head:'fake.png'}}));
  await assert.rejects(exportPortableNovaPreviews(join(dir,'mod.json'),join(dir,'out')),/Invalid PNG asset/);
 }finally{await rm(dir,{recursive:true,force:true});}
});

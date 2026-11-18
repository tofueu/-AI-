import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp, mkdir, writeFile, readFile, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {exportPortableNovaSvg} from './export-portable-svg.js';

const png=()=>{const b=Buffer.alloc(24);b.set([137,80,78,71,13,10,26,10,0,0,0,13,73,72,68,82]);b.writeUInt32BE(2,16);b.writeUInt32BE(2,20);return b;};
for (const variant of ['chibi','adult']) test(`exports self-contained ${variant} SVG and retains outfit fallback`,async()=>{
 const dir=await mkdtemp(join(tmpdir(),'nova-svg-'));
 try {
  const assets=join(dir,'assets');await mkdir(join(assets,'base'),{recursive:true});
  for(const slot of ['body','head','outfit']) await writeFile(join(assets,'base',slot+'.png'),png());
  const base={variant,layers:Object.fromEntries(['body','head','outfit'].map(slot=>[slot,{path:'base/'+slot+'.png'}]))};
  const manifest=join(dir,'manifest.json'),output=join(dir,'preview.svg');
  await writeFile(manifest,JSON.stringify({base,mod:{layers:{outfit:null}}}));
  const result=await exportPortableNovaSvg(manifest,assets,output);
  assert.equal(result.variant,variant);
  assert.equal(result.embeddedPaths.length,3);
  const svg=await readFile(output,'utf8');
  assert.equal((svg.match(/data:image\\/png;base64,/g)||[]).length,3);
  assert.doesNotMatch(svg,/href="base\\//);
 } finally {await rm(dir,{recursive:true,force:true});}
});
test('missing PNG rejects export without writing output',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'nova-svg-'));
 try {
  const manifest=join(dir,'manifest.json'),output=join(dir,'preview.svg');
  await writeFile(manifest,JSON.stringify({base:{variant:'chibi',layers:{body:{path:'body.png'},head:{path:'head.png'},outfit:{path:'outfit.png'}}}}));
  await assert.rejects(exportPortableNovaSvg(manifest,dir,output),/ENOENT/);
  await assert.rejects(readFile(output),/ENOENT/);
 } finally {await rm(dir,{recursive:true,force:true});}
});

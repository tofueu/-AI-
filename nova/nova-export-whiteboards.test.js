import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {exportNovaWhiteboards} from './nova-export-whiteboards.js';
test('exports both independent editable whiteboards and manifest',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'nova-whiteboards-'));
 try{
  const files=await exportNovaWhiteboards(dir);
  assert.equal(files.length,3);
  const chibi=await readFile(join(dir,'nova-chibi-whiteboard.svg'),'utf8');
  const adult=await readFile(join(dir,'nova-adult-whiteboard.svg'),'utf8');
  assert.match(chibi,/width="512" height="512"/);
  assert.match(adult,/width="512" height="768"/);
  for(const svg of [chibi,adult]){
   assert.match(svg,/id="layer-hairFront"/);
   assert.match(svg,/id="layer-top"/);
   assert.match(svg,/style="display:none"/);
  }
  const manifest=JSON.parse(await readFile(join(dir,'nova-whiteboard-manifest.json'),'utf8'));
  assert.deepEqual(manifest,{version:1,variants:{chibi:{},adult:{}}});
 }finally{await rm(dir,{recursive:true,force:true});}
});
test('rejects invalid output directory',async()=>assert.rejects(exportNovaWhiteboards(''),TypeError));

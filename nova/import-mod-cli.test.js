import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm,readFile,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {exportNovaBlankPngLayers} from './png-template.js';
import {inspectNovaModPack} from './import-mod-cli.js';

for(const variant of ['chibi','adult']){
 test('inspect PNG MOD without modifying artist files: '+variant,async()=>{
  const dir=await mkdtemp(join(tmpdir(),'nova-inspect-'));
  try{
   await exportNovaBlankPngLayers(dir,variant,{width:64,height:96});
   const manifestPath=join(dir,'manifest.json');
   const original=await readFile(manifestPath);
   const manifest=JSON.parse(original);
   manifest.layers.find(layer=>layer.slot==='hair_front').hidden=false;
   await writeFile(manifestPath,JSON.stringify(manifest));
   const result=await inspectNovaModPack(dir,variant);
   assert.equal(result.variant,variant);
   assert.deepEqual(result.visibleSlots,['hair_front']);
   assert.ok(result.hiddenSlots.includes('top'));
   assert.ok(result.layers.hair_front.src.endsWith('08_hair_front.png'));
   assert.equal((await readFile(manifestPath,'utf8')),JSON.stringify(manifest));
   await assert.rejects(()=>inspectNovaModPack(dir,variant==='chibi'?'adult':'chibi'),/Incompatible PNG MOD variant/);
  }finally{await rm(dir,{recursive:true,force:true});}
 });
}
test('rejects missing directory and unsupported variant',async()=>{
 await assert.rejects(()=>inspectNovaModPack(''),/MOD directory is required/);
 await assert.rejects(()=>inspectNovaModPack('/unused','unknown'),/Invalid expected NOVA variant/);
});

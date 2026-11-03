import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {exportNovaBlankPngLayers} from './png-template.js';
import {composeNovaPngPacks} from './compose-mod-cli.js';

async function setVisible(dir,slot) {
  const path=join(dir,'manifest.json');
  const manifest=JSON.parse(await readFile(path,'utf8'));
  manifest.layers.find(x=>x.slot===slot).hidden=false;
  await writeFile(path,JSON.stringify(manifest));
}

for(const variant of ['chibi','adult']) {
  test('composes ordered MOD packs with safe clothing fallback: '+variant,async()=>{
    const first=await mkdtemp(join(tmpdir(),'nova-compose-a-'));
    const second=await mkdtemp(join(tmpdir(),'nova-compose-b-'));
    try {
      await exportNovaBlankPngLayers(first,variant,{width:64,height:96});
      await exportNovaBlankPngLayers(second,variant,{width:64,height:96});
      await setVisible(first,'hair_front');
      await setVisible(second,'eyes');
      const result=await composeNovaPngPacks(variant,[first,second],{
        safeOutfit:{top:{src:'builtin-top'},bottom:{src:'builtin-bottom'}}
      });
      assert.equal(result.variant,variant);
      assert.ok(!result.layers.some(x=>x.slot==='hair_front')); // later pack hides this slot
      assert.ok(result.layers.some(x=>x.slot==='eyes'&&x.src.startsWith(second)));
      assert.ok(result.layers.some(x=>x.slot==='top'&&x.src==='builtin-top'));
      assert.ok(result.layers.some(x=>x.slot==='bottom'&&x.src==='builtin-bottom'));
      assert.ok(!result.layers.some(x=>x.slot==='body'));
    } finally {
      await rm(first,{recursive:true,force:true});
      await rm(second,{recursive:true,force:true});
    }
  });
}
test('refuses missing packs and missing safe outfit',async()=>{
  await assert.rejects(()=>composeNovaPngPacks('chibi',[]),/At least one MOD directory/);
  await assert.rejects(()=>composeNovaPngPacks('invalid',['x']),/Variant must/);
});
test('rejects mixed variants',async()=>{
  const dir=await mkdtemp(join(tmpdir(),'nova-compose-'));
  try {
    await exportNovaBlankPngLayers(dir,'adult',{width:64,height:96});
    await assert.rejects(()=>composeNovaPngPacks('chibi',[dir]),/Incompatible PNG MOD variant/);
  } finally {await rm(dir,{recursive:true,force:true});}
});

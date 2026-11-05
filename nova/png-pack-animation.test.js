import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {exportNovaBlankPngLayers} from './png-template.js';
import {buildNovaPngPackAnimation} from './png-pack-animation.js';

test('artist hair MOD inherits base body and plays existing Q rig animation',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'nova-png-action-'));
 try{
  await exportNovaBlankPngLayers(dir,'chibi',{width:64,height:64});
  const file=join(dir,'manifest.json');
  const manifest=JSON.parse(await readFile(file,'utf8'));
  manifest.layers.find(layer=>layer.slot==='hair_front').hidden=false;
  await writeFile(file,JSON.stringify(manifest));
  const frames=await buildNovaPngPackAnimation({
   variant:'chibi',action:'idle',directories:[dir],fps:2,
   base:{body:{src:'original-body.png'}},
   safeOutfit:{top:{src:'safe-top.png'},bottom:{src:'safe-bottom.png'}}
  });
  assert.ok(frames.frames.length>1);
  const svg=frames.frames[0].svg;
  assert.match(svg,/original-body\.png/);
  assert.match(svg,/08_hair_front\.png/);
  assert.match(svg,/safe-top\.png/);
  assert.match(svg,/safe-bottom\.png/);
 }finally{await rm(dir,{recursive:true,force:true});}
});

test('incompatible pack is rejected before animation',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'nova-png-action-'));
 try{
  await exportNovaBlankPngLayers(dir,'adult',{width:64,height:64});
  await assert.rejects(()=>buildNovaPngPackAnimation({
   variant:'chibi',action:'idle',directories:[dir],
   safeOutfit:{top:{src:'safe-top.png'},bottom:{src:'safe-bottom.png'}}
  }),/Incompatible PNG MOD variant/);
 }finally{await rm(dir,{recursive:true,force:true});}
});

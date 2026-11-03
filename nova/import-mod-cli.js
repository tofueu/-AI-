#!/usr/bin/env node
// Validate and inspect an artist's NOVA PNG MOD before loading it in the desktop pet.
// Usage: node nova/import-mod-cli.js <pack-directory> [chibi|adult]
// This command never edits the artist's original files.
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
import {loadNovaPngMod} from './mod-pack-import.js';

export async function inspectNovaModPack(directory, expectedVariant) {
  if(typeof directory!=='string'||!directory.trim()) throw new Error('MOD directory is required');
  if(expectedVariant!==undefined && !['chibi','adult'].includes(expectedVariant)) throw new Error('Invalid expected NOVA variant');
  const mod=await loadNovaPngMod(directory);
  if(expectedVariant && mod.variant!==expectedVariant) throw new Error('Incompatible PNG MOD variant');
  return {
    variant:mod.variant,
    visibleSlots:Object.entries(mod.layers).filter(([,part])=>!part.hidden).map(([slot])=>slot),
    hiddenSlots:Object.entries(mod.layers).filter(([,part])=>part.hidden).map(([slot])=>slot),
    layers:mod.layers
  };
}

if(process.argv[1] && import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
  const [, , directory, expectedVariant, ...extra]=process.argv;
  if(!directory || extra.length){
    console.error('Usage: node nova/import-mod-cli.js <pack-directory> [chibi|adult]');
    process.exitCode=2;
  }else{
    try{console.log(JSON.stringify(await inspectNovaModPack(directory,expectedVariant),null,2));}
    catch(error){console.error('NOVA MOD import failed: '+error.message);process.exitCode=1;}
  }
}

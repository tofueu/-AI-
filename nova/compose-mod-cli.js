#!/usr/bin/env node
// Compose validated NOVA PNG MOD packs in order without changing artist assets.
// Usage: node nova/compose-mod-cli.js <chibi|adult> <pack-dir> [pack-dir...]
// The caller supplies a safe outfit from its trusted built-in assets; this CLI
// deliberately reports missing fallback rather than inventing clothing images.
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
import {loadNovaPngMod} from './mod-pack-import.js';
import {resolveNovaLayers} from './mod-layers.js';

export async function composeNovaPngPacks(variant,directories,{base={},safeOutfit={}}={}) {
  if(!['chibi','adult'].includes(variant)) throw new Error('Variant must be chibi or adult');
  if(!Array.isArray(directories)||directories.length===0||directories.some(x=>typeof x!=='string'||!x.trim())) throw new Error('At least one MOD directory is required');
  const mods=[];
  for(const directory of directories) {
    const mod=await loadNovaPngMod(directory);
    if(mod.variant!==variant) throw new Error('Incompatible PNG MOD variant: '+directory);
    mods.push(mod);
  }
  return {variant,layers:resolveNovaLayers({variant,base,mods,safeOutfit})};
}

if(process.argv[1] && import.meta.url===pathToFileURL(resolve(process.argv[1])).href) {
  const [,,variant,...directories]=process.argv;
  try {
    const result=await composeNovaPngPacks(variant,directories);
    console.log(JSON.stringify(result,null,2));
  } catch(error) {
    console.error('NOVA MOD composition failed: '+error.message);
    process.exitCode=1;
  }
}

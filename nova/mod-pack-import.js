// Bridge a validated artist PNG pack into the existing NOVA layer resolver.
// Never trust manifest paths directly: only consume paths returned by validateNovaPngPack.
import {validateNovaPngPack} from './mod-pack-validator.js';
import {resolveNovaLayers} from './mod-layers.js';

export async function loadNovaPngMod(directory) {
  const pack=await validateNovaPngPack(directory);
  return {
    variant:pack.variant,
    layers:Object.fromEntries(pack.layers.map(layer=>[
      layer.slot,
      layer.hidden ? {hidden:true} : {src:layer.path}
    ]))
  };
}

export async function resolveNovaPngMod({variant,base={},directories=[],safeOutfit={}}) {
  if(!Array.isArray(directories)) throw new Error('MOD directories must be an array');
  const mods=[];
  for(const directory of directories) {
    const mod=await loadNovaPngMod(directory);
    if(mod.variant!==variant) throw new Error('Incompatible PNG MOD variant');
    mods.push(mod);
  }
  return resolveNovaLayers({variant,base,mods,safeOutfit});
}

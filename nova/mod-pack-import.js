// Bridge a validated artist PNG pack into the existing NOVA layer resolver.
// A hidden template layer means "no artwork supplied": inherit any earlier layer.
// Deliberate removal remains available to programmatic MODs via {hidden:true}.
// Never trust manifest paths directly: only consume paths returned by validateNovaPngPack.
import {validateNovaPngPack} from './mod-pack-validator.js';
import {resolveNovaLayers} from './mod-layers.js';

export async function loadNovaPngMod(directory) {
  const pack=await validateNovaPngPack(directory);
  return {
    variant:pack.variant,
    layers:Object.fromEntries(pack.layers
      .filter(layer=>!layer.hidden)
      .map(layer=>[layer.slot,{src:layer.path}]))
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

// Artist PNG pack -> existing non-destructive NOVA MOD animation pipeline.
// Original base assets are never rewritten. Missing template layers inherit them.
import {loadNovaPngMod} from './mod-pack-import.js';
import {buildNovaModAnimation} from './mod-animation-pipeline.js';

export async function buildNovaPngPackAnimation({
  variant, action, base={}, directories=[], safeOutfit={},
  fps=12, maxFrames=240, svgOptions={}
}) {
  if (!Array.isArray(directories)) throw new TypeError('MOD directories must be an array');
  // Validate every pack (including PNG bytes) before any frame is produced.
  const mods=[];
  for (const directory of directories) {
    const mod=await loadNovaPngMod(directory);
    if (mod.variant!==variant) throw new Error('Incompatible PNG MOD variant');
    mods.push(mod);
  }
  return buildNovaModAnimation({
    variant,action,base,mods,safeOutfit,fps,maxFrames,svgOptions
  });
}

// Preload the exact visible MOD frame before starting NOVA's animation loop.
// Dependency injection keeps the browser adapter testable without a DOM.
import {createNovaModFrame} from './mod-frame.js';
import {createNovaPlayback} from './playback.js';
import {loadNovaBrowserImages} from './browser-assets.js';

export async function createNovaBrowserStage(options={}) {
  const {
    ctx,rig,base={},mods=[],safeOutfit={},motionName,slotBones,
    assetBase='',ImageClass=globalThis.Image,crossOrigin=null,
    requestFrame=globalThis.requestAnimationFrame?.bind(globalThis),
    cancelFrame=globalThis.cancelAnimationFrame?.bind(globalThis),onError,
    compose=createNovaModFrame,loadImages=loadNovaBrowserImages,
    makePlayback=createNovaPlayback
  }=options;
  if(!ctx || !rig || !motionName) throw new Error('Missing NOVA browser stage configuration');
  if(typeof requestFrame!=='function'||typeof cancelFrame!=='function') throw new Error('Missing NOVA animation scheduler');
  const initial=compose({rig,base,mods,safeOutfit,motionName,timeMs:0,slotBones});
  const images=await loadImages(initial,{assetBase,ImageClass,crossOrigin});
  // All frame commands for a motion use the same resolved visible slots.
  // The caller must create a new stage after changing MODs or costume assets.
  const playback=makePlayback({ctx,images,rig,base,mods,safeOutfit,motionName,slotBones,requestFrame,cancelFrame,onError});
  return Object.freeze({images,playback,start:()=>playback.start(),stop:()=>playback.stop(),render:timeMs=>playback.render(timeMs)});
}

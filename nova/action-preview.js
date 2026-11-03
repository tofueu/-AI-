// Sample a complete NOVA action into frames suitable for SVG previews.
// Keeps rendering independent of Electron and does not mutate MOD inputs.
import {createNovaAction} from './animation-presets.js';
import {renderNovaPose} from './mod-runtime.js';
import {renderNovaSpriteSheet} from './sprite-sheet.js';
import {renderNovaAnimatedSvg} from './animated-svg.js';

export function sampleNovaActionFrames({variant,base,mods=[],safeOutfit,rig,actionName='idle',frameCount=8}) {
 if(!['chibi','adult'].includes(variant))throw new Error('Invalid NOVA variant');
 if(!Number.isInteger(frameCount)||frameCount<2||frameCount>60)throw new Error('Invalid frame count');
 const action=createNovaAction(variant,actionName);
 const frames=Array.from({length:frameCount},(_,i)=>
   renderNovaPose({variant,base,mods,safeOutfit,rig,action,timeMs:i*action.duration/frameCount}));
 return {variant,actionName,durationMs:action.duration,frames};
}
export function renderNovaActionSheet(options,sheetOptions={}) {
 const result=sampleNovaActionFrames(options);
 return renderNovaSpriteSheet(result.frames,sheetOptions);
}

export function renderNovaActionAnimation(options,svgOptions={}) {
 const result=sampleNovaActionFrames(options);
 return renderNovaAnimatedSvg(result.frames,{...svgOptions,durationMs:result.durationMs});
}

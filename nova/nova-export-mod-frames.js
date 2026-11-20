import {renderNovaAnimatedModSvg} from './nova-animated-mod-preview.js';

// Export self-contained static SVG frames for inspection or downstream PNG/GIF conversion.
// This does not rasterize frames or claim to produce a GIF.
export function exportNovaModFrames(variant,motion,mod={},base={},options={}){
 const rendered=renderNovaAnimatedModSvg(variant,motion,mod,base,options);
 const {width,height}=rendered.canvas;
 const source=rendered.svg;
 const starts=[...source.matchAll(/<g data-frame="(\d+)"[^>]*>/g)];
 if(starts.length!==rendered.frames)throw new Error('Animation frame count mismatch');
 const frames=starts.map((match,index)=>{
  const begin=match.index+match[0].length;
  const end=index+1<starts.length?starts[index+1].index:source.lastIndexOf('</svg>');
  const segment=source.slice(begin,end).trim();
  if(!segment.endsWith('</g>'))throw new Error('Malformed frame wrapper');
  const layers=segment.slice(0,-4).trim();
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" data-variant="${variant}" data-motion="${motion}" data-frame="${index}">\n${layers}\n</svg>`;
  return {index,filename:`${variant}-${motion}-${String(index).padStart(3,'0')}.svg`,svg};
 });
 return {variant,motion,canvas:rendered.canvas,durationMs:rendered.durationMs,frames,frameDurationMs:rendered.durationMs/rendered.frames};
}

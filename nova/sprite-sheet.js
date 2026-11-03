// Build an inspectable SVG contact sheet from sampled NOVA poses.
import {renderNovaSvg} from './svg-renderer.js';
export function renderNovaSpriteSheet(poses,{frameWidth=320,frameHeight=320,columns=4}={}) {
 if(!Array.isArray(poses)||poses.length<1||poses.length>120)throw new Error('Invalid frame count');
 for(const [n,v] of Object.entries({frameWidth,frameHeight,columns}))if(!Number.isInteger(v)||v<1||v>4096)throw new Error('Invalid '+n);
 const rows=Math.ceil(poses.length/columns);
 if(frameWidth*columns>16384||frameHeight*rows>16384)throw new Error('Sprite sheet too large');
 const frames=poses.map((pose,i)=>{
  const svg=renderNovaSvg(pose,{width:frameWidth,height:frameHeight});
  const inner=svg.slice(svg.indexOf('>')+1,svg.lastIndexOf('</svg>'));
  const x=(i%columns)*frameWidth,y=Math.floor(i/columns)*frameHeight;
  return `<svg x="${x}" y="${y}" width="${frameWidth}" height="${frameHeight}" viewBox="0 0 ${frameWidth} ${frameHeight}">${inner}</svg>`;
 });
 return `<svg xmlns="http://www.w3.org/2000/svg" width="${columns*frameWidth}" height="${rows*frameHeight}" viewBox="0 0 ${columns*frameWidth} ${rows*frameHeight}">${frames.join('')}</svg>`;
}

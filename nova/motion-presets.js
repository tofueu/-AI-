import {sampleNovaClip} from './clip-player.js';

// Joint coordinates are design units; visual art remains a separate deliverable.
const variants = {
  chibi: {headY:-28,armY:-9,legY:13,stride:18,sway:7},
  adult: {headY:-49,armY:-22,legY:27,stride:12,sway:4},
};
export function createNovaMotionRig(variant) {
  const p=variants[variant];
  if (!p) throw new Error('Unknown NOVA variant');
  return [
    {id:'root',x:0,y:0,rotation:0},
    {id:'head',parent:'root',x:0,y:p.headY,rotation:0},
    {id:'armLeft',parent:'root',x:-13,y:p.armY,rotation:0},
    {id:'armRight',parent:'root',x:13,y:p.armY,rotation:0},
    {id:'legLeft',parent:'root',x:-8,y:p.legY,rotation:0},
    {id:'legRight',parent:'root',x:8,y:p.legY,rotation:0},
  ];
}
function frame(durationMs,pose) {return {durationMs,pose};}
export function createNovaMotionClips(variant) {
  const p=variants[variant];
  if (!p) throw new Error('Unknown NOVA variant');
  return {
    idle:[
      frame(300,{root:{y:0},head:{rotation:-2}}),
      frame(300,{root:{y:-2},head:{rotation:2}}),
      frame(300,{root:{y:0},head:{rotation:-2}}),
    ],
    walk:[
      frame(150,{root:{y:0,rotation:-p.sway/4},legLeft:{rotation:p.stride},legRight:{rotation:-p.stride},armLeft:{rotation:-p.stride},armRight:{rotation:p.stride}}),
      frame(150,{root:{y:-2,rotation:0},legLeft:{rotation:0},legRight:{rotation:0},armLeft:{rotation:0},armRight:{rotation:0}}),
      frame(150,{root:{y:0,rotation:p.sway/4},legLeft:{rotation:-p.stride},legRight:{rotation:p.stride},armLeft:{rotation:p.stride},armRight:{rotation:-p.stride}}),
      frame(150,{root:{y:-2,rotation:0},legLeft:{rotation:0},legRight:{rotation:0},armLeft:{rotation:0},armRight:{rotation:0}}),
    ],
    type:[
      frame(120,{head:{rotation:4},armLeft:{rotation:38},armRight:{rotation:-38}}),
      frame(120,{head:{rotation:2},armLeft:{rotation:32},armRight:{rotation:-45}}),
      frame(120,{head:{rotation:4},armLeft:{rotation:45},armRight:{rotation:-32}}),
      frame(120,{head:{rotation:2},armLeft:{rotation:38},armRight:{rotation:-38}}),
    ],
  };
}
export function sampleNovaMotion(variant,action,elapsedMs,options) {
  const rig=createNovaMotionRig(variant);
  const clip=createNovaMotionClips(variant)[action];
  if (!clip) throw new Error('Unknown NOVA action');
  return sampleNovaClip(rig,clip,elapsedMs,options);
}

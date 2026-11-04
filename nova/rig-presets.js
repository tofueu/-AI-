// Procedural, renderer-independent motion presets for both NOVA body variants.
import {RIG_JOINTS, RIG_VARIANTS, validateClip} from './rig-animation.js';
export const NOVA_ACTIONS = Object.freeze(['idle','walk','type','cry']);
const ZERO = Object.freeze({x:0,y:0,rotation:0});
const pose = (changes={}) => Object.fromEntries(RIG_JOINTS.map(j => [j, {...ZERO,...(changes[j] || {})}]));
const sides = (left,right) => ({shoulder_l:{rotation:left},elbow_l:{rotation:left/2},wrist_l:{rotation:left/2},shoulder_r:{rotation:right},elbow_r:{rotation:right/2},wrist_r:{rotation:right/2}});
/** Return a fresh clip; callers can edit their copy without affecting presets. */
export function createNovaClip(variant, action) {
  if (!RIG_VARIANTS.includes(variant)) throw new Error('Invalid NOVA variant');
  if (!NOVA_ACTIONS.includes(action)) throw new Error('Invalid NOVA action');
  const scale = variant === 'chibi' ? 0.72 : 1;
  const frame = (time, changes) => ({time,pose:pose(changes)});
  let frames;
  if (action === 'idle') frames = [frame(0,{}),frame(.5,{torso:{y:-2*scale},head:{rotation:2}}),frame(1,{})];
  if (action === 'walk') frames = [frame(0,{...sides(14,-14),hip_l:{rotation:-16},hip_r:{rotation:16}}),frame(.25,{root:{y:-3*scale}}),frame(.5,{...sides(-14,14),hip_l:{rotation:16},hip_r:{rotation:-16}}),frame(.75,{root:{y:-3*scale}}),frame(1,{...sides(14,-14),hip_l:{rotation:-16},hip_r:{rotation:16}})];
  if (action === 'type') frames = [frame(0,{...sides(-28,28)}),frame(.15,{...sides(-24,32),wrist_l:{y:2*scale,rotation:12}}),frame(.3,{...sides(-32,24),wrist_r:{y:2*scale,rotation:-12}}),frame(.45,{...sides(-28,28)})];
  if (action === 'cry') frames = [frame(0,{head:{rotation:-5},...sides(-25,25)}),frame(.35,{head:{rotation:5,y:2*scale},...sides(-35,35)}),frame(.7,{head:{rotation:-5},...sides(-25,25)})];
  return validateClip({variant,action,frames});
}

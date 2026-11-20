import {renderNovaModSvg} from './svg-layer-preview.js';
import {sampleNovaClip} from './animation-timeline.js';

// Maps existing interchangeable MOD layers to the nearest animation bone.
const SLOT_BONE = Object.freeze({body:'torso',head:'head',eyes:'head',mouth:'head',hairBack:'head',hairFront:'head',hat:'head',armL:'arm_l',armR:'arm_r',legL:'thigh_l',legR:'thigh_r'});
const ESC = s => String(s).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;');
const num = n => Number(n.toFixed(4));
/** Render a single keyframe of a character with its MOD artwork intact.
 * Pivots are per-slot template pixel coordinates (not absolute screen positions).
 * This is a pose preview, not a finished sprite animation or a GIF encoder.
 */
export function renderNovaPoseSvg(base, mod, clip, timeMs, options={}) {
  if (!clip || clip.variant !== base?.variant) throw new Error('Clip/character variant mismatch');
  const {variant,svg,fallbacks} = renderNovaModSvg(base,mod,options);
  const sampled = sampleNovaClip(clip,timeMs);
  const pivots = options.pivots ?? {};
  if (!pivots || typeof pivots !== 'object' || Array.isArray(pivots)) throw new Error('Invalid pivots');
  for (const [slot,pivot] of Object.entries(pivots)) {
    if (!Object.hasOwn(SLOT_BONE,slot) || !Array.isArray(pivot) || pivot.length!==2 || !pivot.every(n=>typeof n==='number' && Number.isFinite(n) && n>=0 && n<=4096)) throw new Error('Invalid pivot: '+slot);
  }
  const output=svg.replace(/<image data-slot="([^"]+)"[^>]*\/>/g,(image,slot)=>{
    const bone=SLOT_BONE[slot];
    if (!bone) return image;
    const pose=sampled.pose[bone];
    if (!pose) return image;
    const [px,py]=pivots[slot]??[0,0];
    const {x=0,y=0,rotation=0,scale=1}=pose;
    const transform=`translate(${num(x)} ${num(y)}) translate(${num(px)} ${num(py)}) rotate(${num(rotation)}) scale(${num(scale)}) translate(${num(-px)} ${num(-py)})`;
    return `<g data-bone="${ESC(bone)}" transform="${ESC(transform)}">${image}</g>`;
  });
  return {variant,fallbacks,timeMs:sampled.timeMs,svg:output};
}

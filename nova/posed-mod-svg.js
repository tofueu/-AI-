import { resolveNovaMod } from './character-mod.js';
import { sampleNovaTimeline } from './skeletal-timeline.js';

// Character artwork is still supplied by the MOD. This renderer binds existing
// full-canvas PNG layers to the head/root joints without modifying the assets.
const ORDER = ['legL','legR','armL','body','armR','hairBack','head','eyes','mouth','outfit','hairFront','hat','accessory'];
const LIMBS = new Set(['armL','armR','legL','legR']);
const HEAD = new Set(['hairBack','head','eyes','mouth','hairFront','hat']);
const escapeXml = value => value.replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/'/g,'&apos;');

export function renderNovaPosedModSvg(base, mod = {}, clip, elapsedMs = 0, options = {}) {
  const {variant,layers,fallbacks} = resolveNovaMod(base,mod);
  const width = options.width ?? 512, height = options.height ?? 512;
  if (![width,height].every(n => Number.isSafeInteger(n) && n >= 1 && n <= 4096))
    throw Error('Invalid preview dimensions');
  const prefix = options.assetPrefix ?? '';
  if (typeof prefix !== 'string' || (prefix && !/^(?:[a-zA-Z0-9_-]+\/)*$/.test(prefix)))
    throw Error('Invalid asset prefix');
  const {pose} = sampleNovaTimeline(clip, elapsedMs);
  const image = slot => {
    const layer = layers[slot];
    if (!layer?.visible) return '';
    const joint = HEAD.has(slot) ? 'head' : LIMBS.has(slot) ? slot : 'root';
    const p = pose[joint] || {};
    const x = (p.x ?? 0) * width, y = (p.y ?? 0) * height;
    const angle = p.rotation ?? 0;
    const pivots = {head:[.5,.25],root:[.5,.53],armL:[.35,.38],armR:[.65,.38],legL:[.43,.68],legR:[.57,.68]};
    const [px,py] = pivots[joint];
    const cx = width * px, cy = height * py;
    const transform = `translate(${x} ${y}) rotate(${angle} ${cx} ${cy})`;
    return `<g data-joint="${joint}" transform="${transform}"><image data-slot="${slot}" href="${escapeXml(prefix+layer.path)}" x="0" y="0" width="${width}" height="${height}" preserveAspectRatio="xMidYMid meet"/></g>`;
  };
  return {variant,fallbacks,svg:`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${ORDER.map(image).join('')}</svg>`};
}

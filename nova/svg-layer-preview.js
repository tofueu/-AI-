import {resolveNovaMod} from './character-mod.js';
const ORDER = ['body','hairBack','head','eyes','mouth','outfit','hairFront','hat','accessory'];
const xml = s => s.replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/'/g,'&apos;');
export function renderNovaModSvg(base, mod = {}, options = {}) {
  const {variant,layers,fallbacks} = resolveNovaMod(base,mod);
  const width = options.width ?? 512, height = options.height ?? 512;
  if (![width,height].every(n => Number.isSafeInteger(n) && n >= 1 && n <= 4096)) throw new Error('Invalid preview dimensions');
  const prefix = options.assetPrefix ?? '';
  if (typeof prefix !== 'string' || (prefix !== '' && !/^(?:[a-zA-Z0-9_-]+\/)*$/.test(prefix))) throw new Error('Invalid asset prefix');
  const images = ORDER.flatMap(slot => {
    const layer = layers[slot];
    if (!layer || !layer.visible) return [];
    return [`<image data-slot="${slot}" href="${xml(prefix+layer.path)}" x="0" y="0" width="${width}" height="${height}" preserveAspectRatio="xMidYMid meet"/>`];
  });
  return {variant,fallbacks,svg:`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${images.join('')}</svg>`};
}

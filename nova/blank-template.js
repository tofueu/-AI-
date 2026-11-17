import {NOVA_SLOTS} from './character-mod.js';
const VARIANTS = Object.freeze({chibi:{width:512,height:512,head:[256,152,118,105],body:[256,341,105,130]},adult:{width:512,height:768,head:[256,167,98,110],body:[256,475,100,220]}});
/** Editable SVG whiteboard with named transparent groups. No artwork is embedded. */
export function createNovaBlankTemplate(variant, {guides = true} = {}) {
  const config = VARIANTS[variant];
  if (!config) throw new Error('Unknown NOVA variant');
  if (typeof guides !== 'boolean') throw new Error('Invalid guides option');
  const groups = NOVA_SLOTS.map(slot => `<g id="layer-${slot}" data-slot="${slot}" data-mod-slot="${slot}"></g>`).join('');
  const outlines = ['body','head'].map(slot => {
    const [cx,cy,rx,ry] = config[slot];
    return `<ellipse data-guide="${slot}" cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}"/>`;
  }).join('');
  const guideSvg = guides ? `<g id="guides" fill="none" stroke="#777" stroke-width="2" stroke-dasharray="7 6" opacity="0.5" data-export="exclude">${outlines}</g>` : '';
  return {variant,width:config.width,height:config.height,slots:[...NOVA_SLOTS],guideAnchors:{head:[...config.head],body:[...config.body]},svg:`<svg xmlns="http://www.w3.org/2000/svg" width="${config.width}" height="${config.height}" viewBox="0 0 ${config.width} ${config.height}" data-nova-variant="${variant}">${groups}${guideSvg}</svg>`};
}
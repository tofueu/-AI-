/** Render bound NOVA MOD layers as an SVG frame; original images remain untouched. */
const xml = value => String(value).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/'/g,'&apos;');
const finite = (value,name) => {
  if (typeof value !== 'number' || !Number.isFinite(value)) throw new TypeError('Invalid '+name);
  return value;
};
export function renderLayerFrameSvg({layers,width,height,background='none'}) {
  if (!Array.isArray(layers) || layers.length > 256) throw new TypeError('Invalid layers');
  finite(width,'width'); finite(height,'height');
  if (width <= 0 || height <= 0 || width > 8192 || height > 8192) throw new RangeError('Invalid canvas size');
  if (typeof background !== 'string' || !/^(none|#[0-9a-f]{3,8})$/i.test(background)) throw new TypeError('Invalid background');
  const nodes = layers.map(layer => {
    if (!layer || typeof layer !== 'object') throw new TypeError('Invalid layer');
    if (layer.hidden === true || layer.empty === true || layer.visible === false) return '';
    const rawPivot=layer.pivot??{x:0,y:0};
    if (Array.isArray(rawPivot) && rawPivot.length!==2) throw new TypeError('Invalid pivot');
    if (!Array.isArray(rawPivot) && (!rawPivot || typeof rawPivot!=='object')) throw new TypeError('Invalid pivot');
    const pivot=Array.isArray(rawPivot)?{x:rawPivot[0],y:rawPivot[1]}:rawPivot;
    const {src,transform={}} = layer;
    if (typeof src !== 'string' || !src.trim() || /[\x00-\x1f]/.test(src) || /^(?:javascript|https?):/i.test(src)) throw new TypeError('Invalid image source');
    const x=finite(transform.x??0,'x'),y=finite(transform.y??0,'y');
    const r=finite(transform.rotation??0,'rotation');
    const sx=finite(transform.scaleX??1,'scaleX'),sy=finite(transform.scaleY??1,'scaleY');
    const px=finite(pivot.x??0,'pivot x'),py=finite(pivot.y??0,'pivot y');
    const tx=x+px,ty=y+py;
    return '<g transform="translate('+tx+' '+ty+') rotate('+r+') scale('+sx+' '+sy+') translate('+-px+' '+-py+')"><image href="'+xml(src)+'" x="0" y="0" width="100%" height="100%" preserveAspectRatio="xMinYMin meet"/></g>';
  });
  return '<svg xmlns="http://www.w3.org/2000/svg" width="'+width+'" height="'+height+'" viewBox="0 0 '+width+' '+height+'"><rect width="100%" height="100%" fill="'+background+'"/>'+nodes.join('')+'</svg>';
}
export function renderAnimationSvgFrames({frames,width,height,background='none'}) {
  if (!Array.isArray(frames) || frames.length < 1 || frames.length > 10000) throw new RangeError('Invalid frames');
  return frames.map(frame => ({index:frame.index,timeMs:frame.timeMs,svg:renderLayerFrameSvg({layers:frame.layers,width,height,background})}));
}

import {renderLayerFrameSvg} from './svg-frame-renderer.js';

/** Arrange bound animation frames into a static inspection sheet; no source assets are changed. */
export function renderAnimationContactSheet({frames,width,height,columns=4,gap=8,background='none'}) {
  if (!Array.isArray(frames) || frames.length < 1 || frames.length > 120) throw new RangeError('Invalid contact sheet frames');
  if (!Number.isInteger(columns) || columns < 1 || columns > 20) throw new RangeError('Invalid columns');
  if (!Number.isInteger(gap) || gap < 0 || gap > 256) throw new RangeError('Invalid gap');
  const cells = frames.map(frame => renderLayerFrameSvg({layers:frame.layers,width,height,background}));
  const effectiveColumns = Math.min(columns, frames.length);
  const rows = Math.ceil(frames.length / effectiveColumns);
  const totalWidth = effectiveColumns * width + (effectiveColumns - 1) * gap;
  const totalHeight = rows * height + (rows - 1) * gap;
  if (totalWidth > 32768 || totalHeight > 32768) throw new RangeError('Contact sheet too large');
  const body = cells.map((svg,i) => {
    const start = svg.indexOf('>'), end = svg.lastIndexOf('</svg>');
    if (start < 0 || end <= start) throw new TypeError('Invalid generated SVG');
    const x = (i % effectiveColumns) * (width + gap);
    const y = Math.floor(i / effectiveColumns) * (height + gap);
    return `<g transform="translate(${x} ${y})"><svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${svg.slice(start+1,end)}</svg></g>`;
  }).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${totalWidth}" height="${totalHeight}" viewBox="0 0 ${totalWidth} ${totalHeight}">${body}</svg>`;
}

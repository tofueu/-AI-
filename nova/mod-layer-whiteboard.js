import { NOVA_MOD_SLOTS } from './mod-slot-template.js';

// An editable, transparent whiteboard for drawing each MOD part.
// SVG is intentionally a source template, not a claim of finished PNG/PSD art.
export function createNovaLayerWhiteboard({ variant, slot, width = 512, height = 512 } = {}) {
  if (variant !== 'chibi' && variant !== 'adult') throw new TypeError('Invalid NOVA variant');
  if (!NOVA_MOD_SLOTS.includes(slot)) throw new TypeError('Unknown NOVA MOD slot');
  if (![width, height].every(n => Number.isInteger(n) && n >= 64 && n <= 4096)) {
    throw new RangeError('Canvas dimensions must be integers from 64 to 4096');
  }
  const cx = width / 2, cy = height / 2;
  const label = `${variant} / ${slot}`;
  // No external image references or executable SVG content.
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <title>NOVA ${label} transparent drawing template</title>
  <g id="guides" fill="none" stroke="#b6a3da" stroke-width="1" stroke-dasharray="6 6" opacity=".7">
    <path d="M ${cx} 0 V ${height} M 0 ${cy} H ${width}"/>
    <rect x="8" y="8" width="${width-16}" height="${height-16}" rx="8"/>
  </g>
  <g id="pivot-guide" fill="none" stroke="#8053b0" stroke-width="2">
    <circle cx="${cx}" cy="${cy}" r="9"/>
    <path d="M ${cx-14} ${cy} h 28 M ${cx} ${cy-14} v 28"/>
  </g>
  <g id="artwork-${slot}"></g>
</svg>`;
}

export function createNovaWhiteboardManifest(variant) {
  if (variant !== 'chibi' && variant !== 'adult') throw new TypeError('Invalid NOVA variant');
  return {
    variant,
    format: 'svg',
    transparent: true,
    pivot: [0.5, 0.5],
    slots: NOVA_MOD_SLOTS.map(slot => ({
      slot,
      filename: `${variant}/${slot}.svg`,
      status: 'blank',
      operation: 'inherit'
    }))
  };
}

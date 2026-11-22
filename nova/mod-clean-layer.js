import { NOVA_MOD_SLOTS } from './mod-slot-template.js';

// Produce a transparent artwork-only SVG for a MOD slot.
// Guide geometry is deliberately excluded from runtime images.
export function createNovaCleanLayer({ variant, slot, artwork = '', width = 512, height = 512 } = {}) {
  if (!['chibi', 'adult'].includes(variant)) throw new TypeError('Invalid NOVA variant');
  if (!NOVA_MOD_SLOTS.includes(slot)) throw new TypeError('Unknown NOVA MOD slot');
  if (![width, height].every(n => Number.isInteger(n) && n >= 64 && n <= 4096)) {
    throw new RangeError('Invalid canvas dimensions');
  }
  if (typeof artwork !== 'string') throw new TypeError('Artwork must be SVG markup');
  // Reject active/external SVG features; imported artwork is untrusted.
  if (/<\s*(script|foreignObject|image|use|iframe|style|animate|set)\b|\bon\w+\s*=|\b(href|src)\s*=|url\s*\(|<\s*!|<\s*\?/i.test(artwork)) {
    throw new TypeError('Unsafe SVG artwork');
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><g id="artwork-${slot}">${artwork}</g></svg>`;
}

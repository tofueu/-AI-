import { NOVA_MOD_SLOTS } from './mod-slot-template.js';
import { renderNovaSvg } from './svg-renderer.js';

// Convert sampled keyframe transforms into a renderable frame without altering base art.
export function renderNovaAnimationFrame(basePose, sampledFrame, options = {}) {
  if (!basePose || !['chibi', 'adult'].includes(basePose.variant) || !Array.isArray(basePose.layers)) {
    throw new TypeError('Invalid base NOVA pose');
  }
  if (!sampledFrame || typeof sampledFrame !== 'object' || !sampledFrame.pose ||
      typeof sampledFrame.pose !== 'object' || Array.isArray(sampledFrame.pose)) {
    throw new TypeError('Invalid sampled frame');
  }
  for (const slot of Object.keys(sampledFrame.pose)) {
    if (!NOVA_MOD_SLOTS.includes(slot)) throw new TypeError('Unknown animation slot');
  }
  const layers = basePose.layers.map(layer => {
    if (!layer || !layer.transform || typeof layer !== 'object') throw new TypeError('Invalid layer');
    const delta = sampledFrame.pose[layer.slot];
    if (!delta) return { ...layer, transform: { ...layer.transform } };
    const transform = { ...layer.transform };
    for (const field of ['x', 'y', 'rotation']) {
      if (delta[field] !== undefined) {
        if (!Number.isFinite(delta[field])) throw new TypeError('Invalid animation transform');
        transform[field] = (transform[field] ?? 0) + delta[field];
      }
    }
    for (const field of ['scaleX', 'scaleY']) {
      if (delta[field] !== undefined) {
        if (!Number.isFinite(delta[field]) || delta[field] <= 0) throw new TypeError('Invalid animation scale');
        transform[field] = (transform[field] ?? 1) * delta[field];
      }
    }
    return { ...layer, transform };
  });
  return renderNovaSvg({ variant: basePose.variant, layers }, options);
}

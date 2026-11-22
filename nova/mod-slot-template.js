// Blank, editable MOD manifest for either NOVA character rig.
// 'inherit' keeps the base artwork visible until an artist replaces it.
export const NOVA_MOD_SLOTS = Object.freeze([
  'body', 'outfit', 'head', 'face', 'eyes', 'brows', 'nose', 'mouth',
  'hair_back', 'hair_front', 'hair_side', 'hat', 'top', 'bottom', 'dress',
  'outer', 'shoes', 'accessory', 'wings', 'tail', 'leg_l', 'leg_r',
  'shoes_l', 'shoes_r', 'arm_l', 'arm_r', 'hand_l', 'hand_r'
]);

export function createNovaModTemplate(variant) {
  if (variant !== 'chibi' && variant !== 'adult') {
    throw new TypeError('Invalid NOVA character variant');
  }
  return {
    schemaVersion: 1,
    variant,
    layers: Object.fromEntries(NOVA_MOD_SLOTS.map(slot => [slot, { operation: 'inherit' }]))
  };
}

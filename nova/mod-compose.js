// Pure NOVA layered MOD resolver. No file, browser or network access.
export const MOD_SLOTS = Object.freeze(['body','face','eyes','mouth','hair_back','hair_front','top','bottom','shoes','hat','accessory']);
const required = new Set(['body','top','bottom']);
const safePath = value => typeof value === 'string' && value.length <= 240 && /^(?!\/)(?!.*(?:^|\/)\.\.?\/)(?!.*\\)[a-z0-9_/-]+\.(?:png|webp)$/i.test(value);
function validatePack(pack) {
  if (!pack || typeof pack !== 'object' || Array.isArray(pack) || !pack.layers || typeof pack.layers !== 'object' || Array.isArray(pack.layers)) throw new Error('Invalid MOD pack');
  for (const [slot, path] of Object.entries(pack.layers)) {
    if (!MOD_SLOTS.includes(slot)) throw new Error(`Unknown MOD slot: ${slot}`);
    if (path !== null && !safePath(path)) throw new Error(`Unsafe MOD layer: ${slot}`);
  }
}
export function composeMod(base, mod) {
  validatePack(base); validatePack(mod);
  const layers = {};
  const fallbackSlots = [];
  for (const slot of MOD_SLOTS) {
    const replacement = mod.layers[slot];
    const original = base.layers[slot];
    if (replacement !== undefined && replacement !== null) layers[slot] = replacement;
    else if (required.has(slot) || replacement === undefined) {
      if (original !== undefined && original !== null) {
        layers[slot] = original;
        if (required.has(slot)) fallbackSlots.push(slot);
      }
    }
    if (required.has(slot) && !layers[slot]) throw new Error(`Missing required base clothing/body: ${slot}`);
  }
  return {layers, fallbackSlots};
}

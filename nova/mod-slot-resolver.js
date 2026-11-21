// Pure MOD slot composition. Empty replacements are hidden; base clothing is never removed.
export const NOVA_SLOTS = Object.freeze(['body','head','eyes','mouth','hair_back','hair_front','hat','top','bottom','shoes','accessory']);
const CLOTHING = new Set(['top','bottom','shoes']);
const SAFE_PATH = /^(?!\/)(?!.*(?:^|\/)\.\.?\/)(?!.*\\)[a-zA-Z0-9_./-]+\.png$/;
function validateLayer(value) {
  if (value === null) return null;
  if (typeof value !== 'string' || !SAFE_PATH.test(value)) throw new Error('Unsafe or invalid PNG layer path');
  return value;
}
export function composeNovaMod({base, mod = {}, variant} = {}) {
  if (!['chibi','adult'].includes(variant)) throw new Error('Invalid NOVA variant');
  if (!base || typeof base !== 'object' || Array.isArray(base) || !mod || typeof mod !== 'object' || Array.isArray(mod)) throw new Error('Invalid layer map');
  for (const [name, map] of [['base',base],['mod',mod]]) {
    for (const [slot, value] of Object.entries(map)) {
      if (!NOVA_SLOTS.includes(slot)) throw new Error(`Unknown ${name} slot: ${slot}`);
      validateLayer(value);
    }
  }
  const layers = {};
  const fallback = [];
  for (const slot of NOVA_SLOTS) {
    const original = base[slot] ?? null;
    if (CLOTHING.has(slot) && original === null) throw new Error(`Missing base clothing: ${slot}`);
    const replacement = Object.hasOwn(mod,slot) ? mod[slot] : undefined;
    if (CLOTHING.has(slot) && replacement === null) {layers[slot]=original;fallback.push(slot);}
    else layers[slot] = replacement === undefined ? original : replacement;
  }
  return {variant,layers,hidden:NOVA_SLOTS.filter(slot=>layers[slot]===null),clothingFallback:fallback};
}

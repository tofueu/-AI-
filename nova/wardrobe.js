// Select character body and outfit independently; never mutate a saved MOD.
export const WARDROBE_VARIANTS = Object.freeze(['chibi', 'adult']);
const ID = /^[a-z0-9][a-z0-9_-]{0,63}$/i;
function requireId(value, label) {
  if (typeof value !== 'string' || !ID.test(value)) throw new Error('Invalid ' + label);
  return value;
}
export function createWardrobe({variant='chibi', character='official', outfit='default'}={}) {
  if (!WARDROBE_VARIANTS.includes(variant)) throw new Error('Invalid wardrobe variant');
  return Object.freeze({variant, character:requireId(character,'character'), outfit:requireId(outfit,'outfit')});
}
export function switchWardrobe(current, change, catalog) {
  if (!current || !change || typeof change !== 'object' || !catalog || typeof catalog !== 'object') throw new Error('Invalid wardrobe input');
  const variant = change.variant ?? current.variant;
  if (!WARDROBE_VARIANTS.includes(variant)) throw new Error('Invalid wardrobe variant');
  const entries = catalog[variant];
  if (!entries || typeof entries !== 'object' || !Array.isArray(entries.characters) || !Array.isArray(entries.outfits)) throw new Error('Missing wardrobe catalog');
  const character = change.character ?? (variant === current.variant ? current.character : 'official');
  const outfit = change.outfit ?? (variant === current.variant && character === current.character ? current.outfit : 'default');
  const next = createWardrobe({variant, character, outfit});
  if (!entries.characters.includes(next.character)) throw new Error('Character unavailable for variant');
  if (!entries.outfits.includes(next.outfit)) throw new Error('Outfit unavailable for variant');
  return next;
}

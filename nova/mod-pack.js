import { NOVA_MOD_SLOTS, renderLayeredCharacterTemplate } from './layered-character-template.js';

// Portable JSON MOD pack format. Paths are relative to the pack directory.
const VARIANTS = ['chibi', 'adult'];
const isRecord = x => x !== null && typeof x === 'object' && !Array.isArray(x);
function validatePath(path) {
  if (typeof path !== 'string' || !/^[a-zA-Z0-9_./-]+\.png$/i.test(path) ||
      path.startsWith('/') || path.split('/').includes('..') || path.split('/').includes('.') ||
      path.includes('//')) throw new TypeError('Invalid relative PNG path');
  return path;
}
export function validateNovaModPack(pack) {
  if (!isRecord(pack) || pack.schemaVersion !== 1 || !isRecord(pack.variants))
    throw new TypeError('Invalid NOVA MOD pack manifest');
  if (Object.keys(pack).some(k => !['schemaVersion','name','variants'].includes(k)))
    throw new TypeError('Unknown NOVA MOD manifest field');
  if (pack.name !== undefined && (typeof pack.name !== 'string' || !pack.name.trim() || pack.name.length > 100))
    throw new TypeError('Invalid NOVA MOD name');
  if (!Object.keys(pack.variants).length) throw new TypeError('MOD pack has no variants');
  for (const [variant, definition] of Object.entries(pack.variants)) {
    if (!VARIANTS.includes(variant) || !isRecord(definition))
      throw new TypeError('Invalid NOVA MOD variant');
    if (Object.keys(definition).some(k => !['layers','fullCharacter'].includes(k)))
      throw new TypeError('Unknown NOVA MOD variant field');
    const layers = definition.layers ?? {};
    if (!isRecord(layers)) throw new TypeError('Invalid NOVA MOD layers');
    for (const [slot, path] of Object.entries(layers)) {
      if (!NOVA_MOD_SLOTS.includes(slot)) throw new TypeError('Unknown NOVA MOD slot');
      if (path !== null && path !== '') validatePath(path);
    }
    if (definition.fullCharacter != null) {
      validatePath(definition.fullCharacter);
      if (Object.values(layers).some(Boolean))
        throw new TypeError('Full-character MOD cannot mix with individual layers');
    }
  }
  return pack;
}
export function renderNovaModPack(pack, variant) {
  validateNovaModPack(pack);
  if (!VARIANTS.includes(variant)) throw new RangeError('Unknown NOVA variant');
  const definition = pack.variants[variant];
  if (!definition) throw new RangeError('MOD pack does not provide '+variant);
  return renderLayeredCharacterTemplate({
    variant,
    layers: Object.fromEntries(Object.entries(definition.layers ?? {}).filter(([,p]) => Boolean(p))),
    fullCharacter: definition.fullCharacter ?? null
  });
}
export function makeNovaModWhiteboardManifest() {
  return {
    schemaVersion: 1,
    name: 'NOVA editable MOD whiteboard',
    variants: Object.fromEntries(VARIANTS.map(variant => [variant, {
      layers: Object.fromEntries(NOVA_MOD_SLOTS.map(slot => [slot, null]))
    }]))
  };
}

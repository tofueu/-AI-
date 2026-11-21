import {composeNovaMod, NOVA_SLOTS} from './mod-slot-resolver.js';
const MAX_BYTES = 1024 * 1024;
function plainRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value) &&
    (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null);
}
export function importNovaModPackage(json, {base, variant} = {}) {
  if (typeof json !== 'string' || Buffer.byteLength(json, 'utf8') > MAX_BYTES) throw new Error('Invalid MOD package size');
  let manifest;
  try { manifest = JSON.parse(json); } catch { throw new Error('Invalid MOD package JSON'); }
  if (!plainRecord(manifest) || manifest.schemaVersion !== 1 || !['chibi','adult'].includes(manifest.variant)) throw new Error('Invalid MOD manifest');
  if (variant !== undefined && variant !== manifest.variant) throw new Error('MOD variant mismatch');
  if (!plainRecord(manifest.layers)) throw new Error('Invalid MOD layers');
  if (Object.keys(manifest).some(key => !['schemaVersion','variant','layers','name'].includes(key))) throw new Error('Unknown MOD manifest field');
  if (manifest.name !== undefined && (typeof manifest.name !== 'string' || manifest.name.length > 100)) throw new Error('Invalid MOD name');
  if (Object.keys(manifest.layers).some(key => !NOVA_SLOTS.includes(key))) throw new Error('Unknown MOD slot');
  return composeNovaMod({base, mod:manifest.layers, variant:manifest.variant});
}

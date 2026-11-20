import {applyNovaModPackage, validateNovaModPackage} from './nova-mod-package.js';

// Import manifests without touching the filesystem. The host must supply the
// actual archive entries; validating names alone does not decode image data.
export function importNovaModJson(json, assetNames, base = {}) {
 if(typeof json !== 'string' || Buffer.byteLength(json, 'utf8') > 1024 * 1024) throw new Error('Invalid NOVA MOD manifest size');
 let parsed;
 try { parsed = JSON.parse(json); } catch { throw new Error('Invalid NOVA MOD JSON'); }
 const manifest = validateNovaModPackage(parsed);
 if(!Array.isArray(assetNames) || assetNames.some(name => typeof name !== 'string')) throw new TypeError('Expected NOVA asset name list');
 const available = new Set(assetNames);
 const missing = [...new Set(Object.values(manifest.layers).filter(path => path !== null && !available.has(path)))];
 if(missing.length) throw new Error(`Missing NOVA MOD assets: ${missing.join(', ')}`);
 return applyNovaModPackage(manifest, base);
}

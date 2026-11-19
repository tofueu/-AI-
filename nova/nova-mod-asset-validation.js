// Validate declared, visible PNG assets before accepting a NOVA MOD bundle.
// Header validation is not a substitute for full PNG decoding or CRC checks.
import {validateNovaModPackage} from './nova-mod-package-validator.js';
import {inspectNovaPngAsset} from './nova-png-asset-inspector.js';

export function inspectNovaModAssets(manifest, files = {}, options = {}) {
  if (!files || typeof files !== 'object' || Array.isArray(files)) throw new Error('Invalid file collection');
  const report = validateNovaModPackage(manifest, files);
  const inspected = {};
  const errors = [];
  for (const slot of report.present) {
    const path = manifest.layers[slot].path;
    try {
      inspected[slot] = inspectNovaPngAsset(files[path], manifest.canvas, options);
    } catch (error) {
      errors.push({slot, path, reason: error instanceof Error ? error.message : String(error)});
    }
  }
  // A visible, declared file that is absent is an invalid MOD, not an
  // intentionally empty layer. Required slots may still use base fallback.
  for (const slot of report.missing) {
    const layer = manifest.layers[slot];
    if (layer !== null && layer?.visible === true) {
      errors.push({slot, path: layer.path, reason: 'declared visible PNG is missing'});
    }
  }
  const validSlots = report.present.filter(slot => Object.hasOwn(inspected, slot));
  const required = manifest.requiredSlots;
  return {
    variant: report.variant,
    inspected,
    validSlots,
    hidden: report.hidden,
    missing: report.missing,
    errors,
    needsBase: required.filter(slot => !validSlots.includes(slot)),
    valid: errors.length === 0
  };
}

// Generate a portable, non-destructive MOD starter from the artist's slot template.
import {LAYER_SLOTS, NOVA_VARIANTS} from './mod-layers.js';
import {importNovaModManifest} from './mod-manifest.js';

export function createNovaModStarter(id,variant) {
  if (!NOVA_VARIANTS.includes(variant)) throw new Error('Unsupported NOVA variant');
  const layers = Object.fromEntries(LAYER_SLOTS.map(slot => [slot,{operation:'inherit'}]));
  const starter = {schemaVersion:1,id,variant,layers};
  importNovaModManifest(starter);
  return starter;
}

export function setNovaModStarterPart(starter,slot,part) {
  if (!LAYER_SLOTS.includes(slot)) throw new Error('Unknown NOVA slot');
  const next = structuredClone(starter);
  if (!next || !next.layers) throw new Error('Invalid NOVA starter');
  next.layers[slot] = structuredClone(part);
  importNovaModManifest(next);
  return next;
}

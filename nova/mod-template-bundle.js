// Export a deterministic, editable SVG guide bundle manifest without touching source artwork.
import { NOVA_SLOTS } from './character-mod.js';
import { makeNovaModGuideSet } from './mod-guide-svg.js';

export function makeNovaModTemplateBundle(variant, size = 512) {
  const guides = makeNovaModGuideSet(variant, size);
  const files = Object.fromEntries(Object.entries(guides).map(([name, svg]) => [`guides/${name}`, svg]));
  const layers = Object.fromEntries(NOVA_SLOTS.map(slot => [slot, null]));
  const manifest = {
    schemaVersion: 1,
    variant,
    canvas: {width:size,height:size},
    guideDirectory: 'guides/',
    artworkDirectory: 'artwork/',
    requiredSlots: ['body','head','outfit'],
    slots: [...NOVA_SLOTS],
    layers
  };
  files['template.json'] = JSON.stringify(manifest, null, 2) + '\n';
  files['README.txt'] = 'NOVA MOD editable guide bundle\nEach guides/*.svg has a reference, joint-guide and empty artwork group.\nDraw each slot on its own full-size transparent canvas; export to artwork/<slot>.png.\nSet template.json layers.<slot> to {"path":"artwork/<slot>.png","visible":true}.\nRequired slots body, head, outfit must be supplied by a valid base character.\nSVG guides are not finished character art or layered PSD files.\n';
  return files;
}

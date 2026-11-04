// Adapter: first-sheet artist guide -> canonical importable NOVA PNG manifest.
// Keep visual guide slots separate from MOD protocol slots. Do not claim that
// guide-only limb slots are supported by the current importer.
import {createNovaWhiteboard} from './first-sheet-whiteboard.js';
import {createNovaModTemplate} from './mod-template.js';
import {LAYER_SLOTS} from './mod-layers.js';

export const GUIDE_ONLY_SLOTS=Object.freeze([
  'leg_l','leg_r','shoes_l','shoes_r','arm_l','arm_r','hand_l','hand_r','outer','face'
]);

export function createFirstSheetImportBundle(variant) {
  const manifest=createNovaModTemplate(variant,{width:512,height:512});
  const guide=createNovaWhiteboard(variant);
  // Only canonical slots are imported. Artist guides may depict additional
  // anatomical subparts until the importer explicitly supports them.
  return {
    variant,
    manifest,
    guide,
    supportedSlots:[...LAYER_SLOTS],
    guideOnlySlots:[...GUIDE_ONLY_SLOTS],
    instructions:'Paint full-canvas transparent RGBA PNGs using manifest.layers filenames. Empty slots stay hidden. Provide trusted safeOutfit top/bottom during composition. Guide-only slots cannot be imported as separate layers yet.'
  };
}

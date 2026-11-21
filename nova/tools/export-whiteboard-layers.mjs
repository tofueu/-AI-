#!/usr/bin/env node
// Export each named NOVA whiteboard slot as a standalone transparent SVG.
// Usage: node nova/tools/export-whiteboard-layers.mjs chibi [output-directory]
//        node nova/tools/export-whiteboard-layers.mjs adult [output-directory]
// SVG remains editable; PNG/PSD conversion is a separate, not-yet-implemented step.
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const slots = [
  'body_base','legs_back','shoes','clothes_base','clothes_outer',
  'arms_back','head_base','ears','eyes','eyebrows','nose','mouth',
  'hair_back','hair_front','hat','arms_front','accessory'
];
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export function extractLayers(svg) {
  const header = svg.match(/^<svg\b[^>]*>/);
  if (!header || !/<\/svg>\s*$/.test(svg)) throw Error('Invalid SVG root');
  const result = new Map();
  for (const slot of slots) {
    const re = new RegExp('<g\\s+id="'+slot+'"\\s*\\/>|<g\\s+id="'+slot+'"[^>]*>[\\s\\S]*?<\\/g>', 'g');
    const matches = [...svg.matchAll(re)];
    if (matches.length !== 1) throw Error('Missing or duplicate slot: '+slot);
    result.set(slot, header[0]+'\n<title>NOVA '+slot+'</title>\n'+matches[0][0]+'\n</svg>\n');
  }
  return result;
}
export async function exportWhiteboard(variant, outDir) {
  if (!['chibi','adult'].includes(variant)) throw Error('Variant must be chibi or adult');
  const source = await readFile(path.join(root,'templates',variant+'-whiteboard.svg'),'utf8');
  const layers = extractLayers(source);
  await mkdir(outDir,{recursive:true});
  for (const [slot, svg] of layers) {
    await writeFile(path.join(outDir,slot+'.svg'),svg,{flag:'w'});
  }
  return layers.size;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const variant = process.argv[2];
  const dest = path.resolve(process.argv[3] || path.join(root,'exports',variant || 'unknown'));
  exportWhiteboard(variant,dest).then(n=>console.log('Exported '+n+' transparent SVG layers to '+dest))
    .catch(e=>{console.error(e.message);process.exitCode=1;});
}

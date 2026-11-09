'use strict';
const fs=require('node:fs');
const path=require('node:path');
const {SLOTS}=require('../tools/export-mod-template.cjs');
const ALLOWED=new Set(['.png','.webp','.svg']);
function validateModManifest(file){
 if(typeof file!=='string'||!file.trim())throw new TypeError('Manifest path required');
 const absolute=path.resolve(file);
 const root=path.dirname(absolute);
 const manifest=JSON.parse(fs.readFileSync(absolute,'utf8'));
 if(!manifest||manifest.schemaVersion!==1||!['chibi','adult'].includes(manifest.variant))throw new TypeError('Unsupported NOVA MOD schema or variant');
 if(!manifest.canvas||manifest.canvas.width!==512||manifest.canvas.height!==512)throw new TypeError('NOVA MOD canvas must be 512x512');
 if(!manifest.slots||typeof manifest.slots!=='object'||Array.isArray(manifest.slots))throw new TypeError('MOD slots must be an object');
 const resolved={};
 for(const [slot,source] of Object.entries(manifest.slots)){
  if(!SLOTS.includes(slot))throw new TypeError('Unknown MOD slot: '+slot);
  if(typeof source!=='string')throw new TypeError('Invalid source for '+slot);
  if(!source.trim()){resolved[slot]=null;continue}
  if(source!==source.trim()||path.isAbsolute(source)||source.includes('\\')||source.split('/').includes('..')||source.split('/').includes('.'))throw new TypeError('Unsafe MOD source: '+slot);
  const ext=path.extname(source).toLowerCase();
  if(!ALLOWED.has(ext))throw new TypeError('Unsupported MOD asset type: '+slot);
  const candidate=path.resolve(root,source);
  const realRoot=fs.realpathSync(root);
  const realFile=fs.realpathSync(candidate);
  if(!realFile.startsWith(realRoot+path.sep))throw new TypeError('MOD source escapes directory: '+slot);
  if(!fs.statSync(realFile).isFile())throw new TypeError('MOD source is not a file: '+slot);
  resolved[slot]=realFile;
 }
 for(const slot of SLOTS)if(!(slot in resolved))resolved[slot]=null;
 return {variant:manifest.variant,canvas:manifest.canvas,slots:resolved,activeSlots:Object.keys(resolved).filter(k=>resolved[k]!==null)};
}
module.exports={validateModManifest};

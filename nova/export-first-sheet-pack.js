#!/usr/bin/env node
// Generate real RGBA blank PNGs matching the canonical NOVA importer protocol.
// No original character art is modified. This is not a PSD or completed character.
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {deflateSync} from 'node:zlib';
import {pathToFileURL} from 'node:url';
import {createFirstSheetImportBundle} from './first-sheet-import-bundle.js';
import {validateNovaPngPack} from './mod-pack-validator.js';
function crc32(data) {
  let crc=0xffffffff;
  for(const byte of data){crc^=byte;for(let i=0;i<8;i++)crc=(crc>>>1)^((crc&1)?0xedb88320:0);}
  return (crc^0xffffffff)>>>0;
}
function chunk(type,data) {
  const name=Buffer.from(type,'ascii'),length=Buffer.alloc(4),crc=Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  crc.writeUInt32BE(crc32(Buffer.concat([name,data])));
  return Buffer.concat([length,name,data,crc]);
}
export function blankRgbaPng(width,height) {
  if(!Number.isInteger(width)||!Number.isInteger(height)||width<1||height<1||width>4096||height>4096)throw new Error('Invalid PNG dimensions');
  const header=Buffer.alloc(13);
  header.writeUInt32BE(width,0);header.writeUInt32BE(height,4);header[8]=8;header[9]=6;
  const raw=Buffer.alloc(height*(1+width*4));
  return Buffer.concat([Buffer.from('89504e470d0a1a0a','hex'),chunk('IHDR',header),chunk('IDAT',deflateSync(raw)),chunk('IEND',Buffer.alloc(0))]);
}
export async function exportFirstSheetPack(variant,directory) {
  const bundle=createFirstSheetImportBundle(variant);
  const output=resolve(directory);
  await mkdir(output,{recursive:true});
  const png=blankRgbaPng(bundle.manifest.canvas.width,bundle.manifest.canvas.height);
  for(const layer of bundle.manifest.layers)await writeFile(join(output,layer.filename),png,{flag:'wx'});
  await writeFile(join(output,'manifest.json'),JSON.stringify(bundle.manifest,null,2)+'\n',{flag:'wx'});
  await writeFile(join(output,'whiteboard.svg'),bundle.guide,{flag:'wx'});
  const verified=await validateNovaPngPack(output);
  return {directory:output,variant,verifiedLayers:verified.layers.length,allHidden:verified.layers.every(layer=>layer.hidden)};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
  const [,,variant,directory]=process.argv;
  if(!directory){console.error('Usage: node nova/export-first-sheet-pack.js <chibi|adult> <empty-output-dir>');process.exitCode=2;}
  else exportFirstSheetPack(variant,directory).then(result=>console.log(JSON.stringify(result,null,2))).catch(error=>{console.error(error.message);process.exitCode=1;});
}

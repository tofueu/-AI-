// Validate an artist's exported PNG layer pack before importing it as a NOVA MOD.
// This checks file identity, RGBA format and dimensions; it does not decode pixels.
import {readFile,lstat,realpath} from 'node:fs/promises';
import {resolve,sep} from 'node:path';
import {validateNovaModTemplate} from './mod-template.js';

export async function validateNovaPngPack(directory) {
  const root=await realpath(resolve(directory));
  const manifest=JSON.parse(await readFile(resolve(root,'manifest.json'),'utf8'));
  validateNovaModTemplate(manifest);
  const result=[];
  for (const layer of manifest.layers) {
    const path=resolve(root,layer.filename);
    if (!path.startsWith(root+sep)) throw new Error('Unsafe PNG layer path');
    // Reject symlinks, including links that point outside the pack root.
    const info=await lstat(path);
    if (!info.isFile() || info.isSymbolicLink() || await realpath(path)!==path) throw new Error('Unsafe PNG layer file: '+layer.slot);
    const bytes=await readFile(path);
    if (bytes.length<33 || bytes.subarray(0,8).toString('hex')!=='89504e470d0a1a0a' ||
        bytes.toString('ascii',12,16)!=='IHDR' ||
        bytes.readUInt32BE(16)!==manifest.canvas.width ||
        bytes.readUInt32BE(20)!==manifest.canvas.height ||
        bytes[24]!==8 || bytes[25]!==6) {
      throw new Error('Invalid RGBA PNG layer: '+layer.slot);
    }
    result.push({slot:layer.slot,path,hidden:layer.hidden});
  }
  return {variant:manifest.variant,canvas:manifest.canvas,layers:result};
}

// Validate PNG assets before exposing artist MODs to the renderer.
// This checks PNG framing/IHDR, not full decompression or malware safety.
const SIGNATURE=[137,80,78,71,13,10,26,10];
export function validateNovaPng(bytes,{maxBytes=8*1024*1024,maxDimension=4096}={}) {
  if(!(bytes instanceof Uint8Array)||bytes.length<33||bytes.length>maxBytes)
    throw new Error('Invalid PNG size');
  if(!SIGNATURE.every((b,i)=>bytes[i]===b)) throw new Error('Invalid PNG signature');
  const u32=i=>((bytes[i]*0x1000000)+(bytes[i+1]<<16)+(bytes[i+2]<<8)+bytes[i+3])>>>0;
  if(u32(8)!==13||String.fromCharCode(...bytes.subarray(12,16))!=='IHDR')
    throw new Error('Missing PNG IHDR');
  const width=u32(16),height=u32(20),depth=bytes[24],color=bytes[25];
  if(!width||!height||width>maxDimension||height>maxDimension)
    throw new Error('Invalid PNG dimensions');
  if(![2,6].includes(color)||depth!==8)
    throw new Error('NOVA requires 8-bit RGB or RGBA PNG');
  if(bytes[26]!==0||bytes[27]!==0||bytes[28]!==0)
    throw new Error('Unsupported PNG compression, filter or interlace');
  // Alpha channel is mandatory for independently composited MOD parts.
  if(color!==6) throw new Error('NOVA layer PNG must have an alpha channel');
  return {width,height,bitDepth:depth,colorType:color,bytes:bytes.length};
}

export async function validateNovaModAssets(manifest,readAsset) {
  if(!manifest||!Array.isArray(manifest.slots)||typeof readAsset!=='function')
    throw new Error('Invalid MOD asset request');
  const checked=[],seen=new Set();
  for(const part of manifest.slots) {
    if(!part||part.hidden===true||part.transparent===true) continue;
    if(typeof part.filename!=='string'||!/^[a-z0-9_-]+\.png$/i.test(part.filename))
      throw new Error('Invalid MOD asset path');
    if(seen.has(part.filename)) throw new Error('Duplicate MOD asset path');
    seen.add(part.filename);
    const data=await readAsset(part.filename);
    const info=validateNovaPng(data);
    checked.push({slot:part.slot,filename:part.filename,...info});
  }
  return checked;
}

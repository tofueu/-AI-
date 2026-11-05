// Validate complete PNG framing before exposing artist MODs to the renderer.
// This is a structural/CRC check, not image decompression or malware scanning.
const SIGNATURE=[137,80,78,71,13,10,26,10];
function u32(b,i){return ((b[i]*0x1000000)+(b[i+1]<<16)+(b[i+2]<<8)+b[i+3])>>>0;}
function crc32(bytes,start,end){
  let crc=0xffffffff;
  for(let i=start;i<end;i++){
    crc^=bytes[i];
    for(let k=0;k<8;k++) crc=(crc>>>1)^((crc&1)?0xedb88320:0);
  }
  return (crc^0xffffffff)>>>0;
}
export function validateNovaPng(bytes,{maxBytes=8*1024*1024,maxDimension=4096}={}) {
  if(!(bytes instanceof Uint8Array)||bytes.length<57||bytes.length>maxBytes)
    throw new Error('Invalid PNG size');
  if(!SIGNATURE.every((b,i)=>bytes[i]===b)) throw new Error('Invalid PNG signature');
  let offset=8,ihdr=null,idat=false,ended=false,chunkCount=0;
  while(offset<bytes.length){
    if(bytes.length-offset<12) throw new Error('Truncated PNG chunk');
    const len=u32(bytes,offset),typeStart=offset+4,dataStart=offset+8;
    if(len>bytes.length-dataStart-4) throw new Error('Truncated PNG chunk');
    const end=dataStart+len;
    const type=String.fromCharCode(...bytes.subarray(typeStart,typeStart+4));
    if(!/^[A-Za-z]{4}$/.test(type)) throw new Error('Invalid PNG chunk type');
    if(crc32(bytes,typeStart,end)!==u32(bytes,end)) throw new Error('Invalid PNG CRC');
    if(chunkCount===0 && (type!=='IHDR'||len!==13)) throw new Error('Missing PNG IHDR');
    if(type==='IHDR'){
      if(ihdr||chunkCount!==0||len!==13) throw new Error('Invalid PNG IHDR');
      const width=u32(bytes,dataStart),height=u32(bytes,dataStart+4);
      const depth=bytes[dataStart+8],color=bytes[dataStart+9];
      if(!width||!height||width>maxDimension||height>maxDimension) throw new Error('Invalid PNG dimensions');
      if(depth!==8||color!==6) throw new Error('NOVA layer PNG requires 8-bit RGBA alpha channel');
      if(bytes[dataStart+10]!==0||bytes[dataStart+11]!==0||bytes[dataStart+12]!==0)
        throw new Error('Unsupported PNG compression, filter or interlace');
      ihdr={width,height,bitDepth:depth,colorType:color,bytes:bytes.length};
    }else if(type==='IDAT'){
      if(!ihdr||ended) throw new Error('Invalid PNG IDAT order');
      idat=true;
    }else if(type==='IEND'){
      if(len!==0||!idat||end+4!==bytes.length) throw new Error('Invalid PNG IEND');
      ended=true;
    }else if((bytes[typeStart]&32)===0){
      throw new Error('Unsupported critical PNG chunk: '+type);
    }
    offset=end+4;chunkCount++;
    if(chunkCount>2048) throw new Error('Too many PNG chunks');
    if(ended) break;
  }
  if(!ihdr||!idat||!ended||offset!==bytes.length) throw new Error('Incomplete PNG');
  return ihdr;
}
export async function validateNovaModAssets(manifest,readAsset) {
  if(!manifest||!Array.isArray(manifest.slots)||typeof readAsset!=='function')
    throw new Error('Invalid MOD asset request');
  const checked=[],seen=new Set();
  for(const part of manifest.slots){
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

// Validate an artist's exported PNG layer pack before importing it as a NOVA MOD.
// This checks file identity, RGBA format and dimensions; it does not decode pixels.
import {readFile,lstat,realpath} from 'node:fs/promises';
import {resolve,sep} from 'node:path';
import {inflateSync} from 'node:zlib';
import {validateNovaModTemplate} from './mod-template.js';

function crc32(data) {
  let crc=0xffffffff;
  for(const byte of data){crc^=byte;for(let i=0;i<8;i++)crc=(crc>>>1)^((crc&1)?0xedb88320:0);}
  return (crc^0xffffffff)>>>0;
}

// Validate the entire PNG stream, not only the IHDR header. Prevent decompression bombs.
function validateRgbaPng(bytes,width,height) {
  if(bytes.length<57 || bytes.subarray(0,8).toString('hex')!=='89504e470d0a1a0a') return false;
  let offset=8,seenIHDR=false,seenIEND=false,seenIDAT=false,idatClosed=false,compressedSize=0;
  const compressed=[];
  while(offset+12<=bytes.length){
    const length=bytes.readUInt32BE(offset),end=offset+12+length;
    if(end>bytes.length) return false;
    const type=bytes.toString('ascii',offset+4,offset+8);
    if(crc32(bytes.subarray(offset+4,offset+8+length))!==bytes.readUInt32BE(offset+8+length)) return false;
    if(!seenIHDR){
      if(type!=='IHDR'||length!==13||bytes.readUInt32BE(offset+8)!==width||bytes.readUInt32BE(offset+12)!==height||bytes[offset+16]!==8||bytes[offset+17]!==6||bytes[offset+18]!==0||bytes[offset+19]!==0||bytes[offset+20]!==0) return false;
      seenIHDR=true;
    }else if(type==='IHDR') return false;
    if(type==='IDAT'){
      if(seenIEND||idatClosed)return false;
      compressedSize+=length;
      // Limit compressed input as well as inflated output before Buffer.concat.
      if(compressedSize>64*1024*1024)return false;
      seenIDAT=true;compressed.push(bytes.subarray(offset+8,offset+8+length));
    }else if(seenIDAT){idatClosed=true;}
    if(type==='IEND'){if(length!==0||!seenIDAT||end!==bytes.length)return false;seenIEND=true;break;}
    if(type==='PLTE' && seenIDAT)return false;
    if(!['IHDR','IDAT','IEND'].includes(type) && type[0]===type[0].toUpperCase())return false;
    offset=end;
  }
  if(!seenIEND)return false;
  const expected=height*(1+width*4);
  try{
    const raw=inflateSync(Buffer.concat(compressed),{maxOutputLength:expected+1});
    if(raw.length!==expected)return false;
    for(let y=0;y<height;y++)if(raw[y*(1+width*4)]>4)return false;
    return true;
  }catch{return false;}
}

export async function validateNovaPngPack(directory) {
  const root=await realpath(resolve(directory));
  const manifestPath=resolve(root,'manifest.json');
  const manifestInfo=await lstat(manifestPath);
  if (!manifestInfo.isFile() || manifestInfo.isSymbolicLink() || await realpath(manifestPath)!==manifestPath) {
    throw new Error('Unsafe MOD manifest file');
  }
  const manifest=JSON.parse(await readFile(manifestPath,'utf8'));
  validateNovaModTemplate(manifest);
  const result=[];
  for (const layer of manifest.layers) {
    const path=resolve(root,layer.filename);
    if (!path.startsWith(root+sep)) throw new Error('Unsafe PNG layer path');
    // Reject symlinks, including links that point outside the pack root.
    const info=await lstat(path);
    if (!info.isFile() || info.isSymbolicLink() || await realpath(path)!==path) throw new Error('Unsafe PNG layer file: '+layer.slot);
    const bytes=await readFile(path);
    if (!validateRgbaPng(bytes,manifest.canvas.width,manifest.canvas.height)) {
      throw new Error('Invalid RGBA PNG layer: '+layer.slot);
    }
    result.push({slot:layer.slot,path,hidden:layer.hidden});
  }
  return {variant:manifest.variant,canvas:manifest.canvas,layers:result};
}

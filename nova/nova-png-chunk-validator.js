// Structural integrity checks for PNG MOD artwork. Does not inflate IDAT pixels.
const SIGNATURE = [137,80,78,71,13,10,26,10];
const u32 = (b,p) => (b[p]*0x1000000 + (b[p+1]<<16) + (b[p+2]<<8) + b[p+3]) >>> 0;
const crcTable = Array.from({length:256}, (_,n) => {
  for (let i=0;i<8;i++) n = n&1 ? (0xedb88320 ^ (n>>>1)) : n>>>1;
  return n>>>0;
});
function crc32(b,start,end) {
  let crc=0xffffffff;
  for (let i=start;i<end;i++) crc=crcTable[(crc^b[i])&255]^(crc>>>8);
  return (crc^0xffffffff)>>>0;
}
export function validateNovaPngChunks(bytes, options={}) {
  if (!(bytes instanceof Uint8Array)) throw new Error('PNG bytes required');
  const maxBytes=options.maxBytes??16*1024*1024;
  if (!Number.isSafeInteger(maxBytes)||maxBytes<45||bytes.length>maxBytes) throw new Error('PNG size exceeds limit');
  if (bytes.length<8 || !SIGNATURE.every((v,i)=>bytes[i]===v)) throw new Error('Invalid PNG signature');
  let pos=8, count=0, idat=0, ended=false, seenIDAT=false, idatClosed=false, seenPLTE=false;
  while(pos<bytes.length) {
    if (bytes.length-pos<12) throw new Error('Truncated PNG chunk');
    const length=u32(bytes,pos);
    if(length>bytes.length-pos-12) throw new Error('Truncated PNG chunk payload');
    const typeStart=pos+4, dataStart=pos+8, crcPos=dataStart+length;
    const type=String.fromCharCode(...bytes.subarray(typeStart,typeStart+4));
    if(!/^[A-Za-z]{4}$/.test(type)) throw new Error('Invalid PNG chunk type');
    if(crc32(bytes,typeStart,crcPos)!==u32(bytes,crcPos)) throw new Error('PNG CRC mismatch: '+type);
    if(count===0 && (type!=='IHDR'||length!==13)) throw new Error('PNG must begin with IHDR');
    if(count>0 && type==='IHDR') throw new Error('Duplicate PNG IHDR');
    if(type==='PLTE') {
      if(seenPLTE) throw new Error('Duplicate PNG PLTE');
      if(seenIDAT) throw new Error('PNG PLTE must precede IDAT');
      if(length===0 || length%3!==0 || length>768) throw new Error('Invalid PNG PLTE length');
      seenPLTE=true;
    }
    if(type==='IDAT') {
      if(idatClosed) throw new Error('Nonconsecutive PNG IDAT chunks');
      seenIDAT=true;idat++;
    } else if(seenIDAT) idatClosed=true;
    if(type==='IEND') {
      if(length!==0||!seenIDAT) throw new Error('Invalid PNG IEND');
      if(crcPos+4!==bytes.length) throw new Error('Trailing data after PNG IEND');
      ended=true;
    }
    if(type[0]===type[0].toUpperCase() && !['IHDR','PLTE','IDAT','IEND'].includes(type)) throw new Error('Unsupported critical PNG chunk: '+type);
    count++;pos=crcPos+4;
    if(ended) break;
  }
  if(!ended) throw new Error('Missing PNG IEND');
  return {chunkCount:count,idatChunks:idat,crcValid:true};
}

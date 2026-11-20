// Validate PNG structure and CRCs before embedding untrusted MOD assets.
const SIGNATURE=Buffer.from([137,80,78,71,13,10,26,10]);
function crc32(bytes){let crc=0xffffffff;for(const byte of bytes){crc^=byte;for(let i=0;i<8;i++)crc=(crc>>>1)^((crc&1)?0xedb88320:0);}return (crc^0xffffffff)>>>0;}
const DEPTHS={0:[1,2,4,8,16],2:[8,16],3:[1,2,4,8],4:[8,16],6:[8,16]};
export function validateNovaPng(bytes,label='PNG'){
 if(!Buffer.isBuffer(bytes)||bytes.length<45||!bytes.subarray(0,8).equals(SIGNATURE))throw new Error('Invalid PNG asset: '+label);
 let offset=8,first=true,ended=false,width=0,height=0,hasData=false,dataClosed=false,hasPalette=false,colorType=0;
 while(offset<bytes.length){
  if(bytes.length-offset<12)throw new Error('Invalid PNG chunk: '+label);
  const size=bytes.readUInt32BE(offset),end=offset+12+size;
  if(end>bytes.length||end<offset)throw new Error('Invalid PNG chunk: '+label);
  const type=bytes.toString('ascii',offset+4,offset+8);
  if(!/^[A-Za-z]{4}$/.test(type))throw new Error('Invalid PNG chunk: '+label);
  if(crc32(bytes.subarray(offset+4,offset+8+size))!==bytes.readUInt32BE(offset+8+size))throw new Error('Invalid PNG CRC: '+label);
  if(first){
   if(type!=='IHDR'||size!==13)throw new Error('Invalid PNG IHDR: '+label);
   width=bytes.readUInt32BE(offset+8);height=bytes.readUInt32BE(offset+12);
   colorType=bytes[offset+17];const depth=bytes[offset+16];
   if(!width||!height||width>8192||height>8192)throw new Error('Invalid PNG dimensions: '+label);
   if(!DEPTHS[colorType]?.includes(depth)||bytes[offset+18]!==0||bytes[offset+19]!==0||![0,1].includes(bytes[offset+20]))throw new Error('Invalid PNG IHDR: '+label);
  }else if(type==='IHDR')throw new Error('Duplicate PNG IHDR: '+label);
  if(type==='PLTE'){
   if(hasPalette||hasData||size===0||size%3!==0||size>768||[0,4].includes(colorType))throw new Error('Invalid PNG palette: '+label);
   hasPalette=true;
  }
  if(type==='IDAT'){
   if(dataClosed||size===0||(colorType===3&&!hasPalette))throw new Error('Invalid PNG IDAT: '+label);
   hasData=true;
  }else if(hasData)dataClosed=true;
  if(type==='IEND'){
   if(size!==0||end!==bytes.length||!hasData)throw new Error('Invalid PNG ending: '+label);
   ended=true;break;
  }
  // Unknown critical chunks cannot be safely interpreted by a PNG renderer.
  if(!['IHDR','PLTE','IDAT','IEND'].includes(type)&&type[0]===type[0].toUpperCase())throw new Error('Unsupported PNG chunk: '+label);
  offset=end;first=false;
 }
 if(!ended)throw new Error('Invalid PNG ending: '+label);
 return {width,height};
}

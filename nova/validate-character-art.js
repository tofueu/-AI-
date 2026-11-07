// Standalone art gate: a transparent template is not an acceptable finished outfit.
import {readFileSync,realpathSync} from 'node:fs';
import {resolve,dirname,relative,isAbsolute,sep} from 'node:path';
import {inflateSync} from 'node:zlib';

export function pngHasVisiblePixels(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 57 || !buffer.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))) throw new Error('Invalid PNG signature');
  if(buffer.length>16*1024*1024)throw new Error('PNG file exceeds 16 MiB art limit');
  const width=buffer.readUInt32BE(16),height=buffer.readUInt32BE(20);
  if (!width || !height || width*height>1048576 || buffer[24]!==8 || buffer[25]!==6 || buffer[26]!==0) throw new Error('Expected 8-bit RGBA PNG');
  let offset=8, chunks=[], ended=false;
  while(offset+12<=buffer.length){
    const len=buffer.readUInt32BE(offset),type=buffer.toString('ascii',offset+4,offset+8);
    if(len>8*1024*1024)throw new Error('PNG chunk exceeds 8 MiB limit');
    if(offset+12+len>buffer.length)throw new Error('Truncated PNG');
    if(type==='IDAT')chunks.push(buffer.subarray(offset+8,offset+8+len));
    offset+=12+len;
    if(type==='IEND'){
      if(len!==0)throw new Error('Invalid PNG end chunk');
      ended=true;break;
    }
  }
  if(!ended)throw new Error('Missing PNG end chunk');
  if(offset!==buffer.length)throw new Error('Trailing PNG data');
  if(!chunks.length)throw new Error('Missing PNG image data');
  const raw=inflateSync(Buffer.concat(chunks),{maxOutputLength:height*(1+width*4)});
  if(raw.length!==height*(1+width*4))throw new Error('Invalid PNG row length');
  const stride=width*4,prior=Buffer.alloc(stride),current=Buffer.alloc(stride);
  let pos=0,visible=false;
  for(let y=0;y<height;y++){
    const filter=raw[pos++];if(filter>4)throw new Error('Unsupported PNG filter');
    for(let x=0;x<stride;x++){
      const a=x>=4?current[x-4]:0,b=prior[x],c=x>=4?prior[x-4]:0;
      let predictor=0;
      if(filter===1)predictor=a;
      if(filter===2)predictor=b;
      if(filter===3)predictor=Math.floor((a+b)/2);
      if(filter===4){const p=a+b-c,pa=Math.abs(p-a),pb=Math.abs(p-b),pc=Math.abs(p-c);predictor=pa<=pb&&pa<=pc?a:pb<=pc?b:c;}
      current[x]=(raw[pos++]+predictor)&255;
      if(x%4===3 && current[x]>0)visible=true;
    }
    current.copy(prior);
  }
  return visible;
}

export function validateNovaOutfit(characterJsonPath){
  const file=realpathSync(resolve(characterJsonPath)),root=dirname(file),character=JSON.parse(readFileSync(file,'utf8'));
  const issues=[];
  for(const slot of ['top','bottom']){
    const src=character.safeOutfit?.[slot]?.src;
    if(typeof src!=='string'||!src) {issues.push(`${slot}: missing fallback`);continue;}
    const target=resolve(root,src),rel=relative(root,target);
    if(isAbsolute(rel)||rel==='..'||rel.startsWith('..'+sep)){issues.push(`${slot}: path escapes character directory`);continue;}
    try{
      const canonical=realpathSync(target),canonicalRel=relative(root,canonical);
      if(isAbsolute(canonicalRel)||canonicalRel==='..'||canonicalRel.startsWith('..'+sep)){
        issues.push(`${slot}: symlink path escapes character directory`);continue;
      }
      if(!pngHasVisiblePixels(readFileSync(canonical)))issues.push(`${slot}: fully transparent fallback`);
    }
    catch(e){issues.push(`${slot}: ${e.message}`);}
  }
  return {ok:issues.length===0,issues};
}
if(process.argv[1] && import.meta.url===new URL('file://'+resolve(process.argv[1])).href){
  const result=validateNovaOutfit(process.argv[2]);console.log(JSON.stringify(result,null,2));if(!result.ok)process.exitCode=1;
}

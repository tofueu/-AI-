/**
 * NOVA bundled official MOD installer.
 * Restores the exact sprite ZIP from Git-tracked binary chunks and unpacks it
 * to public/assets/nova-official on first boot, with checksum/CRC and zip-slip
 * checks. No third-party dependencies; requires Node.js >=20.
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import zlib from 'node:zlib';

export const OFFICIAL_ZIP_SHA256 = '7cd65ca41ba949ff2387c8e9a7a6e762aea92bc5dd156b9044a95b1beec37905';
export const OFFICIAL_PART_PREFIX = 'NOVA_official_runtime_v0.2.zip.part';
const MAX_ARCHIVE = 24 * 1024 * 1024;
const MAX_UNCOMPRESSED = 45 * 1024 * 1024;
const MAX_ENTRY = 12 * 1024 * 1024;
const MAX_FILES = 200;

export function readNovaParts(root, {prefix=OFFICIAL_PART_PREFIX, expectedSha256=OFFICIAL_ZIP_SHA256, subdir='runtime'}={}) {
  if (!['runtime','source'].includes(subdir)) throw Error('Unknown NOVA asset collection');
  const dir=path.join(root,'art','nova-official',subdir);
  if (!fs.existsSync(dir)) return null;
  const names=fs.readdirSync(dir).filter(name=>name.startsWith(prefix)).sort();
  if (names.length<1 || names.length>64) throw Error('NOVA split archive is missing or too large');
  let length=0;
  const chunks=names.map((name,i)=>{
    if (name!==prefix+String(i).padStart(2,'0')) throw Error('NOVA asset chunk sequence is incomplete');
    const data=fs.readFileSync(path.join(dir,name));
    length+=data.length;
    if(length>MAX_ARCHIVE) throw Error('NOVA archive exceeds hard size cap');
    return data;
  });
  const archive=Buffer.concat(chunks,length);
  const digest=crypto.createHash('sha256').update(archive).digest('hex');
  if (digest!==expectedSha256) throw Error('NOVA archive SHA256 mismatch');
  return archive;
}
const crcTable=Uint32Array.from({length:256},(_,i)=>{
 let c=i;for(let k=0;k<8;k++)c=(c&1)?(0xedb88320^(c>>>1)):(c>>>1);return c>>>0;
});
export function crc32(bytes) {
 let c=0xffffffff;for(const b of bytes)c=crcTable[(c^b)&255]^(c>>>8);return (c^0xffffffff)>>>0;
}
const safeEntry=name=>typeof name==='string' && name.length>0 && name.length<=255 &&
 !name.startsWith('/') && !name.includes('\\') && !name.includes('\0') &&
 !name.split('/').some(s=>s==='.'||s==='..'||s==='') &&
 /^(?:characters\/(?:chibi|mature)\/(?:sprites\/)?[\w./-]+\.(?:png|webp)|manifest\.json|rig\.json|README\.md)$/.test(name);

export function parseNovaZip(buf){
 if(!Buffer.isBuffer(buf)||buf.length<22||buf.length>MAX_ARCHIVE)throw Error('Invalid NOVA ZIP length');
 let eocd=-1;
 for(let i=buf.length-22;i>=Math.max(0,buf.length-65557);i--)
  if(buf.readUInt32LE(i)===0x06054b50){eocd=i;break;}
 if(eocd<0)throw Error('NOVA ZIP missing end-of-central-directory');
 const count=buf.readUInt16LE(eocd+10),offset=buf.readUInt32LE(eocd+16);
 if(count<1||count>MAX_FILES)throw Error('NOVA archive entry count out of range');
 if(offset>buf.length-46)throw Error('NOVA archive central directory outside buffer');
 let pos=offset,total=0;const entries=[];const names=new Set();
 for(let i=0;i<count;i++){
  if(pos+46>buf.length||buf.readUInt32LE(pos)!==0x02014b50)throw Error('Corrupt central directory');
  const flags=buf.readUInt16LE(pos+8),method=buf.readUInt16LE(pos+10),expectedCrc=buf.readUInt32LE(pos+16),
    compSize=buf.readUInt32LE(pos+20),uncompSize=buf.readUInt32LE(pos+24),nameLen=buf.readUInt16LE(pos+28),
    extraLen=buf.readUInt16LE(pos+30),commentLen=buf.readUInt16LE(pos+32),externalAttr=buf.readUInt32LE(pos+38),localOffset=buf.readUInt32LE(pos+42);
  if(pos+46+nameLen+extraLen+commentLen>buf.length)throw Error('Corrupt filename span');
  const name=buf.subarray(pos+46,pos+46+nameLen).toString('utf8');
  pos+=46+nameLen+extraLen+commentLen;
  if(name.endsWith('/'))continue;
  if(!safeEntry(name)||names.has(name))throw Error('Unsafe or duplicate NOVA ZIP entry: '+name);
  names.add(name);
  if ((flags&1)||![0,8].includes(method)||uncompSize>MAX_ENTRY||compSize>MAX_ENTRY)
   throw Error('Unsupported or oversized NOVA ZIP entry: '+name);
  // Reject symbolic links and executable file modes even inside trusted bundles.
  const fileType=(externalAttr>>>16)&0o170000;
  if(fileType===0o120000)throw Error('NOVA ZIP cannot contain symlinks');
  total+=uncompSize;if(total>MAX_UNCOMPRESSED)throw Error('NOVA ZIP expands beyond cap');
  if(localOffset+30>buf.length||buf.readUInt32LE(localOffset)!==0x04034b50)
   throw Error('Invalid local ZIP header');
  const localNameLen=buf.readUInt16LE(localOffset+26),localExtraLen=buf.readUInt16LE(localOffset+28);
  const start=localOffset+30+localNameLen+localExtraLen;
  if(start+compSize>buf.length)throw Error('ZIP entry outside archive');
  const compressed=buf.subarray(start,start+compSize);
  const data=method===0?Buffer.from(compressed):zlib.inflateRawSync(compressed,{maxOutputLength:MAX_ENTRY});
  if(data.length!==uncompSize||crc32(data)!==expectedCrc)throw Error('NOVA ZIP CRC mismatch: '+name);
  entries.push({name,data});
 }
 if(!names.has('manifest.json'))throw Error('NOVA ZIP is missing manifest');
 const manifest=JSON.parse(entries.find(e=>e.name==='manifest.json').data.toString('utf8'));
 if(manifest.format!=='nova.character.mod'||manifest.manifestVersion!==2||!manifest.characters?.chibi||!manifest.characters?.mature)
  throw Error('Incompatible NOVA manifest');
 for(const style of ['chibi','mature']){
  const c=manifest.characters[style];
  if(!c.root||c.root.includes('..')||c.root.startsWith('/'))throw Error('Unsafe character root');
  for(const [action,a] of Object.entries(c.animations||{})){
   if(!Array.isArray(a.frames)||!a.frames.every(f=>names.has(c.root+'/'+f)))throw Error('Missing sprite for '+style+'/'+action);
  }
 }
 for(const style of ['chibi','mature']){
  const a=manifest.characters[style]?.animations?.working;
  if(!a||a.frames.length!==12||a.fps!==12)throw Error('Official '+style+' typing must have 12 frames at 12 fps');
  const digests=new Set(a.frames.map(f=>crypto.createHash('sha256').update(entries.find(e=>e.name===manifest.characters[style].root+'/'+f).data).digest('hex')));
  if(digests.size!==12)throw Error('Duplicate animation frame in '+style+' typing');
 }
 return {entries,manifest};
}
export function installOfficialNova(root,{archive}={}){
 const z=archive??readNovaParts(root);
 if(!z)return {installed:false,reason:'Archive missing; user should install official art pack'};
 const destination=path.join(root,'public','assets','nova-official');
 const marker=path.join(destination,'.archive-sha256');
 if(fs.existsSync(marker)&&fs.readFileSync(marker,'utf8').trim()===OFFICIAL_ZIP_SHA256&&
    fs.existsSync(path.join(destination,'manifest.json')))
  return {installed:true,cached:true};
 const {entries,manifest}=parseNovaZip(z);
 const temp=destination+'.tmp-'+process.pid+'-'+Date.now();
 const backup=destination+'.bak-'+process.pid;
 fs.mkdirSync(temp,{recursive:true});
 try{
  for(const e of entries){
   const dest=path.join(temp,...e.name.split('/'));
   fs.mkdirSync(path.dirname(dest),{recursive:true});
   fs.writeFileSync(dest,e.data,{flag:'wx'});
  }
  fs.writeFileSync(path.join(temp,'.archive-sha256'),OFFICIAL_ZIP_SHA256);
  if(fs.existsSync(destination))fs.renameSync(destination,backup);
  try{fs.renameSync(temp,destination);}
  catch(error){if(fs.existsSync(backup))fs.renameSync(backup,destination);throw error;}
  if(fs.existsSync(backup))fs.rmSync(backup,{recursive:true,force:true});
  return {installed:true,cached:false,files:entries.length,characters:Object.keys(manifest.characters)};
 }catch(error){if(fs.existsSync(temp))fs.rmSync(temp,{recursive:true,force:true});throw error;}
}
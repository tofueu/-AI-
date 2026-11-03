import {deflateSync} from 'node:zlib';
import {mkdir,writeFile,unlink,access} from 'node:fs/promises';
import {join,resolve,sep} from 'node:path';
import {createNovaModTemplate,validateNovaModTemplate} from './mod-template.js';

function crc32(bytes){let crc=0xffffffff;for(const b of bytes){crc^=b;for(let i=0;i<8;i++)crc=(crc>>>1)^((crc&1)?0xedb88320:0);}return (crc^0xffffffff)>>>0;}
function chunk(type,data){const name=Buffer.from(type,'ascii'),size=Buffer.alloc(4),checksum=Buffer.alloc(4);size.writeUInt32BE(data.length);checksum.writeUInt32BE(crc32(Buffer.concat([name,data])));return Buffer.concat([size,name,data,checksum]);}
export function encodeBlankRgbaPng(width,height){
 if(!Number.isInteger(width)||!Number.isInteger(height)||width<1||height<1||width>4096||height>4096)throw new Error('Invalid PNG dimensions');
 const ihdr=Buffer.alloc(13);ihdr.writeUInt32BE(width,0);ihdr.writeUInt32BE(height,4);ihdr[8]=8;ihdr[9]=6;
 const raw=Buffer.alloc(height*(1+width*4));
 return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',ihdr),chunk('IDAT',deflateSync(raw)),chunk('IEND',Buffer.alloc(0))]);
}
export async function exportNovaBlankPngLayers(directory,variant,options={}){
 const manifest=createNovaModTemplate(variant,options);validateNovaModTemplate(manifest);
 const root=resolve(directory);await mkdir(root,{recursive:true});
 const paths=manifest.layers.map(layer=>{
  const destination=resolve(root,layer.filename);
  if(!destination.startsWith(root+sep))throw new Error('Unsafe PNG filename');
  return destination;
 });
 paths.push(join(root,'manifest.json'));
 // Reject an occupied output directory before creating any new layer.
 for(const destination of paths){
  try{await access(destination);const error=new Error('Output already exists: '+destination);error.code='EEXIST';throw error;}
  catch(error){if(error.code!=='ENOENT')throw error;}
 }
 const png=encodeBlankRgbaPng(manifest.canvas.width,manifest.canvas.height);
 const created=[];
 try{
  for(let i=0;i<manifest.layers.length;i++){
   await writeFile(paths[i],png,{flag:'wx'});created.push(paths[i]);
  }
  await writeFile(paths[paths.length-1],JSON.stringify(manifest,null,2)+'\n',{flag:'wx'});
  created.push(paths[paths.length-1]);
 }catch(error){
  await Promise.allSettled(created.map(path=>unlink(path)));
  throw error;
 }
 return manifest;
}

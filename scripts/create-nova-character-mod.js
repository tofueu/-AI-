#!/usr/bin/env node
/** Create a real editable MOD folder with 256px transparent PNG parts for artists.
 * Run: node scripts/create-nova-character-mod.js chibi ./MyCharacter
 * A blank template is NOT a completed, bound official NOVA illustration.
 */
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import {fileURLToPath} from 'node:url';
import {crc32} from '../nova-official-installer.js';
const ROOT=path.dirname(path.dirname(fileURLToPath(import.meta.url)));
export function blankPng(w=256,h=256){
 if(!Number.isInteger(w)||!Number.isInteger(h)||w<1||h<1||w>2048||h>2048)throw Error('Invalid size');
 const signature=Buffer.from([137,80,78,71,13,10,26,10]);
 const ihdr=Buffer.alloc(13);ihdr.writeUInt32BE(w,0);ihdr.writeUInt32BE(h,4);ihdr[8]=8;ihdr[9]=6;
 const pixels=Buffer.alloc((w*4+1)*h); // Filter 0 with clear RGBA for every row.
 const image=zlib.deflateSync(pixels,{level:9});
 function chunk(type,body){const tag=Buffer.from(type),length=Buffer.alloc(4),sum=Buffer.alloc(4);length.writeUInt32BE(body.length);sum.writeUInt32BE(crc32(Buffer.concat([tag,body])));return Buffer.concat([length,tag,body,sum]);}
 return Buffer.concat([signature,chunk('IHDR',ihdr),chunk('IDAT',image),chunk('IEND',Buffer.alloc(0))]);
}
export function createArtistTemplate(style,dest){
 if(!['chibi','mature'].includes(style))throw Error('Select chibi or mature');
 const folder=path.resolve(dest), src=path.join(ROOT,'templates','nova-character-mod',style);
 if(fs.existsSync(folder))throw Error('Output already exists; refused to overwrite artist files');
 const rig=JSON.parse(fs.readFileSync(path.join(src,'rig.json'),'utf8'));
 fs.mkdirSync(folder,{recursive:true});
 try{
  fs.writeFileSync(path.join(folder,'rig.json'),JSON.stringify(rig,null,2)+'\n');
  fs.copyFileSync(path.join(src,'README.md'),path.join(folder,'README.md'));
  // A change of hat/hair/eyes/clothing must not need a brand-new animation rig.
  // Generate every selectable appearance image as a transparent artist-editable template.
  const variantFiles=Object.values(rig.wardrobe||{}).flatMap(choices=>
    Object.values(choices).flatMap(overrides=>Object.values(overrides).filter(Boolean)));
  for(const file of new Set([...rig.parts.map(p=>p.file),...variantFiles])){
   const out=path.join(folder,file);
   fs.mkdirSync(path.dirname(out),{recursive:true});
   fs.writeFileSync(out,blankPng());
  }
 }catch(err){fs.rmSync(folder,{recursive:true,force:true});throw err;}
 return {folder,style,parts:rig.parts.length,wardrobe:Object.keys(rig.wardrobe||{})};
}
if(process.argv[1] && path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const style=process.argv[2],output=process.argv[3];
 if(!output){console.error('用法：npm run nova:create-character -- chibi ./MyCharacter');process.exitCode=1;}
 else {try{console.log(createArtistTemplate(style,output));}
 catch(err){console.error(err.message);process.exitCode=1;}}
}
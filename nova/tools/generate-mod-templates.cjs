#!/usr/bin/env node
'use strict';
const fs=require('node:fs'),path=require('node:path'),zlib=require('node:zlib');
const slots=['hair_back','body','base_clothes','bottom','top','outer','shoes','head','head_shape','face','eyes','mouth','hair_front','hat','accessory','full_character'];
const variants=['chibi','adult'],size=512;
function crc32(buf){let c=0xffffffff;for(const b of buf){c^=b;for(let k=0;k<8;k++)c=(c>>>1)^((c&1)?0xedb88320:0)}return(c^0xffffffff)>>>0}
function chunk(type,data){const name=Buffer.from(type),len=Buffer.alloc(4);len.writeUInt32BE(data.length);const crc=Buffer.alloc(4);crc.writeUInt32BE(crc32(Buffer.concat([name,data])));return Buffer.concat([len,name,data,crc])}
function transparentPng(){const ihdr=Buffer.alloc(13);ihdr.writeUInt32BE(size,0);ihdr.writeUInt32BE(size,4);ihdr[8]=8;ihdr[9]=6;const raw=Buffer.alloc(size*(1+size*4));return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',ihdr),chunk('IDAT',zlib.deflateSync(raw)),chunk('IEND',Buffer.alloc(0))])}
function generate(out){const png=transparentPng();const manifest={format:'nova-mod-template-v1',width:size,height:size,variants,slots,notes:'All layers share 512x512 coordinates. Empty PNG layers are hidden. Paint base_clothes for a real fallback; blank templates are not finished artwork.'};for(const variant of variants){const dir=path.join(out,variant);fs.mkdirSync(dir,{recursive:true});for(const slot of slots)fs.writeFileSync(path.join(dir,slot+'.png'),png)}fs.writeFileSync(path.join(out,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');return {files:variants.length*slots.length,pngBytes:png.length}}
if(require.main===module){const out=path.resolve(process.argv[2]||'nova-mod-templates');console.log(JSON.stringify({output:out,...generate(out)}))}
module.exports={generate,slots,variants,size,transparentPng};

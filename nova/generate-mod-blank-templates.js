// Generate transparent, correctly sized NOVA MOD drawing canvases without external dependencies.
// These are BLANK templates, not finished character artwork.
// Usage: node nova/generate-mod-blank-templates.js [output-directory]
import {mkdirSync,writeFileSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {deflateSync} from 'node:zlib';
import {pathToFileURL} from 'node:url';

export const NOVA_PARTS=Object.freeze(['body','head','eyes','mouth','front-hair','back-hair','hat','top','bottom','shoes','left-arm','right-arm','left-leg','right-leg','accessory']);
const DIMENSIONS={chibi:[512,512],adult:[512,768]};
const crcTable=Array.from({length:256},(_,n)=>{let c=n;for(let i=0;i<8;i++)c=c&1?0xedb88320^(c>>>1):c>>>1;return c>>>0;});
function crc32(buf){let c=0xffffffff;for(const b of buf)c=crcTable[(c^b)&255]^(c>>>8);return (c^0xffffffff)>>>0;}
function chunk(type,data){const tag=Buffer.from(type,'ascii');const len=Buffer.alloc(4);len.writeUInt32BE(data.length);const crc=Buffer.alloc(4);crc.writeUInt32BE(crc32(Buffer.concat([tag,data])));return Buffer.concat([len,tag,data,crc]);}
export function transparentPng(width,height){
  if(!Number.isInteger(width)||!Number.isInteger(height)||width<1||height<1||width*height>1048576)throw new Error('Invalid template dimensions');
  const header=Buffer.alloc(13);header.writeUInt32BE(width,0);header.writeUInt32BE(height,4);header[8]=8;header[9]=6;
  const rows=Buffer.alloc(height*(1+width*4)); // filter byte 0 and transparent RGBA
  return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',header),chunk('IDAT',deflateSync(rows)),chunk('IEND',Buffer.alloc(0))]);
}
export function generateNovaBlankTemplates(directory){
  const root=resolve(directory);
  const results=[];
  for(const [variant,[width,height]] of Object.entries(DIMENSIONS)){
    const folder=join(root,variant,'art');mkdirSync(folder,{recursive:true});
    for(const part of NOVA_PARTS){
      const path=join(folder,part+'.png');writeFileSync(path,transparentPng(width,height));results.push(path);
    }
    const base=Object.fromEntries(NOVA_PARTS.filter(p=>!['top','bottom','hat','accessory'].includes(p)).map(p=>[p,{src:'art/'+p+'.png'}]));
    const safeOutfit={top:{src:'art/top.png'},bottom:{src:'art/bottom.png'}};
    writeFileSync(join(root,variant,'character.json'),JSON.stringify({variant,base,safeOutfit,manifests:[],state:'idle'},null,2)+'\n');
  }
  writeFileSync(join(root,'README.txt'),'NOVA BLANK MOD DRAWING TEMPLATES\nEach PNG is transparent, not a finished character. Paint each layer while keeping canvas dimensions and alignment unchanged. top and bottom are required fallback clothing slots; replace them with opaque outfit artwork before visual acceptance. Import each variant/character.json into the standalone preview exporter. No AI Workbench dependency.\n');
  return results;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
  try{const paths=generateNovaBlankTemplates(process.argv[2]??'nova-mod-blank-templates');console.log('Generated '+paths.length+' transparent PNG canvases for chibi and adult');}
  catch(e){console.error(e.message);process.exitCode=1;}
}

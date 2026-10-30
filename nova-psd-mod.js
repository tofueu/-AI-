/** Local-only artist PSD -> reusable rigged NOVA MOD installer, no external binaries. */
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import zlib from 'node:zlib';
import crypto from 'node:crypto';
import {parseNovaPsd} from './public/nova-psd-parser.js';
import {crc32} from './nova-official-installer.js';
import {validateRig,worldMatrices} from './public/nova-rig-runtime.js';
const LIMIT_PSD=30*1024*1024;
const EXPOSED_RE=/^(?:parts|variants)\/(?:[\w-]+\/)*[\w-]+\.png$/;
const MOD_ID=/^[a-z0-9-]{8,64}$/;
export function encodeRgbaPng(width,height,rgba){
 if(!Number.isInteger(width)||!Number.isInteger(height)||width<1||height<1||width*height>2048*2048||rgba.length!==width*height*4)throw Error('Invalid RGBA image');
 const chunk=(name,data)=>{
  const head=Buffer.from(name,'ascii');const len=Buffer.alloc(4);len.writeUInt32BE(data.length);
  const crc=Buffer.alloc(4);crc.writeUInt32BE(crc32(Buffer.concat([head,data])));
  return Buffer.concat([len,head,data,crc]);
 };
 const IHDR=Buffer.alloc(13);IHDR.writeUInt32BE(width,0);IHDR.writeUInt32BE(height,4);IHDR[8]=8;IHDR[9]=6;
 const scanlines=Buffer.alloc((width*4+1)*height);
 for(let y=0;y<height;y++)Buffer.from(rgba.buffer,rgba.byteOffset+y*width*4,width*4).copy(scanlines,y*(width*4+1)+1);
 return Buffer.concat([Buffer.from('89504e470d0a1a0a','hex'),chunk('IHDR',IHDR),chunk('IDAT',zlib.deflateSync(scanlines,{level:6})),chunk('IEND',Buffer.alloc(0))]);
}
export function characterDir(root){return path.join(root,'data','nova-installed-mods');}
function ensureValidId(id){if(!MOD_ID.test(id))throw Error('Invalid character id');return id;}
export function readCharacter(root,id){
 ensureValidId(id);const p=path.join(characterDir(root),id,'rig.json');
 return JSON.parse(fs.readFileSync(p,'utf8'));
}
export function getActiveCharacter(root){
 const p=path.join(characterDir(root),'active.json');
 if(!fs.existsSync(p))return null;
 try {const a=JSON.parse(fs.readFileSync(p,'utf8'));return a?.id&&MOD_ID.test(a.id)&&fs.existsSync(path.join(characterDir(root),a.id,'rig.json'))?a.id:null;}catch{return null;}
}
export function setActiveCharacter(root,id){
 fs.mkdirSync(characterDir(root),{recursive:true});
 if(id!==null){ensureValidId(id);if(!fs.existsSync(path.join(characterDir(root),id,'rig.json')))throw Error('Character not installed');}
 const file=path.join(characterDir(root),'active.json');
 fs.writeFileSync(file,JSON.stringify({id,selectedAt:new Date().toISOString()},null,2));
 return id;
}
export function characterFile(root,id,file){
 ensureValidId(id);
 if(!EXPOSED_RE.test(file)||file.split('/').includes('..'))throw Error('Invalid layer filename');
 const parent=path.join(characterDir(root),id);
 const f=path.resolve(parent,...file.split('/'));
 if(!f.startsWith(parent+path.sep))throw Error('Path traversal');
 return f;
}
/** Install PSD and produce enough layer data for the existing movable bone runtime.
 * Layers must be painted over correct positions in the PSD template.
 */
export async function installPsdCharacter(root,psdBytes,style,{id=null}={}){
 if(!['chibi','mature'].includes(style))throw Error('請選擇 Q 版或成熟版');
 if(!Buffer.isBuffer(psdBytes)||psdBytes.length>LIMIT_PSD||psdBytes.length<100)throw Error('PSD 檔案大小不合法');
 const templatePath=path.join(root,'templates','nova-character-mod',style,'rig.json');
 const rig=validateRig(JSON.parse(fs.readFileSync(templatePath,'utf8')));
 const raw=await parseNovaPsd(psdBytes);
 if(raw.width!==rig.canvas[0]||raw.height!==rig.canvas[1])throw Error(`PSD 畫布必須是 ${rig.canvas[0]}×${rig.canvas[1]}（不可改尺寸）；目前是 ${raw.width}×${raw.height}`);
 const partById=new Map(rig.parts.map(p=>[p.id,p]));
 const rest=worldMatrices(rig,{});
 const planned=[];const warnings=[];const choices=new Map();
 let baseCount=0;
 for(const layer of raw.layers){
  const part=partById.get(layer.part);
  if(!part){warnings.push('忽略未知圖層：'+layer.name);continue;}
  let filename;
  if(layer.kind==='part'){
   filename=`parts/${part.id}.png`;
   baseCount++;
  }else{
   if(!rig.wardrobe?.[layer.category]?.[layer.option]){warnings.push('忽略未知換裝選項：'+layer.name);continue;}
   filename=`variants/${layer.category}/${layer.option}/${part.id}.png`;
   let item=choices.get(layer.category);if(!item){item=new Set();choices.set(layer.category,item);}item.add(layer.option);
  }
  const bone=rest[part.bone];
  // Base part and variant share exactly the same bone pivot.
  const pivot=[bone[4]-layer.left,bone[5]-layer.top];
  planned.push({layer,part,filename,pivot});
  if(layer.kind==='part'){
   part.file=filename;
   part.pivot=pivot;
  }else{rig.wardrobe[layer.category][layer.option][part.id]=filename;rig.variantPivots[filename]=pivot;}
 }
 if(baseCount<2 || !planned.some(x=>x.layer.kind==='part'&&x.part.id==='head') || !planned.some(x=>x.layer.kind==='part'&&x.part.id==='torso'))
  throw Error('至少需要在 PART__head 和 PART__torso 畫出非透明內容；目前模板仍是空白，不能安裝');
 // Missing part layers are not drawn: they remain slots for future art updates.
 const paintedParts=new Set(planned.filter(x=>x.layer.kind==='part').map(x=>x.part.id));
 if(paintedParts.size<rig.parts.length)warnings.push(`已繪製 ${paintedParts.size}/${rig.parts.length} 基礎部位。缺少部位不會憑空補畫，可能出現關節或服裝空缺。`);
 // No option should be selectable if it has no PNG drawn in PSD.
 for(const [category,options] of Object.entries(rig.wardrobe||{})){
  for(const option of Object.keys(options)){
   if(option===rig.defaultAppearance?.[category])continue;
   if(!choices.get(category)?.has(option))delete options[option];
  }
 }
 rig.name=`由單一 PSD 安裝的 ${style==='chibi'?'Q 版':'成熟版'}角色`;
 rig.source='artist-psd';
 validateRig(rig);
 const name=id||'nova-'+crypto.randomUUID();ensureValidId(name);
 const parent=characterDir(root),dest=path.join(parent,name);
 if(fs.existsSync(dest))throw Error('角色 ID 已存在，不會覆蓋畫師的角色');
 fs.mkdirSync(parent,{recursive:true});
 const temp=fs.mkdtempSync(path.join(parent,'.import-'));
 try{
  for(const {layer,filename} of planned){
   const filepath=path.join(temp,...filename.split('/'));
   fs.mkdirSync(path.dirname(filepath),{recursive:true});
   fs.writeFileSync(filepath,encodeRgbaPng(layer.width,layer.height,layer.pixels));
  }
  fs.writeFileSync(path.join(temp,'rig.json'),JSON.stringify(rig,null,2));
  fs.writeFileSync(path.join(temp,'original.psd'),psdBytes);
  fs.writeFileSync(path.join(temp,'import-report.json'),JSON.stringify({style,paintedParts:[...paintedParts],warnings,sourceSha256:crypto.createHash('sha256').update(psdBytes).digest('hex'),layerCount:raw.layerCount,at:new Date().toISOString()},null,2));
  fs.renameSync(temp,dest);
 }catch(error){fs.rmSync(temp,{recursive:true,force:true});throw error;}
 setActiveCharacter(root,name);
 return {ok:true,id:name,style,paintedParts:paintedParts.size,assets:planned.length,warningCount:warnings.length,warnings};
}
/** Browser-only local artist MOD import: folders, not arbitrary scripts or remote URLs. */
import {validateRig} from './nova-rig-runtime.js';
const MAX_FILES=150,MAX_IMAGE_BYTES=8*1024*1024,MAX_TOTAL=45*1024*1024;
const imageTypes=new Set(['image/png','image/webp','']);
const validRelative = p => typeof p==='string' && !p.includes('\\') &&
 /^(?:[\w -]+\/)*[\w -]+\.(?:png|webp|json)$/i.test(p) && !p.split('/').some(x=>x==='.'||x==='..');
/** Map a FileList to manifest relative paths; all assets must be in same folder. */
export function indexArtistFiles(files){
 const list=Array.from(files||[]);
 if(!list.length || list.length>MAX_FILES)throw Error('角色檔案數量必須介於 1–150');
 const rootFile=list.find(f=>f.webkitRelativePath?.endsWith('/rig.json')||f.name==='rig.json');
 if(!rootFile)throw Error('MOD 資料夾缺少 rig.json');
 const name=rootFile.webkitRelativePath||rootFile.name;
 const prefix=name.substring(0,name.length-'rig.json'.length);
 const map=new Map();let total=0;
 for(const f of list){
  const full=f.webkitRelativePath||f.name;
  if(!full.startsWith(prefix))continue;
  const rel=full.slice(prefix.length);
  if(!validRelative(rel))throw Error('MOD 檔案路徑不安全：'+rel);
  if(map.has(rel))throw Error('MOD 有重複檔名：'+rel);
  total+=f.size;
  if(f.size>MAX_IMAGE_BYTES||total>MAX_TOTAL)throw Error('角色素材過大');
  map.set(rel,f);
 }
 return map;
}
async function decodeImage(file){
 if(!imageTypes.has(file.type))throw Error('只接受 PNG / WebP 圖片');
 const bytes=new Uint8Array(await file.slice(0,12).arrayBuffer());
 const png=bytes.length>=8 && bytes.slice(0,8).join(',')==='137,80,78,71,13,10,26,10';
 const webp=bytes.length>=12 && String.fromCharCode(...bytes.slice(0,4))==='RIFF'&&String.fromCharCode(...bytes.slice(8,12))==='WEBP';
 if(!png&&!webp)throw Error('圖片格式與副檔名不一致：'+file.name);
 if(typeof createImageBitmap==='function')return createImageBitmap(file);
 const url=URL.createObjectURL(file);
 try{
  const image=new Image();image.src=url;
  await image.decode();return image;
 }finally{URL.revokeObjectURL(url);}
}
export async function importArtistRigFolder(files){
 const map=indexArtistFiles(files);
 const raw=map.get('rig.json');if(!raw)throw Error('找不到 MOD rig.json');
 let rig;
 try{rig=validateRig(JSON.parse(await raw.text()));}
 catch(e){throw Error('rig.json 無效：'+e.message);}
 const sources=[...new Set(rig.parts.map(p=>p.file))];
 if(sources.length<1)throw Error('角色需提供至少一個分層 PNG');
 for(const rel of sources){
  const file=map.get(rel);
  if(!file)throw Error('缺少部位圖片：'+rel);
  if(!/\.(png|webp)$/i.test(rel))throw Error('部位只接受 PNG/WebP');
 }
 const images=Object.create(null);
 try{
  await Promise.all(sources.map(async p=>{images[p]=await decodeImage(map.get(p));}));
 }catch(e){for(const i of Object.values(images))i.close?.();throw e;}
 return {rig,images,dispose(){for(const i of Object.values(images))i.close?.();}};
}
/** Reload locally installed PSD-derived layers after restarting Workbench.
 * Fetches from the user's own localhost Workbench, never an external provider.
 */
export async function loadInstalledPsdRig(id,{fetcher=fetch}={}){
 if(!/^[a-z0-9-]{8,64}$/.test(id))throw Error('不合法角色 ID');
 const prefix='/api/nova/characters/'+id;
 const response=await fetcher(prefix+'/rig',{cache:'no-store'});
 if(!response.ok)throw Error('找不到已安裝的角色骨架');
 const rig=validateRig(await response.json());
 const variantFiles=Object.values(rig.wardrobe||{}).flatMap(options=>
   Object.values(options).flatMap(o=>Object.values(o).filter(Boolean)));
 const names=[...new Set([...rig.parts.map(p=>p.file),...variantFiles])];
 const images=Object.create(null);
 const chunked=8;const all=[];
 try{
  for(let i=0;i<names.length;i+=chunked){
   await Promise.all(names.slice(i,i+chunked).map(async name=>{
    if(!validRelative(name))throw Error('角色圖片路徑不安全');
    const url=prefix+'/files/'+name.split('/').map(encodeURIComponent).join('/');
    const r=await fetcher(url);
    if(r.status===404)return; // unpainted optional component
    if(!r.ok)throw Error('角色圖片讀取失敗：'+name);
    const file=await r.blob();
    if(file.size>MAX_IMAGE_BYTES)throw Error('角色圖層過大');
    const image=await decodeImage(file);
    images[name]=image;all.push(image);
   }));
  }
  if(!images['parts/head.png']||!images['parts/torso.png'])throw Error('角色缺少頭與身體圖層');
  return {rig,images,dispose(){for(const image of all)image.close?.();}};
 }catch(error){for(const image of all)image.close?.();throw error;}
}

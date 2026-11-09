#!/usr/bin/env node
'use strict';
const fs=require('node:fs');
const path=require('node:path');
const {clips}=require('../rig/joint-animation.cjs');
const {renderCharacterFrame}=require('./render-character-frame.cjs');
const {packagePreviewAssets}=require('./package-preview-assets.cjs');
const VARIANTS=['chibi','adult'];
function exportCharacterPreview({variant='chibi',clip='idle',assets={},frames=12,outDir,baseDir=process.cwd()}={}){
 if(!VARIANTS.includes(variant)||!Object.hasOwn(clips,clip))throw new TypeError('Invalid variant or clip');
 if(!Number.isInteger(frames)||frames<2||frames>120)throw new RangeError('frames must be 2..120');
 if(typeof outDir!=='string'||!outDir.trim())throw new TypeError('outDir required');
 const duration=clips[clip].duration,dir=path.resolve(outDir);
 fs.mkdirSync(dir,{recursive:true});
 const packagedAssets=packagePreviewAssets(assets,dir,{baseDir});
 const files=[];
 for(let i=0;i<frames;i++){
  const name='frame-'+String(i).padStart(3,'0')+'.svg';
  fs.writeFileSync(path.join(dir,name),renderCharacterFrame(variant,clip,i*duration/frames,packagedAssets),'utf8');
  files.push(name);
 }
 const escaped=files.map(f=>JSON.stringify(f)).join(',');
 const html='<!doctype html><html lang="zh-Hant"><meta charset="utf-8"><title>NOVA '+variant+' '+clip+'</title><style>body{font:16px sans-serif;background:#eee;text-align:center}img{width:min(512px,95vw);height:auto;image-rendering:auto}</style><h1>NOVA '+variant+' / '+clip+'</h1><img id="preview" alt="NOVA animation preview" src="'+files[0]+'"><p>骨架及 MOD 圖層預覽，非正式角色美術</p><script>const frames=['+escaped+'];const img=document.getElementById("preview");let i=0;setInterval(()=>{i=(i+1)%frames.length;img.src=frames[i]},'+Math.round(duration/frames)+');</script></html>';
 fs.writeFileSync(path.join(dir,'index.html'),html,'utf8');
 fs.writeFileSync(path.join(dir,'manifest.json'),JSON.stringify({variant,clip,frames:files,durationMs:duration},null,2)+'\n','utf8');
 return {variant,clip,frameCount:frames,durationMs:duration,outDir:dir};
}
if(require.main===module){
 try{
  const [variant='chibi',clip='idle',outDir='nova-preview',assetsPath]=process.argv.slice(2);
  const assets=assetsPath?JSON.parse(fs.readFileSync(path.resolve(assetsPath),'utf8')):{};
  const baseDir=assetsPath?path.dirname(path.resolve(assetsPath)):process.cwd();
  console.log(JSON.stringify(exportCharacterPreview({variant,clip,outDir,assets,baseDir})));
 }catch(err){console.error(err.message);process.exitCode=1}
}
module.exports={exportCharacterPreview};

'use strict';
const fs=require('node:fs');
const path=require('node:path');
const {animatedSvg}=require('./export-animated-rig.cjs');
const {variants,clips}=require('../rig/joint-animation.cjs');
function galleryHtml(){
 const cards=Object.keys(variants).flatMap(variant=>Object.keys(clips).map(clip=>{
  const svg=animatedSvg(variant,clip);
  const src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg);
  return '<figure><img width="256" height="256" alt="'+variant+' '+clip+' skeleton animation" src="'+src+'"><figcaption>'+variant+' / '+clip+'</figcaption></figure>';
 })).join('\n');
 return '<!doctype html><html lang="zh-Hant"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>NOVA 骨架動畫驗收預覽</title><style>body{font:16px system-ui;background:#f7f3ff;color:#32234c;margin:2rem}main{display:grid;grid-template-columns:repeat(auto-fit,minmax(256px,1fr));gap:1rem}figure{margin:0;background:white;border-radius:16px;padding:1rem;text-align:center}img{max-width:100%;height:auto}figcaption{font-weight:600}p{max-width:65ch}</style><h1>NOVA 骨架動畫預覽</h1><p>僅供驗收關節運動與循環接縫；尚未綁定正式角色 PNG、服裝 MOD 或 PSD 圖層，不代表角色成品。</p><main>'+cards+'</main></html>\n';
}
function exportGallery(output){
 fs.mkdirSync(path.dirname(path.resolve(output)),{recursive:true});
 fs.writeFileSync(output,galleryHtml(),'utf8');
 return output;
}
if(require.main===module){try{console.log(exportGallery(process.argv[2]||path.join(process.cwd(),'nova-rig-gallery.html')))}catch(e){console.error(e.message);process.exitCode=1}}
module.exports={galleryHtml,exportGallery};

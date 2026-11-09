'use strict';
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
/**
 * Copy local MOD images into an exported preview so SVG hrefs keep working.
 * Remote URLs, data URIs and builtin identifiers are left to their resolvers.
 * Never rewrite original source files.
 */
function packagePreviewAssets(assets,outDir,{baseDir=process.cwd()}={}){
 if(!assets||typeof assets!=='object'||Array.isArray(assets))throw new TypeError('assets must be an object');
 const output={};
 const assetDir=path.join(path.resolve(outDir),'assets');
 for(const [slot,source] of Object.entries(assets)){
  if(typeof source!=='string'||!source.trim()){output[slot]=source;continue;}
  if(/^(?:https?:|data:|builtin:)/i.test(source)){output[slot]=source;continue;}
  if(/^[a-z][a-z0-9+.-]*:/i.test(source))throw new TypeError('Unsupported asset URL scheme for '+slot);
  const local=path.resolve(baseDir,source);
  const stat=fs.statSync(local);
  if(!stat.isFile())throw new TypeError('Asset is not a file: '+slot);
  const ext=path.extname(local).toLowerCase();
  if(!['.png','.jpg','.jpeg','.webp','.svg','.gif'].includes(ext))throw new TypeError('Unsupported image format for '+slot);
  fs.mkdirSync(assetDir,{recursive:true});
  const hash=crypto.createHash('sha256').update(fs.readFileSync(local)).digest('hex').slice(0,16);
  const name=hash+ext;
  fs.copyFileSync(local,path.join(assetDir,name));
  output[slot]='assets/'+name;
 }
 return output;
}
module.exports={packagePreviewAssets};

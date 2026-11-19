import {readFile,writeFile,mkdir,realpath} from 'node:fs/promises';
import {resolve,dirname,join,relative,isAbsolute,sep} from 'node:path';
import {composeNovaModSvg} from './nova-mod-svg-compositor.js';
import {validateNovaPng} from './nova-png-validation.js';

// Portable previews embed each referenced PNG instead of leaving broken relative links.
export async function exportPortableNovaPreviews(manifestPath,outputDirectory) {
 const manifestFile=resolve(manifestPath),root=await realpath(dirname(manifestFile));
 const manifest=JSON.parse(await readFile(manifestFile,'utf8'));
 if(!manifest||typeof manifest!=='object'||Array.isArray(manifest))throw new TypeError('Invalid MOD manifest');
 for(const key of Object.keys(manifest))if(!['chibi','adult'].includes(key))throw new Error('Unknown NOVA variant: '+key);
 const rendered=['chibi','adult'].map(variant=>({variant,...composeNovaModSvg(variant,manifest[variant]??{})}));
 const prepared=[];
 for(const {variant,svg,layers} of rendered){
  let portable=svg;
  for(const path of new Set(Object.values(layers).filter(v=>typeof v==='string'&&v.endsWith('.png')))){
   const full=await realpath(resolve(root,path));
   const rel=relative(root,full);
   if(rel==='..'||rel.startsWith('..'+sep)||isAbsolute(rel))throw new Error('PNG escapes MOD directory: '+path);
   const bytes=await readFile(full);
   validateNovaPng(bytes,path);
   const escaped=path.replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll("'",'&apos;');
   portable=portable.replaceAll('href="'+escaped+'"','href="data:image/png;base64,'+bytes.toString('base64')+'"');
  }
  prepared.push({variant,svg:portable});
 }
 const destination=resolve(outputDirectory);
 await mkdir(destination,{recursive:true});
 const outputs=[];
 for(const {variant,svg} of prepared){
  const file=join(destination,'nova-'+variant+'-portable.svg');
  await writeFile(file,svg+'\n','utf8');outputs.push(file);
 }
 return outputs;
}

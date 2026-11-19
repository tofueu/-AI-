import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {composeNovaModSvg} from './nova-mod-svg-compositor.js';

const VARIANTS=['chibi','adult'];
// Export a viewable SVG for each rig. JSON maps variant names to layer-path maps.
// The compositor validates layer names, PNG paths, and clothing fallbacks.
export async function exportNovaModPreviews(manifestPath,outputDirectory){
 if(typeof manifestPath!=='string'||!manifestPath.trim())throw new TypeError('Manifest path required');
 if(typeof outputDirectory!=='string'||!outputDirectory.trim())throw new TypeError('Output directory required');
 const parsed=JSON.parse(await readFile(resolve(manifestPath),'utf8'));
 if(!parsed||typeof parsed!=='object'||Array.isArray(parsed))throw new TypeError('Invalid MOD manifest');
 for(const key of Object.keys(parsed))if(!VARIANTS.includes(key))throw new Error('Unknown NOVA variant: '+key);
 // Validate all variants before writing any output.
 const previews=VARIANTS.map(variant=>({variant,...composeNovaModSvg(variant,parsed[variant]??{})}));
 const destination=resolve(outputDirectory);
 await mkdir(destination,{recursive:true});
 const files=[];
 for(const {variant,svg} of previews){
  const path=join(destination,`nova-${variant}-mod-preview.svg`);
  await writeFile(path,svg+'\n','utf8');
  files.push(path);
 }
 return files;
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const [, ,manifest,output='nova-mod-previews']=process.argv;
 exportNovaModPreviews(manifest,output).then(files=>files.forEach(file=>console.log(file))).catch(error=>{console.error(error);process.exitCode=1;});
}

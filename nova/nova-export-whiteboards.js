import {writeFile,mkdir} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createNovaLayerWhiteboard,createNovaWhiteboardManifest} from './nova-layer-whiteboard.js';

// Generate editable, transparent SVG source templates without touching existing art.
export async function exportNovaWhiteboards(outputDirectory) {
 if(typeof outputDirectory!=='string'||!outputDirectory.trim())throw new TypeError('Output directory required');
 const destination=resolve(outputDirectory);
 await mkdir(destination,{recursive:true});
 const files=[];
 for(const variant of ['chibi','adult']){
  const filename=`nova-${variant}-whiteboard.svg`;
  await writeFile(join(destination,filename),createNovaLayerWhiteboard(variant),'utf8');
  files.push(join(destination,filename));
 }
 const manifest=join(destination,'nova-whiteboard-manifest.json');
 await writeFile(manifest,JSON.stringify(createNovaWhiteboardManifest(),null,2)+'\n','utf8');
 files.push(manifest);
 return files;
}

if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const output=process.argv[2]??'nova-whiteboards';
 exportNovaWhiteboards(output).then(files=>files.forEach(file=>console.log(file))).catch(error=>{console.error(error);process.exitCode=1;});
}

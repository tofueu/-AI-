// Generate inspectable NOVA chibi/adult motion contact sheets without touching original art.
// Usage: node nova/export-motion-previews.js <output-directory>
import {mkdir, writeFile} from 'node:fs/promises';
import {resolve, join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {buildNovaPresetFrames} from './preset-frame-sequence.js';
import {renderNovaRigPreviewSvg} from './rig-preview-svg.js';

export async function exportNovaMotionPreviews(directory, {fps=8}={}) {
  if (typeof directory !== 'string' || !directory.trim()) throw new Error('Output directory required');
  if (!Number.isInteger(fps) || fps<1 || fps>30) throw new Error('Invalid preview FPS');
  const target=resolve(directory);
  await mkdir(target,{recursive:true});
  const outputs=[];
  for (const variant of ['chibi','adult']) {
    for (const action of ['idle','walk','typing','cry']) {
      const sampled=buildNovaPresetFrames({variant,action,fps});
      // Diagnostic renderer limits each contact sheet to 120 frames.
      const svg=renderNovaRigPreviewSvg({variant,action,frames:sampled.frames.slice(0,120)});
      const filename=variant+'-'+action+'-rig-preview.svg';
      await writeFile(join(target,filename),svg,{flag:'wx'});
      outputs.push(join(target,filename));
    }
  }
  return outputs;
}

if (process.argv[1] && import.meta.url===pathToFileURL(resolve(process.argv[1])).href) {
  exportNovaMotionPreviews(process.argv[2]).then(paths=>{
    for(const path of paths) console.log(path);
  }).catch(error=>{console.error(error.message);process.exitCode=1;});
}

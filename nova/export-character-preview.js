// Standalone NOVA character preview exporter. No AI Workbench dependency.
// Usage: node nova/export-character-preview.js character.json preview.svg
// JSON: { "variant":"chibi", "base":{}, "safeOutfit":{"top":{"src":"art/top.png"},"bottom":{"src":"art/bottom.png"}}, "manifests":[], "state":"running" }
// PNG references are resolved relative to the JSON file; source files are never modified.
import {readFileSync,writeFileSync,statSync,mkdirSync,realpathSync} from 'node:fs';
import {resolve,dirname,isAbsolute,relative,sep} from 'node:path';
import {pathToFileURL} from 'node:url';
import {composeNovaManifestFrame} from './manifest-frame.js';
import {renderNovaComposedAnimationSvg} from './composed-animation.js';

function artworkSources(config) {
  const sources=[];
  for(const part of Object.values(config.base ?? {})) if(part?.src) sources.push(part.src);
  for(const part of Object.values(config.safeOutfit ?? {})) if(part?.src) sources.push(part.src);
  for(const manifest of config.manifests ?? []) for(const part of Object.values(manifest.layers ?? {}))
    if(part?.operation==='replace' && part.src) sources.push(part.src);
  return sources;
}

export function exportNovaCharacterPreview(config,assetDirectory,{frames=12,durationMs=1200}={}) {
  if(!config || !['chibi','adult'].includes(config.variant)) throw new Error('Choose a Q or adult NOVA variant');
  if(!Number.isInteger(frames)||frames<2||frames>60) throw new Error('Invalid preview frame count');
  const root=realpathSync(resolve(assetDirectory));
  // Do not emit a misleading blank preview or SVG with broken image links.
  const sources=artworkSources(config);
  if(!sources.length) throw new Error('No character artwork was supplied');
  for(const src of sources) {
    if(typeof src!=='string' || !src.endsWith('.png') || /[\\\\%?#:\\x00-\\x1f]/.test(src) ||
       isAbsolute(src) || src.split('/').some(s=>!s||s==='.'||s==='..'))
      throw new Error('Unsafe character artwork path: '+src);
    const full=resolve(root,src);
    const rel=relative(root,full);
    if(rel.startsWith('..'+sep)||rel==='..'||isAbsolute(rel)) throw new Error('Artwork escapes character directory');
    // Resolve symlinks as well as lexical paths: a link inside the art folder\n    // must not be able to expose files outside the selected character pack.\n    let real;\n    try { real=realpathSync(full); } catch(error) {\n      if(error.code==='ENOENT') throw new Error('Missing character PNG: '+src);\n      throw error;\n    }\n    const realRel=relative(root,real);\n    if(realRel==='..'||realRel.startsWith('..'+sep)||isAbsolute(realRel))\n      throw new Error('Artwork symlink escapes character directory: '+src);\n    if(!statSync(real).isFile()) throw new Error('Missing character PNG: '+src);
  }
  const snapshots=Array.from({length:frames},(_,i)=>composeNovaManifestFrame({
    variant:config.variant,base:config.base??{},safeOutfit:config.safeOutfit??{},
    manifests:config.manifests??[],state:config.state??'running',
    elapsedSeconds:i*(durationMs/1000)/frames
  }));
  // SVG image hrefs remain relative to the JSON asset directory.
  return renderNovaComposedAnimationSvg(snapshots,{durationMs});
}

export function exportNovaCharacterPreviewFile(input,output) {
  const inputPath=resolve(input),outputPath=resolve(output);
  const config=JSON.parse(readFileSync(inputPath,'utf8'));
  const svg=exportNovaCharacterPreview(config,dirname(inputPath));
  // Rewrite relative PNG hrefs for the output SVG's directory.
  const outputDir=dirname(outputPath);
  const inputDir=dirname(inputPath);
  const rewritten=svg.replace(/href="([^"]+)"/g,(_,src)=>{
    const rel=relative(outputDir,resolve(inputDir,src)).split(sep).join('/');
    return 'href="'+rel.replace(/&/g,'&amp;').replace(/"/g,'&quot;')+'"';
  });
  mkdirSync(outputDir,{recursive:true});
  writeFileSync(outputPath,rewritten,'utf8');
  return outputPath;
}

if(process.argv[1] && import.meta.url===pathToFileURL(resolve(process.argv[1])).href) {
  try {
    if(process.argv.length!==4) throw new Error('Usage: node nova/export-character-preview.js character.json preview.svg');
    console.log('NOVA preview written: '+exportNovaCharacterPreviewFile(process.argv[2],process.argv[3]));
  } catch(error) {console.error(error.message);process.exitCode=1;}
}

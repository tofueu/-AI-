// Persist NOVA SVG animation frames atomically without touching artist PNGs.
import {mkdir, writeFile, rm, lstat} from 'node:fs/promises';
import {join, resolve} from 'node:path';
import {randomUUID} from 'node:crypto';

export async function writeNovaSvgSequence(sequence, outputDirectory) {
  if (!sequence || !['chibi','adult'].includes(sequence.variant) ||
      !Number.isFinite(sequence.fps) || sequence.fps <= 0 ||
      !Number.isFinite(sequence.duration) || sequence.duration <= 0 ||
      (sequence.action != null && (typeof sequence.action !== 'string' || !/^[a-z][a-z0-9_-]{0,63}$/i.test(sequence.action))) ||
      !Array.isArray(sequence.frames) || sequence.frames.length < 2 ||
      !sequence.frames.every((frame,i) => frame && frame.index===i &&
        frame.filename===`frame-${String(i).padStart(4,'0')}.svg` &&
        typeof frame.svg==='string' && /^\s*<svg(?:\s|>)/.test(frame.svg) &&
        Number.isFinite(frame.time) && frame.time>=0 && frame.time<=sequence.duration &&
        (i===0 ? frame.time===0 : frame.time>sequence.frames[i-1].time)))
    throw new Error('Invalid NOVA SVG sequence');
  if (typeof outputDirectory!=='string' || !outputDirectory.trim())
    throw new Error('Output directory required');
  const target=resolve(outputDirectory);
  try { await lstat(target); throw new Error('Output directory already exists'); } catch (error) { if (error.code !== 'ENOENT') throw error; }
  const staging=target+'.nova-tmp-'+randomUUID();
  await mkdir(staging,{recursive:false});
  try {
    for (const frame of sequence.frames)
      await writeFile(join(staging,frame.filename),frame.svg,{flag:'wx'});
    const manifest={
      format:'nova-svg-sequence-v1',variant:sequence.variant,
      action:sequence.action??null,fps:sequence.fps,duration:sequence.duration,
      frames:sequence.frames.map(({index,time,filename})=>({index,time,filename}))
    };
    await writeFile(join(staging,'manifest.json'),JSON.stringify(manifest,null,2)+'\n',{flag:'wx'});
    // mkdir target parent is caller responsibility; never replace an existing pack.
    const {rename}=await import('node:fs/promises');
    await rename(staging,target);
    return {directory:target,manifest};
  } catch(error) {
    await rm(staging,{recursive:true,force:true});
    throw error;
  }
}

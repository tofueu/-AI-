// Validate actual PNG frame bytes; a manifest alone cannot prove animation exists.
import {readFile, realpath} from 'node:fs/promises';
import {resolve, relative, isAbsolute, sep} from 'node:path';
import {createHash} from 'node:crypto';
import {assessNovaAnimationReadiness} from './animation-readiness.js';

const PNG = Buffer.from([137,80,78,71,13,10,26,10]);
export async function verifyNovaFrameAssets(root, variant, clips, requiredActions) {
  const metadata = assessNovaAnimationReadiness(variant, clips, requiredActions);
  const failures = [...metadata.failures];
  const base = resolve(root);
  const realBase = await realpath(base);
  const seen = new Map();
  for (const clip of clips) {
    if (!clip || !Array.isArray(clip.frames)) continue;
    for (const frame of clip.frames) {
      if (!frame || typeof frame.asset !== 'string') continue;
      const asset = frame.asset;
      if (!asset || asset.includes('\\') || asset.split('/').includes('..') || asset.includes('\0')) {
        failures.push(`${clip.action}: unsafe asset path`); continue;
      }
      const path = resolve(base, asset);
      const rel = relative(base, path);
      if (!rel || rel === '..' || rel.startsWith('..' + sep) || isAbsolute(rel)) {
        failures.push(`${clip.action}: asset outside root`); continue;
      }
      try {
        const actual = await realpath(path);
        const actualRel = relative(realBase, actual);
        if (!actualRel || actualRel === '..' || actualRel.startsWith('..' + sep) || isAbsolute(actualRel)) {
          failures.push(`${clip.action}: asset symlink outside root ${asset}`); continue;
        }
        const data = await readFile(actual);
        if (data.length < 33 || !data.subarray(0,8).equals(PNG) ||
            data.toString('ascii',12,16) !== 'IHDR' ||
            data.readUInt32BE(16) === 0 || data.readUInt32BE(20) === 0) {
          failures.push(`${clip.action}: invalid PNG ${asset}`); continue;
        }
        const hash = createHash('sha256').update(data).digest('hex');
        const key = clip.action + ':' + hash;
        if (seen.has(key)) failures.push(`${clip.action}: identical PNG content in ${seen.get(key)} and ${asset}`);
        else seen.set(key, asset);
      } catch {
        failures.push(`${clip.action}: missing or unreadable PNG ${asset}`);
      }
    }
  }
  return {variant, ready: failures.length === 0, failures, checkedAssets: seen.size};
}

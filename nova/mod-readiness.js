// Artwork readiness is independent of runtime clothing fallback: a template
// must not be called a finished character just because fallback can render it.
import {pathToFileURL} from 'node:url';

export function assessNovaModReadiness(pack) {
  if (!pack || !['chibi','adult'].includes(pack.variant) || !Array.isArray(pack.layers))
    throw new Error('Invalid validated NOVA pack');
  const visible = new Set();
  for (const layer of pack.layers) {
    if (!layer || typeof layer.slot !== 'string' || typeof layer.hidden !== 'boolean')
      throw new Error('Invalid validated NOVA layer');
    if (!layer.hidden) visible.add(layer.slot);
  }
  const missing = [];
  if (!visible.has('body')) missing.push('body');
  if (!visible.has('head')) missing.push('head');
  if (!visible.has('dress')) {
    if (!visible.has('top')) missing.push('top');
    if (!visible.has('bottom')) missing.push('bottom');
  }
  return {variant:pack.variant,ready:missing.length===0,missing,visibleSlots:[...visible].sort()};
}

// Usage: node nova/mod-readiness.js /path/to/chibi-or-adult-mod
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const directory = process.argv[2];
  if (!directory) {
    console.error('Usage: node nova/mod-readiness.js <MOD-directory>');
    process.exitCode=2;
  } else {
    try {
      const {validateNovaPngPack}=await import('./mod-pack-validator.js');
      const result=assessNovaModReadiness(await validateNovaPngPack(directory));
      console.log(JSON.stringify(result,null,2));
      if (!result.ready) process.exitCode=1;
    } catch (error) {
      console.error('MOD validation failed:',error.message);
      process.exitCode=2;
    }
  }
}

// Audit both independent NOVA artwork variants without modifying source packs.
import {pathToFileURL} from 'node:url';
import {validateNovaPngPack} from './mod-pack-validator.js';
import {assessNovaModReadiness} from './mod-readiness.js';

export async function auditNovaArtwork({chibi,adult}, validate=validateNovaPngPack) {
  const result={ready:false,variants:{}};
  for(const variant of ['chibi','adult']) {
    const directory=variant==='chibi'?chibi:adult;
    if(typeof directory!=='string'||!directory.trim()) {
      result.variants[variant]={ready:false,error:'Missing MOD directory'};
      continue;
    }
    try {
      const pack=await validate(directory);
      if(pack.variant!==variant) throw new Error(`Expected ${variant} MOD, got ${pack.variant}`);
      result.variants[variant]=assessNovaModReadiness(pack);
    } catch(error) {
      result.variants[variant]={ready:false,error:error instanceof Error?error.message:String(error)};
    }
  }
  result.ready=Object.values(result.variants).every(entry=>entry.ready);
  return result;
}

// Usage: node nova/mod-audit.js /path/to/chibi /path/to/adult
if(process.argv[1] && import.meta.url===pathToFileURL(process.argv[1]).href) {
  const result=await auditNovaArtwork({chibi:process.argv[2],adult:process.argv[3]});
  console.log(JSON.stringify(result,null,2));
  if(!result.ready) process.exitCode=1;
}

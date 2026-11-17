// Combined artwork gate: a finished NOVA release needs both independent variants.
import {pathToFileURL} from 'node:url';
import {assessNovaModReadiness} from './mod-readiness.js';

export function assessNovaPairReadiness(chibiPack,adultPack) {
  const chibi=assessNovaModReadiness(chibiPack);
  const adult=assessNovaModReadiness(adultPack);
  if(chibi.variant!=='chibi'||adult.variant!=='adult')
    throw new Error('Expected chibi pack followed by adult pack');
  return {ready:chibi.ready&&adult.ready,variants:{chibi,adult}};
}

// Usage: node nova/dual-variant-readiness.js <chibi-MOD-dir> <adult-MOD-dir>
if(process.argv[1] && import.meta.url===pathToFileURL(process.argv[1]).href) {
  const [chibiDir,adultDir]=process.argv.slice(2);
  if(!chibiDir||!adultDir) {
    console.error('Usage: node nova/dual-variant-readiness.js <chibi-MOD-dir> <adult-MOD-dir>');
    process.exitCode=2;
  } else {
    try {
      const {validateNovaPngPack}=await import('./mod-pack-validator.js');
      const result=assessNovaPairReadiness(await validateNovaPngPack(chibiDir),await validateNovaPngPack(adultDir));
      console.log(JSON.stringify(result,null,2));
      if(!result.ready)process.exitCode=1;
    } catch(error) {
      console.error('NOVA pair validation failed:',error.message);
      process.exitCode=2;
    }
  }
}

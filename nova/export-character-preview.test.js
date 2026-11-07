import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {exportNovaCharacterPreview,exportNovaCharacterPreviewFile} from './export-character-preview.js';

// Minimal valid PNG bytes are sufficient: exporter validates file presence,
// while a real image viewer remains responsible for pixel rendering.
const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScL/nwAAAABJRU5ErkJggg==','base64');
for(const variant of ['chibi','adult']) {
  test('standalone '+variant+' preview renders frames and portable SVG',()=>{
    const dir=mkdtempSync(join(tmpdir(),'nova-preview-'));
    try {
      mkdirSync(join(dir,'art'));
      for(const name of ['body','top','bottom']) writeFileSync(join(dir,'art',name+'.png'),png);
      const config={variant,base:{body:{src:'art/body.png'}},
        safeOutfit:{top:{src:'art/top.png'},bottom:{src:'art/bottom.png'}},
        manifests:[],state:'running'};
      const svg=exportNovaCharacterPreview(config,dir,{frames:4,durationMs:400});
      assert.match(svg,/<animate attributeName="visibility"/);
      assert.equal((svg.match(/<g visibility=/g)||[]).length,4);
      assert.match(svg,/art\/body\.png/);
      const input=join(dir,'character.json'),output=join(dir,'out','preview.svg');
      writeFileSync(input,JSON.stringify(config));
      exportNovaCharacterPreviewFile(input,output);
      const portable=readFileSync(output,'utf8');
      assert.match(portable,/\.\.\/art\/body\.png/);
      assert.match(portable,/\.\.\/art\/top\.png/);
      assert.match(portable,/\.\.\/art\/bottom\.png/);
    } finally {rmSync(dir,{recursive:true,force:true});}
  });
}
test('missing source image must fail instead of producing broken preview',()=>{
  const dir=mkdtempSync(join(tmpdir(),'nova-preview-'));
  try {
    const config={variant:'chibi',base:{body:{src:'art/missing.png'}},safeOutfit:{}};
    assert.throws(()=>exportNovaCharacterPreview(config,dir),/ENOENT|Missing character PNG/);
  } finally {rmSync(dir,{recursive:true,force:true});}
});
test('traversal paths must be rejected',()=>{
  assert.throws(()=>exportNovaCharacterPreview({variant:'adult',base:{body:{src:'../outside.png'}}},tmpdir()),/Unsafe character artwork path/);
});

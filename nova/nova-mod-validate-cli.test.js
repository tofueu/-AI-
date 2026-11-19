import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp, mkdir, writeFile, symlink, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {validateNovaModDirectory} from './nova-mod-validate-cli.js';

const slots = ['body','head','eyes','mouth','hairBack','hairFront','outfit','hat','accessory','armL','armR','legL','legR'];
const manifest = () => ({schemaVersion:1,variant:'chibi',canvas:{width:512,height:512},
  slots,requiredSlots:['body','head','outfit'],layers:Object.fromEntries(slots.map(s=>[s,null]))});
async function fixture(fn) {
  const root=await mkdtemp(join(tmpdir(),'nova-mod-'));
  try { await mkdir(join(root,'artwork')); await fn(root); }
  finally { await rm(root,{recursive:true,force:true}); }
}
async function save(root,m) { await writeFile(join(root,'manifest.json'),JSON.stringify(m)); }
test('empty template loads with base character fallback',async()=>{
  await fixture(async root=>{
    await save(root,manifest());
    const report=await validateNovaModDirectory(root);
    assert.equal(report.valid,true);
    assert.deepEqual(report.needsBase,['body','head','outfit']);
  });
});
test('missing declared visible optional PNG is rejected',async()=>{
  await fixture(async root=>{
    const m=manifest();m.layers.hat={path:'artwork/hat.png',visible:true};await save(root,m);
    const report=await validateNovaModDirectory(root);
    assert.equal(report.valid,false);
    assert.equal(report.errors[0].slot,'hat');
  });
});
test('symlink escaping package root is refused before reading PNG',async()=>{
  await fixture(async root=>{
    const m=manifest();m.layers.head={path:'artwork/head.png',visible:true};await save(root,m);
    const outside=await mkdtemp(join(tmpdir(),'nova-outside-'));
    try {
      await writeFile(join(outside,'head.png'),new Uint8Array(33));
      await symlink(join(outside,'head.png'),join(root,'artwork/head.png'));
      await assert.rejects(validateNovaModDirectory(root),/symlink escapes/);
    } finally {await rm(outside,{recursive:true,force:true});}
  });
});

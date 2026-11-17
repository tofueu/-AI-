import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp, mkdir, writeFile, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {verifyNovaFrameAssets} from './verify-frame-assets.js';
const png = seed => {
  const b = Buffer.alloc(33);
  Buffer.from([137,80,78,71,13,10,26,10]).copy(b);
  b.writeUInt32BE(13,8); b.write('IHDR',12,'ascii');
  b.writeUInt32BE(seed,16); b.writeUInt32BE(1,20); b[24]=8; b[25]=6;
  return b;
};
const clips = () => ['idle','walk','type'].map(action => ({
  action, frames: [0,1,2].map(index => ({index,asset:`${action}-${index}.png`,durationMs:120}))
}));
test('missing PNGs fail even when manifest passes', async () => {
  const dir = await mkdtemp(join(tmpdir(),'nova-'));
  try {
    const result = await verifyNovaFrameAssets(dir,'chibi',clips());
    assert.equal(result.ready,false);
    assert.equal(result.failures.length,9);
  } finally { await rm(dir,{recursive:true,force:true}); }
});
test('duplicate bytes fail even with different filenames', async () => {
  const dir = await mkdtemp(join(tmpdir(),'nova-'));
  try {
    for (const clip of clips()) for (const frame of clip.frames)
      await writeFile(join(dir,frame.asset),png(frame.index + 1));
    const result = await verifyNovaFrameAssets(dir,'adult',clips());
    assert.equal(result.ready,true);
    await writeFile(join(dir,'idle-1.png'),png(1));
    assert.equal((await verifyNovaFrameAssets(dir,'adult',clips())).ready,false);
  } finally { await rm(dir,{recursive:true,force:true}); }
});
test('reject traversal paths', async () => {
  const dir = await mkdtemp(join(tmpdir(),'nova-'));
  try {
    const manifest=clips(); manifest[0].frames[0].asset='../outside.png';
    const result=await verifyNovaFrameAssets(dir,'chibi',manifest);
    assert.ok(result.failures.some(x=>x.includes('unsafe asset path')));
  } finally { await rm(dir,{recursive:true,force:true}); }
});

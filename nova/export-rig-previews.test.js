import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { exportRigPreviews } from './export-rig-previews.js';

test('exports distinct playable chibi and adult SVG rig previews', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'nova-rig-'));
  try {
    const outputs = await exportRigPreviews(join(dir, 'nested'));
    assert.deepEqual(outputs.map(item => item.variant), ['chibi', 'adult']);
    const svgs = await Promise.all(outputs.map(item => readFile(item.path, 'utf8')));
    for (let i = 0; i < svgs.length; i++) {
      assert.ok(outputs[i].frames > 1);
      assert.match(svgs[i], /<svg /);
      assert.match(svgs[i], /repeatCount="indefinite"/);
      assert.match(svgs[i], new RegExp(`NOVA ${outputs[i].variant} animated rig`));
    }
    assert.notEqual(svgs[0], svgs[1]);
    const gallery = await readFile(join(dir, 'nested', 'index.html'), 'utf8');
    assert.match(gallery, /nova-chibi-typing-rig\\.svg/);
    assert.match(gallery, /nova-adult-typing-rig\\.svg/);
    assert.match(gallery, /非正式角色美術/);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('rejects missing output directory without writing files', async () => {
  await assert.rejects(exportRigPreviews(''), TypeError);
});

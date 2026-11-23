import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { exportRigPreviews } from './export-rig-previews.js';
import { verifyRigPreviews } from './verify-rig-previews.js';

test('exported Q/adult SVGs match disk manifest and gallery', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'nova-verify-'));
  try {
    await exportRigPreviews(dir);
    assert.deepEqual(await verifyRigPreviews(dir), { verified: ['adult', 'chibi'], previews: 2 });
    const file = join(dir, 'nova-chibi-typing-rig.svg');
    await writeFile(file, (await readFile(file, 'utf8')) + 'tampered');
    await assert.rejects(verifyRigPreviews(dir), /Corrupt diagnostic preview/);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('rejects missing or malformed output directories', async () => {
  await assert.rejects(verifyRigPreviews(''), TypeError);
  const dir = await mkdtemp(join(tmpdir(), 'nova-verify-'));
  try {
    await writeFile(join(dir, 'manifest.json'), JSON.stringify({schemaVersion: 1, artifactType:'rig-diagnostic-only', previews:[{variant:'../escape'}]}));
    await assert.rejects(verifyRigPreviews(dir), TypeError);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

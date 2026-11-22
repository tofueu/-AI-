import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { exportNovaWhiteboards } from './export-mod-whiteboards.js';

test('exports 28 separate editable SVG templates and manifest for each rig', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'nova-templates-'));
  try {
    const first = await exportNovaWhiteboards(dir);
    assert.equal(first.written.length, 58);
    assert.equal(first.skipped.length, 0);
    for (const variant of ['chibi', 'adult']) {
      const manifest = JSON.parse(await readFile(join(dir, variant, 'manifest.json'), 'utf8'));
      assert.equal(manifest.slots.length, 28);
      assert.equal(manifest.variant, variant);
      const svg = await readFile(join(dir, variant, 'hair_front.svg'), 'utf8');
      assert.match(svg, /artwork-hair_front/);
      assert.match(svg, /pivot-guide/);
    }
    const existing = join(dir, 'chibi', 'hair_front.svg');
    await writeFile(existing, 'ARTIST WORK');
    const second = await exportNovaWhiteboards(dir);
    assert.equal(second.written.length, 0);
    assert.equal(second.skipped.length, 58);
    assert.equal(await readFile(existing, 'utf8'), 'ARTIST WORK');
    const third = await exportNovaWhiteboards(dir, { overwrite: true });
    assert.equal(third.written.length, 58);
    assert.match(await readFile(existing, 'utf8'), /artwork-hair_front/);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('rejects invalid destination and overwrite flag', async () => {
  await assert.rejects(exportNovaWhiteboards(''), /directory/i);
  await assert.rejects(exportNovaWhiteboards('/tmp/nova', { overwrite: 'yes' }), /overwrite/i);
});

test('refuses symbolic-link overwrite to protect artist files outside export root', async t => {
  const { symlink } = await import('node:fs/promises');
  const dir = await mkdtemp(join(tmpdir(), 'nova-symlink-'));
  const outside = await mkdtemp(join(tmpdir(), 'nova-artist-'));
  try {
    await exportNovaWhiteboards(dir);
    const target = join(dir, 'chibi', 'hair_front.svg');
    const artist = join(outside, 'artist.svg');
    await writeFile(artist, 'ORIGINAL ART');
    await rm(target);
    try { await symlink(artist, target); }
    catch (error) {
      if (['EPERM', 'EACCES', 'ENOTSUP'].includes(error.code)) { t.skip('symlinks unavailable'); return; }
      throw error;
    }
    await assert.rejects(exportNovaWhiteboards(dir, { overwrite: true }), /symbolic-link/);
    assert.equal(await readFile(artist, 'utf8'), 'ORIGINAL ART');
  } finally {
    await rm(dir, { recursive: true, force: true });
    await rm(outside, { recursive: true, force: true });
  }
});

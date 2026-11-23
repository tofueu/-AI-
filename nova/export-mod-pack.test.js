import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, writeFile, symlink, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { exportNovaModPack } from './export-mod-pack.js';
import { makeNovaModWhiteboardManifest } from './mod-pack.js';

test('exports both SVG variants, manifest and referenced PNG files', async t => {
  const root = await mkdtemp(join(tmpdir(), 'nova-export-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const packDir = join(root, 'pack');
  const output = join(root, 'output');
  await mkdir(join(packDir, 'hair'), { recursive: true });
  await writeFile(join(packDir, 'hair', 'front.png'), 'PNG fixture');
  const pack = makeNovaModWhiteboardManifest();
  pack.variants.chibi.layers.hair = 'hair/front.png';
  await writeFile(join(packDir, 'manifest.json'), JSON.stringify(pack));
  assert.deepEqual(await exportNovaModPack(join(packDir, 'manifest.json'), output),
    ['nova-chibi-mod.svg', 'nova-adult-mod.svg']);
  assert.equal(await readFile(join(output, 'hair', 'front.png'), 'utf8'), 'PNG fixture');
  assert.match(await readFile(join(output, 'nova-chibi-mod.svg'), 'utf8'), /hair\/front.png/);
  assert.doesNotMatch(await readFile(join(output, 'nova-adult-mod.svg'), 'utf8'), /hair\/front.png/);
  assert.deepEqual(JSON.parse(await readFile(join(output, 'mod-pack.json'), 'utf8')), pack);
});

test('rejects missing PNGs without creating output', async t => {
  const root = await mkdtemp(join(tmpdir(), 'nova-export-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const pack = makeNovaModWhiteboardManifest();
  pack.variants.chibi.layers.hair = 'missing.png';
  const packDir = join(root, 'pack');
  await mkdir(packDir);
  const manifest = join(packDir, 'manifest.json');
  await writeFile(manifest, JSON.stringify(pack));
  await assert.rejects(exportNovaModPack(manifest, join(root, 'out')), /ENOENT/);
});

test('rejects PNG symlinks escaping the MOD directory', async t => {
  const root = await mkdtemp(join(tmpdir(), 'nova-export-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const packDir = join(root, 'pack');
  await mkdir(packDir);
  await writeFile(join(root, 'secret.png'), 'outside');
  await symlink(join(root, 'secret.png'), join(packDir, 'linked.png'));
  const pack = makeNovaModWhiteboardManifest();
  pack.variants.adult.layers.hair = 'linked.png';
  const manifest = join(packDir, 'manifest.json');
  await writeFile(manifest, JSON.stringify(pack));
  await assert.rejects(exportNovaModPack(manifest, join(root, 'out')), /escapes pack directory/);
});

test('refuses output inside or above source pack to protect original assets', async t => {
  const root = await mkdtemp(join(tmpdir(), 'nova-overlap-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const packDir = join(root, 'pack');
  await mkdir(packDir);
  const manifest = join(packDir, 'manifest.json');
  await writeFile(manifest, JSON.stringify(makeNovaModWhiteboardManifest()));
  for (const output of [packDir, join(packDir, 'nested'), root]) {
    await assert.rejects(exportNovaModPack(manifest, output), /must not overlap/);
  }
  assert.equal(await readFile(manifest, 'utf8'),
    JSON.stringify(makeNovaModWhiteboardManifest()));
});

test('rejects output symlink redirecting writes into source pack', async t => {
  const root = await mkdtemp(join(tmpdir(), 'nova-output-link-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const packDir = join(root, 'pack');
  await mkdir(packDir);
  const manifest = join(packDir, 'manifest.json');
  const original = JSON.stringify(makeNovaModWhiteboardManifest());
  await writeFile(manifest, original);
  await symlink(packDir, join(root, 'output'));
  await assert.rejects(exportNovaModPack(manifest, join(root, 'output')), /symbolic link/);
  assert.equal(await readFile(manifest, 'utf8'), original);
});

test('rejects existing symlink at an output asset destination', async t => {
  const root = await mkdtemp(join(tmpdir(), 'nova-output-asset-link-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const packDir = join(root, 'pack');
  const output = join(root, 'output');
  await mkdir(packDir);
  await mkdir(output);
  await writeFile(join(packDir, 'hair.png'), 'fixture');
  const protectedFile = join(root, 'protected.txt');
  await writeFile(protectedFile, 'unchanged');
  await symlink(protectedFile, join(output, 'hair.png'));
  const pack = makeNovaModWhiteboardManifest();
  pack.variants.chibi.layers.hair = 'hair.png';
  const manifest = join(packDir, 'manifest.json');
  await writeFile(manifest, JSON.stringify(pack));
  await assert.rejects(exportNovaModPack(manifest, output), /symbolic link/);
  assert.equal(await readFile(protectedFile, 'utf8'), 'unchanged');
});

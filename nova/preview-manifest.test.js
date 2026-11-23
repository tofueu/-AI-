import test from 'node:test';
import assert from 'node:assert/strict';
import { buildPreviewManifest } from './preview-manifest.js';

const svg = '<svg xmlns="http://www.w3.org/2000/svg"></svg>';
const assets = [
  { variant: 'chibi', filename: 'nova-chibi-typing-rig.svg', svg, frames: 20 },
  { variant: 'adult', filename: 'nova-adult-typing-rig.svg', svg, frames: 24 }
];

test('manifest includes both variants and reproducible SHA256', () => {
  const result = buildPreviewManifest(assets);
  assert.equal(result.artifactType, 'rig-diagnostic-only');
  assert.equal(result.previews.length, 2);
  assert.equal(result.previews[0].sha256.length, 64);
  assert.deepEqual(result, buildPreviewManifest(assets));
});

test('rejects duplicate variants and malformed assets', () => {
  assert.throws(() => buildPreviewManifest([assets[0], assets[0]]), TypeError);
  assert.throws(() => buildPreviewManifest([{ ...assets[0], svg: 'bad' }, assets[1]]), TypeError);
});

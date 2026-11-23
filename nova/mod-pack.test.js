import test from 'node:test';
import assert from 'node:assert/strict';
import { makeNovaModWhiteboardManifest, renderNovaModPack, validateNovaModPack } from './mod-pack.js';

test('whiteboard supports both character proportions and default clothing', () => {
  const pack = makeNovaModWhiteboardManifest();
  assert.deepEqual(Object.keys(pack.variants), ['chibi', 'adult']);
  for (const variant of ['chibi','adult']) {
    const svg = renderNovaModPack(pack, variant);
    assert.match(svg, /nova-slot-outfit/);
    assert.match(svg, /#9b82c7/);
    assert.match(svg, /nova-slot-hair"[^>]*display="none"/);
  }
});
test('replaces independent PNG slots', () => {
  const pack = makeNovaModWhiteboardManifest();
  pack.variants.chibi.layers.hair = 'hair/front.png';
  pack.variants.chibi.layers.outfit = 'clothes/coat.png';
  const svg = renderNovaModPack(pack, 'chibi');
  assert.match(svg, /hair\/front.png/);
  assert.match(svg, /clothes\/coat.png/);
  assert.doesNotMatch(renderNovaModPack(pack,'adult'), /hair\/front.png/);
});
test('full character is exclusive and allowed for adult', () => {
  const pack = makeNovaModWhiteboardManifest();
  pack.variants.adult.fullCharacter = 'characters/adult.png';
  assert.match(renderNovaModPack(pack,'adult'), /nova-full-character/);
  pack.variants.adult.layers.hat = 'hat.png';
  assert.throws(() => validateNovaModPack(pack), /cannot mix/);
});
test('rejects traversal, absolute paths and unsupported slots', () => {
  for (const path of ['../bad.png','/root.png','foo//bar.png','a/./b.png','https://host/a.png','file.svg']) {
    const pack = makeNovaModWhiteboardManifest();
    pack.variants.chibi.layers.hair = path;
    assert.throws(() => validateNovaModPack(pack), /Invalid relative PNG path/, path);
  }
  const pack = makeNovaModWhiteboardManifest();
  pack.variants.chibi.layers.unknown = 'a.png';
  assert.throws(() => validateNovaModPack(pack), /Unknown NOVA MOD slot/);
});
test('rejects missing variants and unsupported schema', () => {
  assert.throws(() => validateNovaModPack({schemaVersion:2,variants:{chibi:{}}}), /Invalid NOVA/);
  assert.throws(() => validateNovaModPack({schemaVersion:1,variants:{}}), /no variants/);
  assert.throws(() => renderNovaModPack(makeNovaModWhiteboardManifest(),'giant'), /Unknown NOVA variant/);
});

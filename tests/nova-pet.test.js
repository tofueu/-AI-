import { test } from 'node:test';
import assert from 'node:assert/strict';
import { writeFileSync, unlinkSync } from 'node:fs';
import { resolve } from 'node:path';
import { NovaPetEngine, NOVA_STATES } from '../lib/nova-pet.js';

test('NovaPetEngine initializes with defaults and state transitions correctly', () => {
  const pet = new NovaPetEngine();
  assert.equal(pet.state, 'IDLE');
  assert.equal(pet.visible, true);

  for (const state of NOVA_STATES) {
    assert.equal(pet.setState(state), state);
  }

  assert.throws(() => pet.setState('INVALID_STATE'), /Invalid NOVA state/);
});

test('NovaPetEngine loads valid MOD manifest and fails on invalid path/structure', () => {
  const pet = new NovaPetEngine();
  const tmpPath = resolve(process.cwd(), 'tests/tmp-mod-manifest.json');

  const validManifest = {
    name: 'test-costume',
    version: '1.0.0',
    layers: ['base.png', 'costume.png']
  };

  writeFileSync(tmpPath, JSON.stringify(validManifest));

  try {
    const loaded = pet.loadModManifest(tmpPath);
    assert.equal(loaded.name, 'test-costume');
    assert.equal(pet.getRenderState().hasMod, true);
  } finally {
    unlinkSync(tmpPath);
  }

  assert.throws(() => pet.loadModManifest('/nonexistent/path.json'), /MOD manifest file not found/);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {resolveModLayers} from './mod-layer-policy.js';

const base = [{slot:'body',src:'base/body.png'},{slot:'outfit',src:'base/outfit.png'},{slot:'hair',src:'base/hair.png'}];

test('replaces hair while preserving original source objects', () => {
 const mod = [{slot:'hair',src:'mods/hair.png'}];
 const result = resolveModLayers({baseLayers:base,modLayers:mod});
 assert.equal(result[2].src,'mods/hair.png');
 assert.equal(base[2].src,'base/hair.png');
 assert.equal(mod[0].hidden,undefined);
});
test('empty clothing replacement retains base clothing', () => {
 const result = resolveModLayers({baseLayers:base,modLayers:[{slot:'outfit',src:''},{slot:'body',hidden:true,src:'mods/body.png'}]});
 assert.equal(result[0].src,'base/body.png');
 assert.equal(result[1].src,'base/outfit.png');
 assert.equal(result[0].hidden,false);
});
test('empty optional layers become hidden', () => {
 const result = resolveModLayers({baseLayers:base,modLayers:[{slot:'hair',src:''},{slot:'hat',src:''}]});
 assert.equal(result[2].hidden,true);
 assert.equal(result[3].hidden,true);
});
test('rejects duplicate slots and invalid sources', () => {
 assert.throws(()=>resolveModLayers({baseLayers:base,modLayers:[{slot:'hair',src:'a'},{slot:'hair',src:'b'}]}),/Duplicate/);
 assert.throws(()=>resolveModLayers({baseLayers:[{slot:'body',src:4}]}),/Invalid layer source/);
});

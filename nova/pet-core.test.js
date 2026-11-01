import test from 'node:test';
import assert from 'node:assert/strict';
import {NovaPetController,resolvePetState,validatePetManifest} from './pet-core.js';
const manifest={id:'nova-official-q',renderer:'skeleton',actions:{idle:{keyframes:[{}]},working:{keyframes:[{}]}}};
test('status mapping',()=>{assert.equal(resolvePetState('running'),'working');assert.equal(resolvePetState('failed'),'error');});
test('manifest contract',()=>{assert.equal(validatePetManifest(manifest),true);assert.throws(()=>validatePetManifest({...manifest,renderer:'unknown'}));});
test('quiet work mode and fallback',()=>{const pet=new NovaPetController({manifest});pet.setTaskStatus('running');assert.equal(pet.interact('pet'),false);assert.equal(pet.getAction(),manifest.actions.working);pet.setTaskStatus('done');assert.equal(pet.interact('pet'),true);assert.equal(pet.getAction(),manifest.actions.idle);});

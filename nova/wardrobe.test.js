import test from 'node:test';
import assert from 'node:assert/strict';
import {createWardrobe,switchWardrobe} from './wardrobe.js';
const catalog={chibi:{characters:['official','violet'],outfits:['default','winter']},adult:{characters:['official','violet'],outfits:['default','formal']}};
test('switching clothes preserves character and body variant',()=>{
 const initial=createWardrobe({character:'violet'});
 assert.deepEqual(switchWardrobe(initial,{outfit:'winter'},catalog),{variant:'chibi',character:'violet',outfit:'winter'});
 assert.equal(initial.outfit,'default');
});
test('switching body variant selects its own default outfit',()=>{
 const chibi=createWardrobe({character:'violet',outfit:'winter'});
 assert.deepEqual(switchWardrobe(chibi,{variant:'adult'},catalog),{variant:'adult',character:'official',outfit:'default'});
});
test('switching character resets outfit but preserves variant',()=>{
 assert.deepEqual(switchWardrobe(createWardrobe({outfit:'winter'}),{character:'violet'},catalog),{variant:'chibi',character:'violet',outfit:'default'});
});
test('rejects incompatible costumes, missing catalogs and unsafe ids',()=>{
 assert.throws(()=>switchWardrobe(createWardrobe(),{outfit:'formal'},catalog),/Outfit unavailable/);
 assert.throws(()=>switchWardrobe(createWardrobe(),{variant:'adult'},{}),/Missing wardrobe catalog/);
 assert.throws(()=>createWardrobe({character:'../bad'}),/Invalid character/);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {validateNovaPng} from './nova-png-validation.js';
const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGP4////fwAJ+wP9KobjigAAAABJRU5ErkJggg==','base64');
test('valid PNG dimensions',()=>assert.deepEqual(validateNovaPng(png),{width:1,height:1}));
test('truncated PNG rejected',()=>assert.throws(()=>validateNovaPng(png.subarray(0,24)),/Invalid PNG/));
test('corrupt chunk CRC rejected',()=>{const corrupt=Buffer.from(png);corrupt[29]^=1;assert.throws(()=>validateNovaPng(corrupt),/CRC/);});
test('trailing bytes rejected',()=>assert.throws(()=>validateNovaPng(Buffer.concat([png,Buffer.from([1])])),/ending/));
test('non PNG rejected',()=>assert.throws(()=>validateNovaPng(Buffer.from('invalid')),/Invalid PNG/));

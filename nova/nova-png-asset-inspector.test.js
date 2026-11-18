import test from 'node:test';
import assert from 'node:assert/strict';
import {inspectNovaPngAsset} from './nova-png-asset-inspector.js';
const canvas = {width:512,height:512};
function header(width=512,height=512,type=6) {
  const b = new Uint8Array(33);
  b.set([137,80,78,71,13,10,26,10,0,0,0,13,73,72,68,82]);
  const view = new DataView(b.buffer);
  view.setUint32(16,width); view.setUint32(20,height);
  b.set([8,type,0,0,0],24);
  return b;
}
test('accepts correctly sized RGBA PNG header',()=>assert.equal(inspectNovaPngAsset(header(),canvas).colorType,'RGBA'));
test('rejects non PNG data',()=>assert.throws(()=>inspectNovaPngAsset(new Uint8Array(33),canvas),/signature/));
test('rejects truncated header',()=>assert.throws(()=>inspectNovaPngAsset(new Uint8Array(8),canvas),/signature/));
test('rejects wrong dimensions',()=>assert.throws(()=>inspectNovaPngAsset(header(256),canvas),/canvas mismatch/));
test('rejects opaque RGB layers',()=>assert.throws(()=>inspectNovaPngAsset(header(512,512,2),canvas),/alpha/));
test('rejects oversized files',()=>assert.throws(()=>inspectNovaPngAsset(header(),canvas,{maxBytes:32}),/size exceeds/));
test('rejects invalid dimensions',()=>assert.throws(()=>inspectNovaPngAsset(header(0),canvas),/dimensions/));
test('rejects invalid IHDR',()=>{const b=header();b[12]=0;assert.throws(()=>inspectNovaPngAsset(b,canvas),/IHDR/)});

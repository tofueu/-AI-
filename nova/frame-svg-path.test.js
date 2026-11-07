import test from 'node:test';
import assert from 'node:assert/strict';
import {renderNovaFrameSvg} from './frame-svg.js';

const frame = src => ({variant:'chibi',layers:[{src,transform:{x:0,y:0,rotation:0}}]});

test('renders a safe relative PNG with escaped XML attributes',()=>{
  const svg=renderNovaFrameSvg(frame('art/hair.png'));
  assert.match(svg,/href="art\/hair\.png"/);
  assert.match(svg,/<svg /);
});
test('rejects unsafe paths from untrusted base or fallback artwork',()=>{
  for(const src of [
    '../secret.png','art/../secret.png','/absolute.png','//host/a.png',
    'https://host/a.png','data:image/png;base64,AAAA','C:\\art\\a.png',
    '\\\\server\\share\\a.png','art\\hair.png','art/%2e%2e/hair.png',
    'art/hair.png?x=1','art/hair.png#x','art//hair.png','./art.png',
    'art/hair.svg',' art/hair.png','art/hair.png '
  ]) assert.throws(()=>renderNovaFrameSvg(frame(src)),/Invalid NOVA draw layer/,src);
});
test('preserves chibi and adult variants and rejects invalid canvas',()=>{
  for(const variant of ['chibi','adult']) {
    assert.match(renderNovaFrameSvg({...frame('body.png'),variant}),new RegExp('NOVA '+variant));
  }
  assert.throws(()=>renderNovaFrameSvg(frame('body.png'),{width:Infinity}),/canvas size/);
});

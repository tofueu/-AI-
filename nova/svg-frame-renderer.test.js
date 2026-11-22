import test from 'node:test';
import assert from 'node:assert/strict';
import {renderLayerFrameSvg,renderAnimationSvgFrames} from './svg-frame-renderer.js';

test('renders Q and adult bound layers in stable order with transforms',()=>{
  for (const variant of ['chibi','adult']) {
    const layers=[{slot:'body',src:variant+'/body.png',pivot:{x:12,y:20},transform:{x:3,y:4,rotation:15,scaleX:1,scaleY:1}},{slot:'hair',src:variant+'/hair.png'}];
    const before=JSON.stringify(layers);
    const svg=renderLayerFrameSvg({layers,width:256,height:384});
    assert.match(svg,/viewBox="0 0 256 384"/);
    assert.match(svg,/translate\(15 24\) rotate\(15\)/);
    assert.ok(svg.indexOf('body.png')<svg.indexOf('hair.png'));
    assert.equal(JSON.stringify(layers),before);
  }
});
test('hides empty and disabled layers',()=>{
  const svg=renderLayerFrameSvg({width:64,height:64,layers:[{src:'empty.png',empty:true},{src:'hidden.png',hidden:true},{src:'off.png',visible:false},{src:'ok.png'}]});
  assert.doesNotMatch(svg,/empty.png|hidden.png|off.png/);
  assert.match(svg,/ok.png/);
});
test('escapes SVG attributes and rejects unsafe sources',()=>{
  const svg=renderLayerFrameSvg({width:10,height:10,layers:[{src:'assets/a&b"c.png'}]});
  assert.match(svg,/a&amp;b&quot;c.png/);
  assert.throws(()=>renderLayerFrameSvg({width:10,height:10,layers:[{src:'javascript:alert(1)'}]}),/source/);
  assert.throws(()=>renderLayerFrameSvg({width:10,height:10,layers:[{src:'https://example.com/a.png'}]}),/source/);
});
test('renders each animation frame without dropping timestamps',()=>{
  const result=renderAnimationSvgFrames({width:80,height:80,frames:[{index:0,timeMs:0,layers:[{src:'a.png'}]},{index:1,timeMs:100,layers:[{src:'b.png'}]}]});
  assert.deepEqual(result.map(x=>x.timeMs),[0,100]);
  assert.match(result[1].svg,/b.png/);
});
test('rejects invalid geometry and excessive frame count',()=>{
  assert.throws(()=>renderLayerFrameSvg({width:Infinity,height:100,layers:[]}),/width/);
  assert.throws(()=>renderLayerFrameSvg({width:100,height:100,layers:[{src:'a.png',transform:{rotation:NaN}}]}),/rotation/);
  assert.throws(()=>renderAnimationSvgFrames({width:100,height:100,frames:[]}),/frames/);
});

test('rejects remote, traversal, non-PNG and ambiguous SVG image paths', () => {
  const rejected = ['../secret.png', 'a/../secret.png', './a.png', '//cdn.example/a.png',
    '/absolute/a.png', 'data:image/png;base64,AAAA', 'file:///tmp/a.png',
    'assets\\\\a.png', 'assets/a.png?x=1', 'assets/a.png#fragment',
    'assets//a.png', 'assets/a.svg', 'assets/a.png\\n'];
  for (const src of rejected) {
    assert.throws(() => renderLayerFrameSvg({width:32,height:32,layers:[{src}]}), /source/, src);
  }
  assert.match(renderLayerFrameSvg({width:32,height:32,layers:[{src:'assets/ok.PNG'}]}), /ok.PNG/);
});

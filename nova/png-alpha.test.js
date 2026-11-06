import test from 'node:test';
import assert from 'node:assert/strict';
import {isFullyTransparentRgba} from './png-alpha.js';
for(const filter of [0,1,2,3,4]) test('transparent RGBA filter '+filter,()=>{
  assert.equal(isFullyTransparentRgba(Uint8Array.from([filter,255,0,0,0,0,255,0,0]),2,1),true);
});
test('visible alpha prevents blank classification',()=>assert.equal(isFullyTransparentRgba(Uint8Array.from([0,0,0,0,255]),1,1),false));
test('invalid dimensions are rejected',()=>assert.throws(()=>isFullyTransparentRgba(new Uint8Array(0),0,1)));

test('all PNG filters reconstruct transparent alpha across multiple rows',()=>{
  const width=3,height=3,stride=width*4;
  const pixels=[
    Uint8Array.from([10,20,30,0, 40,50,60,0, 70,80,90,0]),
    Uint8Array.from([90,80,70,0, 60,50,40,0, 30,20,10,0]),
    Uint8Array.from([1,2,3,0, 4,5,6,0, 7,8,9,0])
  ];
  const paeth=(a,b,c)=>{
    const p=a+b-c,da=Math.abs(p-a),db=Math.abs(p-b),dc=Math.abs(p-c);
    return da<=db&&da<=dc?a:db<=dc?b:c;
  };
  for(let filter=0;filter<=4;filter++){
    const raw=new Uint8Array(height*(stride+1));
    for(let y=0;y<height;y++){
      const start=y*(stride+1);raw[start]=filter;
      for(let i=0;i<stride;i++){
        const left=i>=4?pixels[y][i-4]:0,up=y?pixels[y-1][i]:0,ul=y&&i>=4?pixels[y-1][i-4]:0;
        const predictor=[0,left,up,Math.floor((left+up)/2),paeth(left,up,ul)][filter];
        raw[start+1+i]=(pixels[y][i]-predictor+256)&255;
      }
    }
    assert.equal(isFullyTransparentRgba(raw,width,height),true,'filter '+filter);
    // A nonzero alpha in the final row must never be mistaken for an empty layer.
    const painted=pixels.map(row=>Uint8Array.from(row));painted[2][11]=255;
    const altered=new Uint8Array(raw);
    const index=2*(stride+1)+1+11;
    altered[index]=(painted[2][11]-([0,painted[2][7],pixels[1][11],Math.floor((painted[2][7]+pixels[1][11])/2),paeth(painted[2][7],pixels[1][11],pixels[1][7])][filter])+256)&255;
    assert.equal(isFullyTransparentRgba(altered,width,height),false,'painted filter '+filter);
  }
});

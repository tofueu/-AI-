import test from 'node:test';
import assert from 'node:assert/strict';
import {createNovaPlayback} from './playback.js';

for(const variant of ['chibi','adult']) {
  test(variant+' playback renders interpolated frames and stops cleanly',()=>{
    const calls=[],pending=new Map();
    let next=0;
    const ctx={save(){},restore(){},setTransform(...v){calls.push(['transform',...v]);},drawImage(img){calls.push(['image',img]);}};
    const rig={variant,bones:['body'],animations:[{name:'idle',durationMs:1000,loop:false,tracks:[{bone:'body',keyframes:[{timeMs:0,x:0},{timeMs:1000,x:20}]}]}]};
    const playback=createNovaPlayback({ctx,images:{'safe.png':{}},rig,base:{top:{src:'original.png'}},mods:[{variant,layers:{top:{operation:'hide'}}}],safeOutfit:{top:{src:'safe.png'}},motionName:'idle',requestFrame:fn=>{pending.set(++next,fn);return next;},cancelFrame:id=>pending.delete(id)});
    playback.start();
    playback.start();
    assert.equal(pending.size,1);
    const advance=t=>{const [id,fn]=pending.entries().next().value;pending.delete(id);fn(t);};
    advance(100);
    advance(600);
    assert.equal(calls.filter(c=>c[0]==='image').length,2);
    assert.equal(calls.filter(c=>c[0]==='transform')[1][5],0);
    assert.equal(calls.filter(c=>c[0]==='transform')[1][1],0);
    assert.equal(calls.filter(c=>c[0]==='transform')[1][4],10);
    playback.stop();
    assert.equal(pending.size,0);
    assert.equal(playback.running,false);
  });
}
test('failed preflight stops playback and reports error',()=>{
  let callback,reported;
  const playback=createNovaPlayback({ctx:{save(){},restore(){},setTransform(){},drawImage(){}},images:{},rig:{variant:'chibi',bones:['body'],animations:[{name:'idle',durationMs:100,tracks:[]}]},base:{top:{src:'missing.png'}},motionName:'idle',requestFrame:fn=>(callback=fn,1),cancelFrame(){},onError:e=>reported=e});
  playback.start();
  callback(0);
  assert.match(reported.message,/Missing decoded image/);
  assert.equal(playback.running,false);
});

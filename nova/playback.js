// Drive NOVA's frame composer on a canvas without mutating source art.
// The host injects scheduling and decoded images so this also works in tests.
import {createNovaModFrame} from './mod-frame.js';
import {drawNovaCommands} from './layer-renderer.js';

export function createNovaPlayback({ctx,images,rig,base,mods=[],safeOutfit={},motionName,slotBones,requestFrame,cancelFrame,onError}={}) {
  if(typeof requestFrame!=='function'||typeof cancelFrame!=='function') throw new Error('Missing animation scheduler');
  if(!rig||!motionName) throw new Error('Missing NOVA rig or motion');
  let running=false,handle=null,started=null,generation=0;
  function render(timeMs) {
    const frame=createNovaModFrame({rig,base,mods,safeOutfit,motionName,timeMs,slotBones});
    drawNovaCommands(ctx,frame,images);
    return frame;
  }
  function tick(timestamp,token) {
    if(!running||token!==generation) return;
    handle=null;
    try {
      if(!Number.isFinite(timestamp)) throw new Error('Invalid animation timestamp');
      if(started===null) started=timestamp;
      render(Math.max(0,timestamp-started));
    } catch(error) {
      stop();
      if(typeof onError==='function') onError(error);
      else throw error;
      return;
    }
    if(running&&token===generation) handle=requestFrame(t=>tick(t,token));
  }
  function start() {
    if(running) return;
    running=true;
    started=null;
    const token=++generation;
    handle=requestFrame(t=>tick(t,token));
  }
  function stop() {
    running=false;
    ++generation;
    if(handle!==null) cancelFrame(handle);
    handle=null;
    started=null;
  }
  return Object.freeze({start,stop,render,get running(){return running;}});
}

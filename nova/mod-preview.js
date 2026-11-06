// Atomic MOD preview controller: keep the current character alive until replacement art is ready.
// The host supplies createStage (normally createNovaBrowserStage) and stage configuration.
import {createNovaBrowserStage} from './browser-stage.js';
import {importNovaModManifest} from './mod-import.js';

export function createNovaModPreview({createStage=createNovaBrowserStage,stageOptions={}}={}) {
  if(typeof createStage!=='function' || !stageOptions || typeof stageOptions!=='object' || Array.isArray(stageOptions))
    throw new Error('Invalid NOVA preview configuration');
  let current=null,revision=0,disposed=false;
  async function setMods(manifests=[],{assetRoot=''}={}) {
    if(disposed) throw new Error('NOVA preview disposed');
    if(!Array.isArray(manifests)) throw new Error('NOVA MOD list must be an array');
    const mods=manifests.map(manifest=>importNovaModManifest(manifest,{assetRoot}));
    const ticket=++revision;
    const candidate=await createStage({...stageOptions,mods});
    if(disposed || ticket!==revision) {
      candidate.stop();
      return false;
    }
    const previous=current;
    try { candidate.start(); }
    catch(error) { candidate.stop(); throw error; }
    current=candidate;
    if(previous) previous.stop();
    return true;
  }
  function stop() {
    if(current) current.stop();
  }
  function dispose() {
    disposed=true;
    ++revision;
    stop();
    current=null;
  }
  return Object.freeze({setMods,stop,dispose,get active(){return current;},get disposed(){return disposed;}});
}

// NOVA desktop pet core — host-independent, no UI or network side effects.
// Inspired by dsh-desktop-pet (MIT) and dsh-whale-musume (MIT).
// Copyright remains with their respective authors for any future reused code.
export const PET_STATES = Object.freeze(['idle','thinking','working','waiting','success','error','sleeping']);
const aliases = Object.freeze({
  queued:'idle', planned:'idle', running:'working', coding:'working',
  tool_running:'working', reasoning:'thinking', blocked:'waiting',
  waiting_for_user:'waiting', ready_for_approval:'waiting',
  done:'success', completed:'success', failed:'error'
});
export function resolvePetState(taskStatus) {
  const key = String(taskStatus ?? 'idle').trim().toLowerCase();
  const state = aliases[key] ?? key;
  return PET_STATES.includes(state) ? state : 'idle';
}
export function validatePetManifest(manifest) {
  if (!manifest || typeof manifest !== 'object' || Array.isArray(manifest)) throw new Error('Invalid pet manifest');
  if (!/^[a-z0-9][a-z0-9_-]{1,63}$/i.test(manifest.id ?? '')) throw new Error('Invalid pet id');
  if (!['sprite','skeleton'].includes(manifest.renderer)) throw new Error('Unsupported renderer');
  if (!manifest.actions || typeof manifest.actions !== 'object' || Array.isArray(manifest.actions)) throw new Error('Missing actions');
  for (const [name, action] of Object.entries(manifest.actions)) {
    if (!/^[a-z][a-z0-9_-]*$/i.test(name) || !action || typeof action !== 'object') throw new Error('Invalid action');
    if (!Array.isArray(action.frames) && !Array.isArray(action.keyframes)) throw new Error('Missing animation frames');
  }
  return true;
}
export class NovaPetController {
  constructor({manifest, onChange=()=>{}, quietWhileWorking=true}={}) {
    validatePetManifest(manifest);
    this.manifest=manifest; this.onChange=onChange; this.quietWhileWorking=quietWhileWorking;
    this.state='idle'; this.mood=50; this.affection=0; this.position={x:0,y:0};
  }
  setTaskStatus(status) {
    this.state=resolvePetState(status);
    this.onChange(this.snapshot());
    return this.state;
  }
  interact(kind) {
    if (this.quietWhileWorking && ['working','thinking'].includes(this.state)) return false;
    if (kind==='pet') {this.mood=Math.min(100,this.mood+2);this.affection=Math.min(100,this.affection+1);}
    else if (kind==='feed') this.mood=Math.min(100,this.mood+5);
    else return false;
    this.onChange(this.snapshot()); return true;
  }
  moveTo(x,y) {
    if (![x,y].every(Number.isFinite)) throw new Error('Invalid position');
    this.position={x,y};this.onChange(this.snapshot());
  }
  getAction() {
    return this.manifest.actions[this.state] ?? this.manifest.actions.idle ?? null;
  }
  snapshot() {return {state:this.state,mood:this.mood,affection:this.affection,position:{...this.position},action:this.getAction()};}
}

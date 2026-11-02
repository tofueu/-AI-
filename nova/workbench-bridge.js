// Bridge AI Workbench task events to the NOVA pet controller.
// Host must supply trusted, real task events; no simulated progress.
import { resolvePetState } from './pet-core.js';
const TYPES = new Set(['task.created','task.started','task.progress','task.waiting','task.failed','task.completed','task.cancelled']);
const STATUS = { 'task.created':'queued','task.started':'running','task.waiting':'blocked','task.failed':'failed','task.completed':'completed','task.cancelled':'idle' };
export class NovaWorkbenchBridge {
  constructor({controller,onNotice=()=>{}}) {
    if (!controller || typeof controller.setTaskStatus !== 'function') throw new Error('NOVA controller required');
    this.controller=controller; this.onNotice=onNotice; this.tasks=new Map();
  }
  accept(event) {
    if (!event || !TYPES.has(event.type) || typeof event.taskId!=='string' || !event.taskId.trim()) throw new Error('Invalid workbench event');
    const previous=this.tasks.get(event.taskId);
    if (previous?.terminal && event.type!=='task.created') return this.snapshot();
    const status=event.type==='task.progress' ? (event.status || 'running') : STATUS[event.type];
    const state=resolvePetState(status);
    const terminal=['task.failed','task.completed','task.cancelled'].includes(event.type);
    this.tasks.set(event.taskId,{id:event.taskId,state,terminal,updatedAt:event.timestamp??null,agent:event.agent??null,summary:event.summary??null});
    const all=[...this.tasks.values()];
    const active=all.filter(t=>!t.terminal);
    const priority=['error','waiting','working','thinking','success','idle'];
    const chosen=active.length ? priority.find(s=>active.some(t=>t.state===s)) ?? 'idle' : state;
    this.controller.setTaskStatus(chosen);
    if (['task.failed','task.completed','task.waiting'].includes(event.type)) this.onNotice({taskId:event.taskId,type:event.type,summary:event.summary??''});
    return this.snapshot();
  }
  snapshot() {return {pet:this.controller.snapshot(),tasks:[...this.tasks.values()]};}
}

// NOVA Official MOD: use real user artwork, never fake a provider reply.
export const stateMap={error:'error',running:'working',handoff:'waiting_auth',ready_for_approval:'waiting_auth',waiting_research:'thinking',queued:'thinking',done:'done',planned:'thinking',cancelled:'idle'};
export const stateLabels={error:'任務失敗',running:'AI 執行中',handoff:'等待交接',ready_for_approval:'待確認',waiting_research:'等待研究',queued:'排隊中',done:'已完成',idle:'NOVA 陪伴中'};
const validPath=s=>typeof s==='string'&&!s.startsWith('/')&&!s.includes('\\')&&!s.split('/').some(x=>!x||x==='.'||x==='..')&&/^[\w./-]+\.(png|webp)$/i.test(s);
export function validateNovaMod(mod){
 if(!mod||mod.format!=='nova.character.mod'||mod.manifestVersion!==2||!mod.characters?.chibi)throw Error('Unsupported NOVA MOD');
 for(const [style,c] of Object.entries(mod.characters)){
  if(!['chibi','mature'].includes(style)||typeof c.root!=='string'||c.root.startsWith('/')||c.root.includes('\\')||c.root.split('/').some(x=>x==='..'))throw Error('Invalid character path');
  for(const [name,t] of Object.entries(c.animations||{})){
   if(!/^[a-z_]{2,30}$/.test(name)||!Array.isArray(t.frames)||t.frames.length<1||t.frames.length>64||!Number.isFinite(t.fps)||t.fps<1||t.fps>30||!t.frames.every(validPath))throw Error('Unsafe animation');
  }
  if(c.views&&!Object.values(c.views).every(validPath))throw Error('Unsafe reference');
 }
 return mod;
}
export function taskState(tasks){
 if(!Array.isArray(tasks))throw Error('Task API must return an array');
 const set=new Set(tasks.map(t=>t?.status));
 for(const status of ['error','running','handoff','ready_for_approval','waiting_research','queued','done']){
  if(set.has(status))return {status,action:stateMap[status],label:stateLabels[status]};
 }
 return {status:'idle',action:'idle',label:stateLabels.idle};
}
export function spriteFrame(mod,style,action,timeMs){
 const c=mod.characters[style],t=c?.animations?.[action]||c?.animations?.idle;
 if(!t)return c?.views?.front?('/'+c.root+'/'+c.views.front):null;
 const i=Math.floor(Math.max(0,timeMs)*t.fps/1000)%t.frames.length;
 return '/'+c.root+'/'+t.frames[i];
}
export async function mountNovaPet({fetcher=fetch}={}){
 const el=document.createElement('aside');el.className='nova-mod-pet';
 el.innerHTML='<div class="nova-drag">✦ NOVA <span class="nova-state">載入中</span></div><img class="nova-sprite" alt="NOVA 官方角色" hidden><p class="nova-notice" hidden></p><div class="nova-actions"><button data-style="chibi">Q 版</button><button data-style="mature">成熟版</button><button data-chat>對話</button><button data-close>×</button></div><form class="nova-chat" hidden><select name="agent"><option value="gemini">Gemini CLI</option><option value="codex">Codex（待授權）</option><option value="perplexity">Perplexity（交接）</option><option value="grok">Grok（交接）</option></select><input name="workspace" placeholder="Gemini 專案絕對路徑"><textarea name="prompt" required placeholder="交辦給工作台的任務"></textarea><button type="submit">送出任務</button><p class="nova-reply" aria-live="polite">顯示真實任務，不生成假回覆。</p></form>';
 document.body.appendChild(el);
 const image=el.querySelector('.nova-sprite'),notice=el.querySelector('.nova-notice'),label=el.querySelector('.nova-state'),chat=el.querySelector('.nova-chat'),reply=el.querySelector('.nova-reply');
 let mod=null,style='chibi',action='idle',since=performance.now(),lastSrc='',disposed=false,drag=null;
 function setMessage(message){notice.hidden=!message;notice.textContent=message||'';}
 function changeStyle(next){
  style=next;since=performance.now();lastSrc='';
  const c=mod?.characters[style];
  setMessage(!c?'缺少角色':!c.animations?'成熟版目前只有三視圖，分層及關節動畫仍未完成。':'');
 }
 async function sync(){
  try{
   const r=await fetcher('/api/tasks',{cache:'no-store'});
   if(!r.ok)throw Error('HTTP '+r.status);
   const st=taskState(await r.json());action=st.action;label.textContent=st.label;
  }catch{action='idle';label.textContent='工作台離線';}
 }
 function draw(){
  if(disposed)return;
  if(mod){
   const next=spriteFrame(mod,style,action,performance.now()-since);
   if(next!==lastSrc){lastSrc=next;if(next){image.src=next;image.hidden=false;}else image.hidden=true;}
  }
  requestAnimationFrame(draw);
 }
 try{
  const r=await fetcher('/assets/nova-official/manifest.json',{cache:'no-store'});
  if(!r.ok)throw Error('尚未安裝 MOD');
  mod=validateNovaMod(await r.json());
  changeStyle('chibi');
 }catch(e){setMessage('官方素材尚未安裝：'+e.message);label.textContent='NOVA MOD 尚未就緒';}
 el.querySelectorAll('[data-style]').forEach(b=>b.addEventListener('click',()=>changeStyle(b.dataset.style)));
 el.querySelector('[data-chat]').addEventListener('click',()=>chat.hidden=!chat.hidden);
 el.querySelector('[data-close]').addEventListener('click',()=>{disposed=true;clearInterval(timer);el.remove();});
 const handle=el.querySelector('.nova-drag');
 handle.addEventListener('pointerdown',e=>{if(e.button!==0)return;drag={x:e.clientX,y:e.clientY,left:el.offsetLeft,top:el.offsetTop};handle.setPointerCapture(e.pointerId);});
 handle.addEventListener('pointermove',e=>{if(!drag)return;el.style.left=Math.max(0,drag.left+e.clientX-drag.x)+'px';el.style.top=Math.max(0,drag.top+e.clientY-drag.y)+'px';el.style.right='auto';el.style.bottom='auto';});
 handle.addEventListener('pointerup',()=>drag=null);
 chat.addEventListener('submit',async e=>{
  e.preventDefault();const f=new FormData(chat),agent=String(f.get('agent')),prompt=String(f.get('prompt')).trim(),workspace=String(f.get('workspace')).trim();
  if(agent==='gemini'&&!workspace){reply.textContent='Gemini 必須指定存在的工作區';return;}
  try{
   const r=await fetcher('/api/tasks',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({agent,prompt,workspace})});
   const task=await r.json();if(!r.ok)throw Error(task.error||'建立失敗');
   reply.textContent='已建立真實任務 '+task.id+'（'+task.status+'）；其他 AI 的 handoff 不代表已執行。';await sync();
  }catch(e){reply.textContent='交辦失敗：'+e.message;}
 });
 await sync();const timer=setInterval(sync,3500);requestAnimationFrame(draw);
 return {element:el,sync,close(){disposed=true;clearInterval(timer);el.remove();}};
}

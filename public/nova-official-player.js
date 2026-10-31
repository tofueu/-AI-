// NOVA Official MOD: use real user artwork, never fake a provider reply.
import {paintRig,RigAnimator,wardrobeChoices} from './nova-rig-runtime.js';
import {importArtistRigFolder,loadInstalledPsdRig} from './nova-rig-import.js';
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
/** Choose a real, currently relevant task. Historical terminal failures should not
 * hold NOVA red forever after a newer job starts. No invented task events. */
export function taskState(tasks){
 if(!Array.isArray(tasks))throw Error('Task API must return an array');
 const rank=['error','running','ready_for_approval','handoff','waiting_research','queued','planned','done'];
 const known=tasks.filter(t=>t&&typeof t==='object'&&rank.includes(t.status));
 const timestamp=t=>{
  const raw=t.updatedAt||t.completedAt||t.createdAt;
  const value=typeof raw==='string'?Date.parse(raw):NaN;
  return Number.isFinite(value)?value:null;
 };
 const dated=known.filter(t=>timestamp(t)!==null);
 let relevant=known;
 if(dated.length){
  // A newer task takes precedence over completed/failed work from previous runs.
  const newest=Math.max(...dated.map(timestamp));
  const current=dated.filter(t=>timestamp(t)===newest);
  if(current.length)relevant=current;
 }
 const active=rank.find(status=>relevant.some(t=>t.status===status));
 if(active)return {status:active,action:stateMap[active]||'idle',label:stateLabels[active]||'NOVA 陪伴中'};
 return {status:'idle',action:'idle',label:stateLabels.idle};
}
export function spriteFrame(mod,style,action,timeMs){
 const c=mod.characters[style],t=c?.animations?.[action]||c?.animations?.idle;
 if(!t)return c?.views?.front?('/assets/nova-official/'+c.root+'/'+c.views.front):null;
 const i=Math.floor(Math.max(0,timeMs)*t.fps/1000)%t.frames.length;
 return '/assets/nova-official/'+c.root+'/'+t.frames[i];
}
export async function mountNovaPet({fetcher=fetch}={}){
 const el=document.createElement('aside');el.className='nova-mod-pet';
 el.innerHTML='<div class="nova-drag">✦ NOVA <span class="nova-state">載入中</span></div><img class="nova-sprite" alt="NOVA 官方角色" hidden><canvas class="nova-rig-canvas" aria-label="匯入的關節角色" hidden></canvas><p class="nova-notice" hidden></p><div class="nova-actions"><button data-style="chibi">Q 版</button><button data-style="mature">成熟版</button><button data-download-psd>下載 PSD 模板</button><button data-import-psd>上傳 PSD</button><button data-import-rig>匯入 PNG 資料夾</button><button data-return-official>官方角色</button><button data-chat>對話</button><button data-close>×</button></div><input class="nova-psd-file" type="file" accept=".psd,application/vnd.adobe.photoshop" hidden><input class="nova-rig-folder" type="file" multiple hidden><div class="nova-wardrobe" hidden></div><form class="nova-chat" hidden><select name="agent"><option value="gemini">Gemini CLI</option><option value="codex">Codex（待授權）</option><option value="perplexity">Perplexity（交接）</option><option value="grok">Grok（交接）</option></select><input name="workspace" placeholder="Gemini 專案絕對路徑"><textarea name="prompt" required placeholder="交辦給工作台的任務"></textarea><button type="submit">送出任務</button><p class="nova-reply" aria-live="polite">顯示真實任務，不生成假回覆。</p></form>';
 document.body.appendChild(el);
 const image=el.querySelector('.nova-sprite'),notice=el.querySelector('.nova-notice'),label=el.querySelector('.nova-state'),chat=el.querySelector('.nova-chat'),reply=el.querySelector('.nova-reply');
 const canvas=el.querySelector('.nova-rig-canvas'),ctx=canvas.getContext('2d'),folder=el.querySelector('.nova-rig-folder');
 const psdInput=el.querySelector('.nova-psd-file'),wardrobe=el.querySelector('.nova-wardrobe');
 let mod=null,style='chibi',action='idle',since=performance.now(),lastSrc='',disposed=false,drag=null;
 let localRig=null,animator=null,currentStatus='idle',appearance={};
 function setMessage(message){notice.hidden=!message;notice.textContent=message||'';}
 function changeStyle(next){
  if(localRig){localRig.dispose();localRig=null;animator=null;canvas.hidden=true;appearance={};wardrobe.hidden=true;wardrobe.replaceChildren();}
  style=next;since=performance.now();lastSrc='';
  const c=mod?.characters[style];
  setMessage(!c?'缺少角色':!c.animations?'成熟版目前只有三視圖，分層及關節動畫仍未完成。':'');
 }
 async function sync(){
  try{
   const r=await fetcher('/api/tasks',{cache:'no-store'});
   if(!r.ok)throw Error('HTTP '+r.status);
   const st=taskState(await r.json());action=st.action;currentStatus=st.status;label.textContent=st.label;
   if(animator)animator.setTaskStatus(currentStatus,performance.now());
  }catch{action='idle';currentStatus='idle';label.textContent='工作台離線';if(animator)animator.setTaskStatus('idle',performance.now());}
 }
 function draw(){
  if(disposed)return;
  if(localRig && animator){
   ctx.clearRect(0,0,canvas.width,canvas.height);
   paintRig(ctx,localRig.rig,animator.sample(performance.now()),localRig.images,appearance);
  }else if(mod){
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
 function applyRig(loaded,message){
  if(localRig)localRig.dispose();
  localRig=loaded;animator=new RigAnimator(loaded.rig,{transitionMs:220});
  animator.setTaskStatus(currentStatus,performance.now());
  canvas.width=loaded.rig.canvas[0];canvas.height=loaded.rig.canvas[1];
  canvas.hidden=false;image.hidden=true;
  appearance={...(loaded.rig.defaultAppearance||{})};
  wardrobe.replaceChildren();
  const choices=wardrobeChoices(loaded.rig);
  for(const [category,options] of Object.entries(choices)){
    if(options.length<2)continue;
    const label=document.createElement('label');label.textContent=category+'：';
    const select=document.createElement('select');
    for(const value of options){
      const option=document.createElement('option');option.value=value;option.textContent=value;
      option.selected=appearance[category]===value;select.append(option);
    }
    select.addEventListener('change',()=>{appearance[category]=select.value;});
    label.append(select);wardrobe.append(label);
  }
  wardrobe.hidden=!wardrobe.childElementCount;
  setMessage(message);
}
el.querySelectorAll('[data-style]').forEach(b=>b.addEventListener('click',async()=>{
 changeStyle(b.dataset.style);
 try{await fetcher('/api/nova/characters/active',{method:'DELETE'});}catch{}
}));
psdInput.addEventListener('change',async()=>{
 const file=psdInput.files?.[0];
 try{
  if(!file||!/\.psd$/i.test(file.name))throw Error('請選擇 Photoshop .psd 檔案');
  if(file.size>30*1024*1024)throw Error('PSD 超過 30 MB 上限');
  setMessage('正在辨認 PSD 圖層、分離透明部位與綁定關節…');
  const response=await fetcher('/api/nova/characters/psd?style='+encodeURIComponent(style),{
    method:'POST',headers:{'content-type':'application/octet-stream'},body:file
  });
  const result=await response.json();
  if(!response.ok)throw Error(result.error||'PSD 匯入失敗');
  const installed=await loadInstalledPsdRig(result.id,{fetcher});
  applyRig(installed,'PSD 安裝完成！'+result.paintedParts+' 個已繪製部位、'+result.assets+' 張透明圖層，已永久保存在本機工作台。'+(result.warnings?.length?' 注意：'+result.warnings.join('；'):''));
 }catch(error){setMessage('PSD 匯入失敗：'+error.message);}
 finally{psdInput.value='';}
});
el.querySelector('[data-download-psd]').addEventListener('click',()=>{
 const a=document.createElement('a');
 a.href='/assets/nova-psd-templates/NOVA_Artist_'+style+'_Layer_Template_v1.psd';
 a.download='NOVA_Artist_'+style+'_Layer_Template_v1.psd';
 document.body.append(a);a.click();a.remove();
});
el.querySelector('[data-import-psd]').addEventListener('click',()=>psdInput.click());
 // Only the selected local folder is read. No account credentials or artwork are uploaded.
 folder.setAttribute('webkitdirectory','');folder.setAttribute('directory','');
 el.querySelector('[data-import-rig]').addEventListener('click',()=>folder.click());
 folder.addEventListener('change',async()=>{
  try{
   const loaded=await importArtistRigFolder(folder.files);
   applyRig(loaded,'本機 PNG 資料夾已匯入：'+(loaded.rig.name||'自訂角色')+'。此模式未永久安裝；若要保存請用上傳 PSD。');
  }catch(err){setMessage('匯入失敗：'+err.message);}
  finally{folder.value='';}
 });
 el.querySelector('[data-return-official]').addEventListener('click',async()=>{changeStyle(style);try{await fetcher('/api/nova/characters/active',{method:'DELETE'});}catch{}});
 el.querySelector('[data-chat]').addEventListener('click',()=>chat.hidden=!chat.hidden);
 el.querySelector('[data-close]').addEventListener('click',()=>{disposed=true;clearInterval(timer);localRig?.dispose();el.remove();});
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
 await sync();
 try{
  const active=await fetcher('/api/nova/characters/active',{cache:'no-store'});
  if(active.ok){
    const meta=await active.json();
    if(meta.id)applyRig(await loadInstalledPsdRig(meta.id,{fetcher}),'已從本機備份自動恢復 PSD 角色。');
  }
 }catch(error){setMessage('已儲存的 PSD 角色讀取失敗：'+error.message);}
 const timer=setInterval(sync,3500);requestAnimationFrame(draw);
 return {element:el,sync,close(){disposed=true;clearInterval(timer);localRig?.dispose();el.remove();}};
}

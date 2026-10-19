const $ = (s) => document.querySelector(s);
const promptBox = $('#prompt'), workspaceInput = $('#workspace'), taskList = $('#taskList'), dialog = $('#resultDialog');
const agentInfo = {
  gemini: { name: 'Gemini · Antigravity', icon: '✦', url: 'https://antigravity.google/' },
  gpt: { name: 'ChatGPT', icon: '◉', url: 'https://chatgpt.com/' },
  perplexity: { name: 'Perplexity Pro', icon: '◉', url: 'https://www.perplexity.ai/' },
  cursor: { name: 'Cursor Agent', icon: '⌘', url: 'https://cursor.com/' },
  grok: { name: 'Sub2API Gateway', icon: '↗', url: '' },
  custom: { name: '其他 AI（手動交辦）', icon: '◇', url: '' }
};
let taskCache = [], activeTask = null, onlyActive = false;
let authMode = 'register', appStarted = false, pollTimer = null;
function esc(s='') { return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function notify(text) { const el=$('#toast');el.textContent=text;el.classList.add('show');setTimeout(()=>el.classList.remove('show'),2800); }
function time(s) { return new Intl.DateTimeFormat('zh-TW',{hour:'2-digit',minute:'2-digit'}).format(new Date(s)); }
function stateText(s) { return ({waiting_research:'等待研究',queued:'排隊中',running:'正在處理',planned:'待交辦',blocked:'等待前一關',handoff:'已交辦／待回覆',done:'完成',ready_for_approval:'等待你確認',error:'需要處理',cancelled:'已取消'})[s]||s; }
function rootProgress(root, children) { const done=children.filter(t=>t.status==='done').length; return {done,total:children.length,percent:children.length?Math.round(done/children.length*100):0}; }

async function checkHealth() {
  try {
    const data=await fetch('/api/health').then(r=>r.json()), p=data.providers||{};
    const entries=[
      ['gpt',p.gpt,'ChatGPT / Codex','ChatGPT 訂閱 · Codex CLI','在本機使用已登入的 ChatGPT 訂閱'],
      ['gemini',p.gemini,'Gemini','Google 訂閱 · Antigravity CLI','在本機使用已登入的 Google 帳號'],
      ['cursor',p.cursor,'Cursor Agent','Cursor 帳號 · Cursor CLI','Cursor Agent 可在專案資料夾中執行程式任務'],
      ['perplexity',p.perplexity,'Perplexity Computer','官方 OAuth · Computer','由 Codex 呼叫 Perplexity Computer；以成功任務確認授權'],
      ['grok',p.grok,'Sub2API Gateway',p.grok?.model||'已設定的模型','透過你設定的 Gateway 模型路由；請確認上游授權']
    ];
    const connected=entries.filter(([,s])=>s?.connected);
    $('#agentGrid').innerHTML=connected.length?connected.map(([id,s,name,model,desc])=>`<article class="agent-card ${id}-card"><div class="agent-top"><span class="agent-symbol ${id}-symbol">${agentInfo[id].icon}</span><span class="agent-status"><i class="status-dot"></i>已驗證連線</span></div><h3>${esc(name)}</h3><p class="agent-model">${esc(model)}</p><p class="agent-desc">${esc(desc)}</p><div class="agent-foot"><span class="quota-tag">${esc(s.version||s.detail||'連線已驗證')}</span><button class="mini-btn" data-agent="${id}">建立任務 <b>↗</b></button></div></article>`).join(''):`<div class="empty-state connected-empty">目前沒有已驗證的 AI 連線。<br>按「新增 AI／帳號」開始官方登入；登入後按「更新連線」。</div>`;
    const choices=[
      {id:'gpt',name:'ChatGPT / Codex',state:p.gpt,ready:p.gpt?.connected,desc:'用你的 ChatGPT 帳號授權 Codex CLI。'},
      {id:'gemini',name:'Gemini',state:p.gemini,ready:p.gemini?.connected,desc:'用你的 Google 帳號啟動 Antigravity CLI。'},
      {id:'cursor',name:'Cursor',state:p.cursor,ready:p.cursor?.connected,desc:'用 Cursor 官方 CLI 登入並把 Cursor 加入助理清單。'},
      {id:'perplexity',name:'Perplexity Computer',state:p.perplexity,ready:p.perplexity?.connected,desc:'透過 Codex MCP 開啟 Perplexity OAuth。'},
      {id:'sub2api',name:'Sub2API 多帳號池',state:p.grok,ready:p.grok?.connected,desc:'設定 Gateway 並管理已在 Sub2API 授權的多個上游帳號。'}
    ];
    $('#providerChoices').innerHTML=choices.map(c=>`<div class="provider-choice"><div><strong>${esc(c.name)}</strong><small>${esc(c.ready?'已驗證連線':c.state?.detail||c.state?.message||c.desc)}</small></div><button type="button" class="secondary-btn" data-provider="${c.id}">${c.id==='sub2api'?'設定／管理':c.ready?'重新登入':'連結帳號'}</button></div>`).join('');
    $('#agentCount').textContent=String(connected.length);
    if(!workspaceInput.value)workspaceInput.placeholder=data.defaultWorkspace;
  }
  catch { $('#agentGrid').innerHTML='<div class="empty-state">工作台離線，請重新啟動本機服務後更新。</div>'; }
}
function renderTasks() {
  const allRoots=taskCache.filter(t=>t.kind==='parent'||(!t.parentId&&t.kind!=='child'));
  const roots=onlyActive?allRoots.filter(root=>root.status!=='done'):allRoots;
  if(!roots.length){taskList.innerHTML='<div class="empty-state">目前沒有主任務。建立一個主目標，工作台就會展開分工樹。</div>';return;}
  taskList.innerHTML=roots.map(root=>{
    const children=taskCache.filter(t=>t.parentId===root.id);
    const p=rootProgress(root,children);
    const state=children.length&&children.every(c=>c.status==='done')?'done':root.status;
    const repo=root.repoUrl?`<a class="repo-link" href="${esc(root.repoUrl)}" target="_blank" rel="noopener" onclick="event.stopPropagation()">⌘ GitHub Repository ↗</a>`:'';
    const issue=root.issueUrl?`<a class="repo-link" href="${esc(root.issueUrl)}" target="_blank" rel="noopener" onclick="event.stopPropagation()">Issue / PR ↗</a>`:'';
    const kids=children.map(child=>{
      const info=agentInfo[child.agent]||agentInfo.gemini;
      const fileNote=child.changes?.length ? `<div class="changed-files">修改：${esc(child.changes.join(' · '))}</div>` : '';
      const action=child.status==='planned'?`<button class="tree-action" data-dispatch="${esc(child.id)}">交辦 ↗</button>`:child.status==='handoff'?`<button class="tree-action" data-open="${esc(child.id)}">貼回結果</button>`:child.status==='blocked'?`<span class="tree-wait">等待</span>`:`<button class="tree-action secondary" data-open="${esc(child.id)}">查看</button>`;
      return `<div class="tree-child"><div class="tree-branch"></div><div class="task-agent-icon ${esc(child.agent)}">${info.icon}</div><div class="tree-child-main"><div class="tree-role">${esc(child.role)}</div><div class="tree-assignee">${info.name}</div>${fileNote}</div><span class="tree-state ${esc(child.status)}"><i></i>${stateText(child.status)}</span>${action}</div>`;
    }).join('');
    return `<article class="tree-root"><div class="tree-root-head"><div class="root-icon">▣</div><div class="root-main"><div class="root-title">${esc(root.projectName||root.prompt.slice(0,60))}</div><div class="root-objective">${esc(root.prompt)}</div><div class="repo-links">${repo}${issue}<span class="local-tag">📁 ${esc(root.workspace||'未設定工作資料夾')}</span></div></div><div class="root-progress"><strong>${p.done}/${p.total}</strong><small>子任務完成</small><div class="progress-track"><i style="width:${p.percent}%"></i></div></div><button class="collapse-btn" aria-label="收合">⌄</button></div><div class="tree-children">${kids||'<div class="empty-state">沒有子任務</div>'}</div></article>`;
  }).join('');
  taskList.querySelectorAll('[data-dispatch]').forEach(btn=>btn.addEventListener('click',e=>{e.stopPropagation();dispatchExternal(btn.dataset.dispatch);}));
  taskList.querySelectorAll('[data-open]').forEach(btn=>btn.addEventListener('click',e=>{e.stopPropagation();showTask(btn.dataset.open);}));
  taskList.querySelectorAll('.tree-root-head').forEach(head=>head.addEventListener('click',()=>head.parentElement.classList.toggle('collapsed')));
}
async function loadTasks(){try{taskCache=await fetch('/api/tasks').then(r=>r.json());renderTasks();}catch{taskList.innerHTML='<div class="empty-state">無法讀取任務記錄。</div>';}}
async function loadAccounts(){const box=$('#accountList');try{const r=await fetch('/api/sub2api/accounts'),d=await r.json();if(!r.ok)throw new Error(d.error||'無法讀取帳號');if(!d.accounts.length){box.innerHTML='<div class="empty-state">Sub2API 已連接，但目前沒有帳號。請到管理頁新增帳號並完成 OAuth 授權。</div>';return;}box.innerHTML=`<div class="account-summary">讀取到 ${esc(d.total)} 個帳號。此清單只顯示 Sub2API 回報的授權紀錄；實際供應商剩餘額度需以該服務可查資料為準。</div><div class="account-grid">${d.accounts.map(a=>`<div class="account-row"><strong>${esc(a.name||`${a.platform||'AI'} 帳號 #${a.id}`)}</strong><span>${esc(a.platform)} · ${esc(a.type||'')}</span><span class="account-state">${esc(a.status||'未知')}${a.schedulable===true?' · 可排程':a.schedulable===false?' · 暫不可排程':''}</span><small>帳號 ID ${esc(a.id)}${Array.isArray(a.groupIds)&&a.groupIds.length?` · 群組 ${esc(a.groupIds.join(', '))}`:''}</small>${a.error?`<small class="account-error">${esc(a.error)}</small>`:''}</div>`).join('')}</div>`;}catch(e){box.innerHTML=`<div class="empty-state">${esc(e.message)}<br><button class="text-btn" id="configurePool">設定 Sub2API 管理授權</button></div>`;$('#configurePool')?.addEventListener('click',()=>$('#sub2apiDialog').showModal());}}
async function loadPoolConfig(){try{const c=await fetch('/api/sub2api/config').then(r=>r.json());if(c.adminBaseUrl)$('#sub2apiAdminBase').value=c.adminBaseUrl;}catch{}}

async function createTask() {
  const prompt=promptBox.value.trim(), workspace=workspaceInput.value.trim();
  if(!prompt)return notify('先輸入主任務內容。');
  if(!workspace)return notify('請輸入要處理的本機專案資料夾完整路徑。');
  const button=$('#runBtn');button.disabled=true;button.querySelector('span').textContent='建立分工中…';
  try{
    const mode=$('#mode').value, agent=mode==='team'?'gemini':$('#singleAgent').value;
    const body={agent,mode,projectName:$('#projectName').value.trim(),repoUrl:$('#repoUrl').value.trim(),issueUrl:$('#issueUrl').value.trim(),prompt,workspace};
    const res=await fetch('/api/tasks',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)}),data=await res.json();
    if(!res.ok)throw new Error(data.error||'建立失敗');
    promptBox.value='';notify('主任務已建立，已依序呼叫已登入的 AI 工具。');await loadTasks();
  }catch(e){notify(e.message);}finally{button.disabled=false;button.querySelector('span').textContent='建立分工';}
}
async function dispatchExternal(id){
  const task=taskCache.find(t=>t.id===id);if(!task)return;
  try{
    await fetch(`/api/tasks/${id}/dispatch`,{method:'POST'});
    const info=agentInfo[task.agent];await navigator.clipboard.writeText(task.prompt).catch(()=>{});
    if (info.url) window.open(info.url,'_blank','noopener');
    notify(`${info.name} 任務提示已複製；完成後按「貼回結果」。`);await loadTasks();
  }catch{notify('交辦失敗，請重新操作。');}
}
async function showTask(id){
  const task=taskCache.find(t=>t.id===id);if(!task)return;activeTask=task;
  $('#dialogTitle').textContent=task.role||task.projectName||'任務結果';
  const changes=task.changes?.length ? `\n\n偵測到的程式修改：\n${task.changes.join('\n')}` : '';
  $('#resultText').textContent=task.response||task.logs||task.prompt;
  $('#resultText').textContent += changes;
  $('#pasteArea').classList.toggle('hidden',task.status!=='handoff');$('#manualResult').value='';
  $('#copyPrompt').onclick=async()=>{await navigator.clipboard.writeText(task.prompt);notify('交辦內容已複製。');};dialog.showModal();
}
$('#saveResult').addEventListener('click',async()=>{if(!activeTask)return;const response=$('#manualResult').value.trim();if(!response)return notify('請先貼上 AI 回覆。');const res=await fetch(`/api/tasks/${activeTask.id}/result`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({response})});if(!res.ok)return notify('儲存回覆失敗。');dialog.close();notify('審查結果已存回任務分工樹。');loadTasks();});
$('#runBtn').addEventListener('click',createTask);
$('#mode').addEventListener('change',()=>$('#singleAgentWrap').classList.toggle('hidden',$('#mode').value!=='single'));
$('#addAiBtn').addEventListener('click',()=>$('#providerDialog').showModal());
$('#providerChoices').addEventListener('click',async event=>{
  const btn=event.target.closest('[data-provider]');if(!btn)return;
  const provider=btn.dataset.provider;
  if(provider==='sub2api'){ $('#providerDialog').close();$('#sub2apiDialog').showModal();return; }
  btn.disabled=true;
  try{const res=await fetch(`/api/connect/${provider}`,{method:'POST'}),data=await res.json();if(!res.ok)throw new Error(data.error||'無法啟動登入');notify(data.message||'已啟動登入流程。完成後回到工作台按「更新連線」。');}
  catch(e){notify(e.message);}finally{setTimeout(()=>{btn.disabled=false;checkHealth();},1500);}
});
$('#agentGrid').addEventListener('click',event=>{const btn=event.target.closest('.mini-btn[data-agent]');if(!btn)return;const id=btn.dataset.agent;$('#mode').value='single';$('#singleAgentWrap').classList.remove('hidden');$('#singleAgent').value=id==='grok'?'custom':id;promptBox.value=`請負責${agentInfo[id].name}的工作，針對目前主專案提供結果。`;promptBox.focus();notify('請補充主目標，再建立任務。');});
document.querySelectorAll('.project-link').forEach(btn=>btn.addEventListener('click',()=>{promptBox.value=btn.dataset.prompt;promptBox.focus();}));
$('#refreshBtn').addEventListener('click',()=>{checkHealth();loadTasks();notify('任務與連線狀態已更新。');});
$('#clearView').addEventListener('click',()=>{onlyActive=!onlyActive;$('#clearView').textContent=onlyActive?'顯示全部主任務':'只看進行中';renderTasks();});
$('#settingsBtn').addEventListener('click',()=>notify('權限設定與啟動方式請看 README。'));
$('#sub2apiBtn').addEventListener('click',()=>$('#sub2apiDialog').showModal());
$('#refreshAccounts').addEventListener('click',loadAccounts);
$('#openSub2apiAdmin').addEventListener('click',async()=>{const c=await fetch('/api/sub2api/config').then(r=>r.json());window.open(c.adminBaseUrl||'http://127.0.0.1:8080','_blank','noopener');});
$('#saveSub2apiAdmin').addEventListener('click',async()=>{const b=$('#saveSub2apiAdmin');b.disabled=true;try{const r=await fetch('/api/sub2api/admin-config',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({baseUrl:$('#sub2apiAdminBase').value,adminKey:$('#sub2apiAdminKey').value})}),d=await r.json();if(!r.ok)throw new Error(d.error||'驗證失敗');$('#sub2apiAdminKey').value='';notify(`管理 API 驗證成功，讀取到 ${d.total} 個帳號。`);loadAccounts();}catch(e){notify(e.message);}finally{b.disabled=false;}});
$('#testSub2api').addEventListener('click',async()=>{
  const button=$('#testSub2api');button.disabled=true;button.querySelector('b').textContent='…';
  try{
    const response=await fetch('/api/sub2api/connect',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({baseUrl:$('#sub2apiBase').value,apiKey:$('#sub2apiKey').value,model:$('#sub2apiModel').value})});
    const result=await response.json();
    if(!response.ok)throw new Error(result.models?.length?`${result.error}\n可用模型：${result.models.join(', ')}`:result.error||'連線測試失敗');
    $('#sub2apiDialog').close();$('#sub2apiKey').value='';notify(result.message||'Gateway 連線完成');checkHealth();
  }catch(error){notify(error.message);}finally{button.disabled=false;button.querySelector('b').textContent='↗';}
});
workspaceInput.value=localStorage.getItem('pro-ai-workbench-workspace')||'';workspaceInput.addEventListener('change',()=>localStorage.setItem('pro-ai-workbench-workspace',workspaceInput.value.trim()));

function setAuthMode(mode){
  authMode=mode;
  const registering=mode==='register';
  $('#nameField').classList.toggle('hidden',!registering);
  $('#authTitle').textContent=registering?'建立你的本機帳號':'登入本機帳號';
  $('#authSubmit span').textContent=registering?'建立帳號':'登入';
  $('#authPassword').autocomplete=registering?'new-password':'current-password';
  $('#authSwitch').textContent=registering?'已經建立帳號？登入':'還沒有帳號？建立本機帳號';
  $('#authError').textContent='';
}
async function startApp(user){
  if(appStarted)return;
  appStarted=true;
  $('#authScreen').classList.add('hidden');
  $('#appShell').classList.remove('auth-locked');
  $('#localUserName').textContent=user?.name||'我的工作區';
  checkHealth();loadTasks();loadAccounts();loadPoolConfig();
  pollTimer=setInterval(()=>{loadTasks();checkHealth();},3500);
}
async function checkLocalAuth(){
  try{
    const response=await fetch('/api/auth/state'),state=await response.json();
    if(state.signedIn){await startApp(state.user);return;}
    setAuthMode(state.accountExists?'login':'register');
    $('#authSwitch').classList.toggle('hidden',state.accountExists);
    $('#authScreen').classList.remove('hidden');
    $('#appShell').classList.add('auth-locked');
  }catch{
    $('#authTitle').textContent='無法連接本機服務';
    $('#authError').textContent='請確認工作台伺服器仍在執行，然後重新整理頁面。';
  }
}
$('#authSwitch').addEventListener('click',()=>setAuthMode(authMode==='register'?'login':'register'));
$('#authForm').addEventListener('submit',async event=>{
  event.preventDefault();
  const button=$('#authSubmit');button.disabled=true;$('#authError').textContent='';
  const body={email:$('#authEmail').value.trim(),password:$('#authPassword').value};
  if(authMode==='register')body.name=$('#authName').value.trim()||'我的工作區';
  try{
    const response=await fetch(`/api/auth/${authMode}`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)}),data=await response.json();
    if(!response.ok)throw new Error(data.error||'登入失敗');
    $('#authPassword').value='';
    await startApp(data.user);
    notify(authMode==='register'?'本機帳號已建立':'已登入本機帳號');
  }catch(error){$('#authError').textContent=error.message;}
  finally{button.disabled=false;}
});
$('#logoutBtn').addEventListener('click',async()=>{
  await fetch('/api/auth/logout',{method:'POST'}).catch(()=>{});
  if(pollTimer)clearInterval(pollTimer);pollTimer=null;appStarted=false;
  $('#appShell').classList.add('auth-locked');
  $('#authScreen').classList.remove('hidden');
  $('#authSwitch').classList.add('hidden');
  setAuthMode('login');$('#authEmail').value='';$('#authPassword').value='';
});
checkLocalAuth();

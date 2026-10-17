const $ = (s) => document.querySelector(s);
const promptBox = $('#prompt'), workspaceInput = $('#workspace'), taskList = $('#taskList'), dialog = $('#resultDialog');
const agentInfo = {
  gemini: { name: 'Gemini · Antigravity', icon: '✦', url: 'https://antigravity.google/' },
  gpt: { name: 'ChatGPT', icon: '◉', url: 'https://chatgpt.com/' },
  perplexity: { name: 'Perplexity Pro', icon: '◉', url: 'https://www.perplexity.ai/' },
  grok: { name: 'Grok · Sub2API', icon: '𝕏', url: '' },
  custom: { name: '其他 AI（手動交辦）', icon: '◇', url: '' }
};
let taskCache = [], activeTask = null, onlyActive = false;
function esc(s='') { return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function notify(text) { const el=$('#toast');el.textContent=text;el.classList.add('show');setTimeout(()=>el.classList.remove('show'),2800); }
function time(s) { return new Intl.DateTimeFormat('zh-TW',{hour:'2-digit',minute:'2-digit'}).format(new Date(s)); }
function stateText(s) { return ({waiting_research:'等待研究',queued:'排隊中',running:'正在處理',planned:'待交辦',blocked:'等待前一關',handoff:'已交辦／待回覆',done:'完成',ready_for_approval:'等待你確認',error:'需要處理',cancelled:'已取消'})[s]||s; }
function rootProgress(root, children) { const done=children.filter(t=>t.status==='done').length; return {done,total:children.length,percent:children.length?Math.round(done/children.length*100):0}; }

async function checkHealth() {
  try {
    const data=await fetch('/api/health').then(r=>r.json()), p=data.providers||{};
    const set=(id, state, label)=>{const el=$(id);if(!el)return;el.innerHTML=`<i class="status-dot ${state?'':'offline'}"></i>${esc(label)}`;el.classList.toggle('offline',!state);};
    const gem=p.gemini||data.cli, gpt=p.gpt||{}, pplx=p.perplexity||{}, grok=p.grok||{};
    set('#gemStatus',gem.available,gem.available?'CLI 可用 · 登入需在執行時驗證':'CLI 未安裝');
    set('#gptStatus',gpt.connected,gpt.connected?'ChatGPT 已登入':gpt.available?'Codex 已裝 · 尚未登入':'Codex CLI 未安裝');
    set('#pplxStatus',pplx.connected,pplx.connected?'OAuth 已連線':pplx.configured?'MCP 已設定 · OAuth 待確認':pplx.available?'尚未設定 OAuth':'需要先安裝 Codex CLI');
    set('#grokStatus',grok.connected,grok.connected?'Gateway 與模型已驗證':grok.configured?'Gateway 未連線':'尚未設定 Gateway');
    document.querySelectorAll('[data-connect]').forEach(btn=>{const k=btn.dataset.connect,s=k==='gemini'?gem:k==='gpt'?gpt:pplx;btn.disabled=!s.available;btn.textContent=k==='gpt'&&s.connected?'已連線 ✓':k==='perplexity'&&s.connected?'已連線 ✓':k==='perplexity'&&s.configured?'完成 OAuth ↗':'連結帳號 ↗';});
    if(!workspaceInput.value)workspaceInput.placeholder=data.defaultWorkspace;
  }
  catch { $('#gemStatus').innerHTML='<i class="status-dot offline"></i>工作台離線'; }
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
document.querySelectorAll('[data-connect]').forEach(btn=>btn.addEventListener('click',async()=>{
  const provider=btn.dataset.connect;btn.disabled=true;
  try{const res=await fetch(`/api/connect/${provider}`,{method:'POST'}),data=await res.json();if(!res.ok)throw new Error(data.error||'無法啟動登入');notify(data.message||'請在新視窗完成官方登入授權，完成後按更新連線狀態。');}
  catch(e){notify(e.message);}finally{setTimeout(()=>{btn.disabled=false;checkHealth();},1200);}
}));
document.querySelectorAll('.mini-btn[data-agent]').forEach(btn=>btn.addEventListener('click',()=>{const p=btn.closest('.agent-card');promptBox.value=`請負責${p.querySelector('h3').textContent}的工作，針對目前主專案提供結果。`;promptBox.focus();notify('請補充主目標，再建立套娃分工。');}));
document.querySelectorAll('.project-link').forEach(btn=>btn.addEventListener('click',()=>{promptBox.value=btn.dataset.prompt;promptBox.focus();}));
$('#refreshBtn').addEventListener('click',()=>{checkHealth();loadTasks();notify('任務與連線狀態已更新。');});
$('#clearView').addEventListener('click',()=>{onlyActive=!onlyActive;$('#clearView').textContent=onlyActive?'顯示全部主任務':'只看進行中';renderTasks();});
$('#settingsBtn').addEventListener('click',()=>notify('權限設定與啟動方式請看 README。'));
$('#sub2apiBtn').addEventListener('click',()=>$('#sub2apiDialog').showModal());
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
checkHealth();loadTasks();setInterval(()=>{loadTasks();checkHealth();},3500);

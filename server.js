import http from 'node:http';
import https from 'node:https';
import { spawn, execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { randomUUID } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync, statSync } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

const execFileAsync = promisify(execFile);
const ROOT = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(ROOT, 'data');
const DATA_FILE = process.env.TEST_DATA_FILE ? path.resolve(process.env.TEST_DATA_FILE) : path.join(DATA_DIR, 'tasks.json');
const ACCOUNTS_FILE = process.env.TEST_ACCOUNTS_FILE ? path.resolve(process.env.TEST_ACCOUNTS_FILE) : path.join(DATA_DIR, 'accounts.json');
const PORT = Number(process.env.PORT || 4173);
const HOST = '127.0.0.1';
const AGY = process.env.ANTIGRAVITY_CLI || 'agy';
const PUBLIC_DIR = path.join(ROOT, 'public');

mkdirSync(path.dirname(DATA_FILE), { recursive: true });
if (!existsSync(DATA_FILE)) writeFileSync(DATA_FILE, '[]', 'utf8');

const DEFAULT_ACCOUNTS = [
  { id: 'acc_gemini_a', name: 'Gemini A (主帳號)', provider: 'gemini', mode: 'subscription_cli', status: 'connected', active: true, note: 'Google Antigravity CLI 官方訂閱額度', oauthUrl: 'https://accounts.google.com/o/oauth2/v2/auth' },
  { id: 'acc_gemini_b', name: 'Gemini B (次要帳號)', provider: 'gemini', mode: 'subscription_cli', status: 'handoff_mode', active: true, note: 'CLI 單一 Profile 限制：次要帳號需切換 Profile 或手動 Handoff', oauthUrl: 'https://accounts.google.com/o/oauth2/v2/auth' },
  { id: 'acc_codex', name: 'ChatGPT / Codex', provider: 'codex', mode: 'subscription_cli', status: 'login_required', active: true, note: 'OpenAI 官方授權槽位；使用訂閱額度', oauthUrl: 'https://auth.openai.com/authorize' },
  { id: 'acc_claude', name: 'Claude Pro', provider: 'claude', mode: 'subscription_cli', status: 'handoff_mode', active: true, note: 'Anthropic 官方訂閱/Web Handoff 模式', oauthUrl: 'https://claude.ai/login' },
  { id: 'acc_perplexity', name: 'Perplexity Pro', provider: 'perplexity', mode: 'subscription_cli', status: 'connected', active: true, note: 'Perplexity Pro 搜尋額度', oauthUrl: 'https://www.perplexity.ai/' }
];

function loadAccounts() {
  try {
    if (!existsSync(ACCOUNTS_FILE)) {
      writeFileSync(ACCOUNTS_FILE, JSON.stringify(DEFAULT_ACCOUNTS, null, 2), 'utf8');
      return DEFAULT_ACCOUNTS;
    }
    const data = JSON.parse(readFileSync(ACCOUNTS_FILE, 'utf8'));
    return Array.isArray(data) ? data : DEFAULT_ACCOUNTS;
  } catch {
    return DEFAULT_ACCOUNTS;
  }
}
function saveAccounts(accounts) { writeFileSync(ACCOUNTS_FILE, JSON.stringify(accounts, null, 2), 'utf8'); }

function loadTasks() {
  // Never turn a corrupt/unreadable task ledger into an empty queue: the next
  // write would otherwise silently erase every NOVA/control-panel task.
  let tasks;
  try {
    tasks = JSON.parse(readFileSync(DATA_FILE, 'utf8'));
  } catch {
    throw new Error('Task ledger is unreadable or invalid JSON; refusing to reset it');
  }
  if (!Array.isArray(tasks) || !tasks.every(task =>
    task !== null && typeof task === 'object' && !Array.isArray(task))) {
    throw new Error('Task ledger must be an array of task objects; refusing to reset it');
  }
  return tasks;
}

const initialTasks = loadTasks();
let changed = false;
for (const task of initialTasks) {
  if (task.status === 'running') {
    task.status = 'error';
    task.error = 'Server restarted while running';
    task.updatedAt = new Date().toISOString();
    changed = true;
  }
}
if (changed) writeFileSync(DATA_FILE, JSON.stringify(initialTasks, null, 2), 'utf8');

function saveTasks(tasks) { writeFileSync(DATA_FILE, JSON.stringify(tasks, null, 2), 'utf8'); }
function json(res, status, body) {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
  res.end(JSON.stringify(body));
}
function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', chunk => {
      data += chunk;
      if (data.length > 1_000_000) { reject(new Error('Request too large')); req.destroy(); }
    });
    req.on('end', () => {
      try { resolve(JSON.parse(data || '{}')); } catch { reject(new Error('Invalid JSON')); }
    });
    req.on('error', reject);
  });
}
function addLog(taskId, chunk, stream = 'out') {
  const tasks = loadTasks();
  const task = tasks.find(item => item.id === taskId);
  if (!task) return;
  const message = String(chunk).slice(-8000);
  task.logs = (task.logs || '').concat(stream === 'err' ? `\n${message}` : message).slice(-30000);
  task.updatedAt = new Date().toISOString();
  saveTasks(tasks);
}
function updateTask(taskId, changes) {
  const tasks = loadTasks();
  const i = tasks.findIndex(item => item.id === taskId);
  if (i < 0) return;
  tasks[i] = { ...tasks[i], ...changes, updatedAt: new Date().toISOString() };
  saveTasks(tasks);
}

async function gitChanges(workspace) {
  try {
    const { stdout } = await execFileAsync('git', ['status', '--short'], { cwd: workspace, timeout: 8000, windowsHide: true });
    return stdout.trim().split('\n').filter(Boolean).map(line => line.trim());
  } catch {
    return [];
  }
}

function taskById(id) { return loadTasks().find(item => item.id === id); }

// Team work is deliberately sequential.  Website-only subscriptions cannot be
// controlled by a background bot, so the owner sends those prompts and pastes
// the answer back.  The coding CLI only starts after its research input exists.
async function advanceTeam(taskId) {
  const completed = taskById(taskId);
  if (!completed?.parentId || completed.status !== 'done') return;
  const tasks = loadTasks();
  const parent = tasks.find(item => item.id === completed.parentId);
  if (!parent) return;
  const children = tasks.filter(item => item.parentId === parent.id);
  const implementation = children.find(item => item.agent === 'gemini');
  const research = children.find(item => item.agent === 'perplexity');
  const review = children.find(item => item.agent === 'grok');

  if (completed.id === research?.id && implementation?.status === 'blocked') {
    const context = `\n\n以下是研究 AI 已完成的資料，請以它為依據實作：\n${research.response}`;
    updateTask(implementation.id, { status: 'queued', prompt: implementation.prompt + context });
    updateTask(parent.id, { status: 'running' });
    return;
  }
  if (completed.id === implementation?.id && review?.status === 'blocked') {
    const changed = (completed.changes || []).join('\n') || '無法取得 Git 變更清單（可能尚未初始化 Git）。';
    updateTask(review.id, {
      status: 'planned',
      prompt: review.prompt + `\n\n程式 AI 的完成摘要：\n${completed.response || completed.logs}\n\n偵測到的檔案變更：\n${changed}`
    });
    return;
  }
  if (completed.id === review?.id) {
    updateTask(parent.id, { status: 'ready_for_approval', finishedAt: new Date().toISOString() });
  }
}
function validWorkspace(value) {
  if (typeof value !== 'string' || !path.isAbsolute(value)) return false;
  try { return statSync(value).isDirectory(); } catch { return false; }
}

async function checkProvider(url) {
  return new Promise((resolve) => {
    const req = https.get(url, { timeout: 3000 }, (res) => {
      resolve(res.statusCode >= 200 && res.statusCode < 400);
      res.resume();
    });
    req.on('error', () => resolve(false));
    req.on('timeout', () => { req.destroy(); resolve(false); });
  });
}

async function checkAntigravity() {
  try {
    const { stdout } = await execFileAsync(AGY, ['--version'], { timeout: 5000, windowsHide: true });
    return { available: true, version: stdout.trim() || 'Antigravity CLI available' };
  } catch (error) {
    return { available: false, version: null, message: error.code === 'ENOENT' ? '找不到 agy；請在安裝 Antigravity CLI 並登入的電腦執行本 App。' : (error.stderr || error.message).trim() };
  }
}

function runGemini(task) {
  updateTask(task.id, { status: 'running', startedAt: new Date().toISOString(), logs: '啟動 Antigravity CLI…\n' });
  const args = ['-p', task.prompt, '--mode=accept-edits', '--output-format', 'json'];
  let stdout = '';
  let stderr = '';
  const child = spawn(AGY, args, {
    cwd: task.workspace,
    env: { ...process.env, NO_COLOR: '1' },
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
    shell: false
  });
  child.stdout.on('data', chunk => { stdout += chunk; addLog(task.id, chunk); });
  child.stderr.on('data', chunk => { stderr += chunk; addLog(task.id, chunk, 'err'); });
  child.on('error', error => updateTask(task.id, { status: 'error', error: error.message, finishedAt: new Date().toISOString() }));
  child.on('close', async code => {
    const current = loadTasks().find(item => item.id === task.id);
    if (!current || current.status === 'error') return;
    let response = '';
    try { const parsed = JSON.parse(stdout); response = parsed.response || parsed.result || stdout; }
    catch { response = stdout.trim(); }
    const changes = code === 0 ? await gitChanges(task.workspace) : [];
    updateTask(task.id, { status: code === 0 ? 'done' : 'error', exitCode: code, response, changes, error: code === 0 ? '' : stderr.trim(), finishedAt: new Date().toISOString() });
    if (code === 0) await advanceTeam(task.id);
  });
}

function sendFile(res, filePath) {
  const ext = path.extname(filePath);
  const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml' };
  res.writeHead(200, { 'content-type': types[ext] || 'application/octet-stream', 'cache-control': 'no-cache' });
  res.end(readFileSync(filePath));
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${HOST}:${PORT}`);
  if (req.method === 'GET' && url.pathname === '/api/health') {
    const [cli, perplexity, grok] = await Promise.all([
      checkAntigravity(),
      checkProvider('https://www.perplexity.ai/'),
      checkProvider('https://grok.com/')
    ]);
    return json(res, 200, { ok: true, cli, perplexity, grok, platform: os.platform(), defaultWorkspace: process.cwd() });
  }
  if (req.method === 'GET' && url.pathname === '/api/accounts') {
    const accounts = loadAccounts();
    const now = new Date().toISOString();
    return json(res, 200, { ok: true, accounts: accounts.map(a => ({ ...a, lastVerifiedAt: now })) });
  }
  if (req.method === 'POST' && url.pathname === '/api/accounts') {
    let body;
    try { body = await readBody(req); } catch (e) { return json(res, 400, { error: e.message }); }
    const { name, provider, mode } = body;
    if (!name || typeof name !== 'string' || !name.trim()) return json(res, 400, { error: '請輸入帳號名稱' });
    const validProviders = ['gemini', 'codex', 'claude', 'copilot', 'grok', 'perplexity', 'mistral', 'deepseek', 'meta', 'qwen', 'kimi', 'poe', 'huggingface', 'ollama', 'custom'];
    if (!validProviders.includes(provider)) return json(res, 400, { error: '請選擇有效的 Provider' });
    const isPaid = mode === 'paid_api';
    const oauthUrls = {
      gemini: 'https://accounts.google.com/o/oauth2/v2/auth',
      codex: 'https://auth.openai.com/authorize',
      claude: 'https://claude.ai/login',
      perplexity: 'https://www.perplexity.ai/',
      grok: 'https://grok.com/'
    };
    const newAcc = {
      id: 'acc_' + randomUUID().slice(0, 8),
      name: name.trim(),
      provider,
      mode: isPaid ? 'paid_api' : 'subscription_cli',
      status: 'login_required',
      active: true,
      note: isPaid ? '警告：已手動啟用付費 API 模式，可能產生額外費用；不會自動 Fallback。' : '使用官方登入訂閱額度／官方 CLI 工具。',
      oauthUrl: oauthUrls[provider] || 'https://google.com'
    };
    const list = loadAccounts();
    list.push(newAcc);
    saveAccounts(list);
    return json(res, 201, { ok: true, account: newAcc });
  }
  const patchMatch = url.pathname.match(/^\/api\/accounts\/([\w-]+)$/);
  if (req.method === 'PATCH' && patchMatch) {
    let body;
    try { body = await readBody(req); } catch (e) { return json(res, 400, { error: e.message }); }
    const list = loadAccounts();
    const acc = list.find(a => a.id === patchMatch[1]);
    if (!acc) return json(res, 404, { error: '找不到該帳號' });
    if (typeof body.active === 'boolean') acc.active = body.active;
    if (typeof body.name === 'string' && body.name.trim()) acc.name = body.name.trim();
    saveAccounts(list);
    return json(res, 200, { ok: true, account: acc });
  }
  const deleteMatch = url.pathname.match(/^\/api\/accounts\/([\w-]+)$/);
  if (req.method === 'DELETE' && deleteMatch) {
    let list = loadAccounts();
    list = list.filter(a => a.id !== deleteMatch[1]);
    saveAccounts(list);
    return json(res, 200, { ok: true });
  }
  const loginMatch = url.pathname.match(/^\/api\/accounts\/([\w-]+)\/login$/);
  if (req.method === 'POST' && loginMatch) {
    const list = loadAccounts();
    const acc = list.find(a => a.id === loginMatch[1]);
    const oauthUrl = acc?.oauthUrl || 'https://accounts.google.com/o/oauth2/v2/auth';
    return json(res, 200, { ok: true, message: '請在開啟的官方瀏覽器頁面完成登入與授權', oauthUrl });
  }
  if (req.method === 'GET' && url.pathname === '/api/tasks') return json(res, 200, loadTasks().sort((a,b) => b.createdAt.localeCompare(a.createdAt)));
  if (req.method === 'POST' && url.pathname === '/api/tasks') {
    let body;
    try { body = await readBody(req); } catch (e) { return json(res, 400, { error: e.message }); }
    const { agent, prompt, workspace, mode, projectName, repoUrl, issueUrl } = body;
    if (!['gemini', 'codex', 'perplexity', 'grok', 'custom'].includes(agent)) return json(res, 400, { error: '請選擇有效的 AI 助理。' });
    if (typeof prompt !== 'string' || !prompt.trim()) return json(res, 400, { error: '請輸入任務內容。' });
    if ((mode === 'team' || agent === 'gemini') && !validWorkspace(workspace)) return json(res, 400, { error: 'Gemini 任務需要有效的絕對專案資料夾路徑。' });
    if (mode === 'team') {
      const rootId = randomUUID();
      const createdAt = new Date().toISOString();
      const context = `\n\n專案：${projectName || prompt.trim().slice(0, 36)}\nGitHub：${repoUrl || '尚未設定'}\nIssue/PR：${issueUrl || '尚未設定'}`;
      const rootTask = { id: rootId, kind: 'parent', role: '總控／專案管理', agent: 'manager', prompt: prompt.trim(), projectName: projectName || prompt.trim().slice(0, 36), repoUrl: repoUrl || '', issueUrl: issueUrl || '', workspace, status: 'waiting_research', response: '', logs: '', createdAt, updatedAt: createdAt };
      const children = [
        { id: randomUUID(), kind: 'child', parentId: rootId, role: '需求研究與資料查證', agent: 'perplexity', status: 'planned', prompt: `針對以下專案需求做研究與查證，列出可執行建議、風險和來源連結。\n\n需求：${prompt.trim()}${context}` },
        { id: randomUUID(), kind: 'child', parentId: rootId, role: '程式實作', agent: 'gemini', status: 'blocked', prompt: `請在目前工作資料夾直接實作以下專案需求。檢查現有架構，保留既有功能，完成後摘要修改檔案及驗證結果。\n\n需求：${prompt.trim()}${context}` },
        { id: randomUUID(), kind: 'child', parentId: rootId, role: '獨立審查與找問題', agent: 'grok', status: 'blocked', prompt: `請獨立審查以下需求與實作結果，找出缺漏、錯誤風險、測試不足處並提出具體修正建議。\n\n需求：${prompt.trim()}${context}` }
      ].map(child => ({ ...child, projectName: rootTask.projectName, repoUrl: rootTask.repoUrl, issueUrl: rootTask.issueUrl, workspace, response: '', logs: '', createdAt, updatedAt: createdAt }));
      const tasks = loadTasks(); tasks.push(rootTask, ...children); saveTasks(tasks);
      return json(res, 201, { ...rootTask, children });
    }
    const task = {
      id: randomUUID(), kind: 'standalone', agent, role: agent === 'gemini' ? '程式實作' : agent === 'perplexity' ? '研究與查證' : agent === 'codex' ? 'Codex（待授權）' : '獨立審查', prompt: prompt.trim(), workspace: workspace || '',
      status: agent === 'gemini' ? 'queued' : 'handoff', response: '', logs: '',
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
    };
    const tasks = loadTasks(); tasks.push(task); saveTasks(tasks);
    return json(res, 201, task);
  }
  const dispatchMatch = url.pathname.match(/^\/api\/tasks\/([\w-]+)\/dispatch$/);
  if (req.method === 'POST' && dispatchMatch) {
    const task = loadTasks().find(item => item.id === dispatchMatch[1]);
    if (!task) return json(res, 404, { error: '找不到任務。' });
    // Only external planned tasks can be handed off. Never turn a queued/running
    // Gemini job or a completed/cancelled task into a manual handoff.
    if (task.agent === 'gemini' || !['planned', 'handoff'].includes(task.status)) {
      return json(res, 409, { error: '只有等待交辦的外部 AI 任務可以手動交接。' });
    }
    if (task.status === 'planned') updateTask(task.id, { status: 'handoff', dispatchedAt: new Date().toISOString() });
    return json(res, 200, { ok: true, task: { ...task, status: 'handoff' } });
  }
  const resultMatch = url.pathname.match(/^\/api\/tasks\/([\w-]+)\/result$/);
  if (req.method === 'POST' && resultMatch) {
    let body;
    try { body = await readBody(req); } catch (e) { return json(res, 400, { error: e.message }); }
    if (typeof body.response !== 'string' || !body.response.trim()) return json(res, 400, { error: '請貼上 AI 回覆。' });
    const task = loadTasks().find(item => item.id === resultMatch[1]);
    if (!task) return json(res, 404, { error: '找不到任務。' });
    // A pasted response is evidence of manual handoff only; it must never
    // overwrite a CLI task or fabricate success for blocked/completed work.
    if (task.agent === 'gemini' || task.status !== 'handoff') {
      return json(res, 409, { error: '僅允許已交辦的外部 AI 任務貼回真實回覆。' });
    }
    updateTask(task.id, { response: body.response.trim(), status: 'done', finishedAt: new Date().toISOString() });
    await advanceTeam(task.id);
    return json(res, 200, { ok: true });
  }
  const cancelMatch = url.pathname.match(/^\/api\/tasks\/([\w-]+)\/cancel$/);
  if (req.method === 'POST' && cancelMatch) {
    updateTask(cancelMatch[1], { status: 'cancelled', finishedAt: new Date().toISOString() });
    return json(res, 200, { ok: true });
  }
  const safePath = path.normalize(decodeURIComponent(url.pathname)).replace(/^([/\\])+/, '');
  const file = path.join(PUBLIC_DIR, safePath || 'index.html');
  if (!file.startsWith(PUBLIC_DIR) || !existsSync(file) || statSync(file).isDirectory()) return json(res, 404, { error: 'Not found' });
  sendFile(res, file);
});


setInterval(() => {
  const tasks = loadTasks();
  if (tasks.some(t => t.agent === 'gemini' && t.status === 'running')) return;
  const queuedTask = tasks.find(t => t.agent === 'gemini' && t.status === 'queued');
  if (queuedTask) runGemini(queuedTask);
}, 3000);

server.listen(PORT, HOST, () => console.log(`AI Workbench is running at http://${HOST}:${PORT}`));

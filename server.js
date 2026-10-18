import http from 'node:http';
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
const DATA_FILE = path.join(DATA_DIR, 'tasks.json');
const SUB2API_FILE = path.join(DATA_DIR, 'sub2api.json');
const PORT = Number(process.env.PORT || 4173);
const HOST = '127.0.0.1';
const AGY = process.env.ANTIGRAVITY_CLI || 'agy';
const CODEX = process.env.CODEX_CLI || 'codex';
const CURSOR = process.env.CURSOR_AGENT_CLI || 'agent';
const PPLX_MCP = 'perplexity-computer';
const PPLX_URL = 'https://www.perplexity.ai/rest/computer/mcp';
const PUBLIC_DIR = path.join(ROOT, 'public');

mkdirSync(DATA_DIR, { recursive: true });
if (!existsSync(DATA_FILE)) writeFileSync(DATA_FILE, '[]', 'utf8');

function loadTasks() {
  try { return JSON.parse(readFileSync(DATA_FILE, 'utf8')); }
  catch { return []; }
}
function saveTasks(tasks) { writeFileSync(DATA_FILE, JSON.stringify(tasks, null, 2), 'utf8'); }
function loadSub2Api() {
  try { return JSON.parse(readFileSync(SUB2API_FILE, 'utf8')); }
  catch { return null; }
}
function saveSub2Api(config) {
  writeFileSync(SUB2API_FILE, JSON.stringify(config, null, 2), { encoding: 'utf8', mode: 0o600 });
}
function publicSub2ApiConfig() {
  const c = loadSub2Api() || {};
  return { gatewayConfigured: Boolean(c.baseUrl && c.apiKey && c.model), adminConfigured: Boolean(c.adminBaseUrl && c.adminKey), adminBaseUrl: c.adminBaseUrl || '' };
}
function safeAccount(a) {
  // Never send Sub2API credentials/tokens or arbitrary account metadata to the browser.
  const pick = (...keys) => { for (const key of keys) if (a?.[key] !== undefined && a[key] !== null) return a[key]; return ''; };
  return { id: pick('id'), name: pick('name','account_name','email'), platform: pick('platform'), type: pick('type','account_type'), status: pick('status'), schedulable: pick('schedulable'), groupIds: pick('group_ids','groupIds'), lastUsedAt: pick('last_used_at','lastUsedAt'), error: pick('error_message','errorMessage') };
}
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

// Team work is sequential and uses the user's locally authenticated official CLIs.
async function advanceTeam(taskId) {
  const completed = taskById(taskId);
  if (!completed?.parentId || completed.status !== 'done') return;
  const tasks = loadTasks();
  const parent = tasks.find(item => item.id === completed.parentId);
  if (!parent) return;
  const children = tasks.filter(item => item.parentId === parent.id);
  const planner = children.find(item => item.stage === 'planning');
  const research = children.find(item => item.agent === 'perplexity');
  const implementation = children.find(item => item.agent === 'gemini');
  const grokReview = children.find(item => item.stage === 'grok-review');
  const review = children.find(item => item.stage === 'review');

  if (completed.id === planner?.id && research?.status === 'blocked') {
    const nextPrompt = research.prompt + `\n\nGPT 的需求拆解與建議：\n${planner.response}\n\n請使用已授權的 Perplexity Computer MCP 工具查證並研究，回覆時附來源連結。`;
    updateTask(research.id, { status: 'queued', prompt: nextPrompt });
    runCodex(taskById(research.id), { usePerplexity: true });
    return;
  }
  if (completed.id === research?.id && implementation?.status === 'blocked') {
    const context = `\n\n以下是 Perplexity Computer 研究結果，請以它為依據實作：\n${research.response}`;
    updateTask(implementation.id, { status: 'queued', prompt: implementation.prompt + context });
    updateTask(parent.id, { status: 'running' });
    runGemini(taskById(implementation.id));
    return;
  }
  if (completed.id === implementation?.id && review?.status === 'blocked') {
    const changed = (completed.changes || []).join('\n') || '無法取得 Git 變更清單（可能尚未初始化 Git）。';
    if (grokReview?.status === 'blocked') {
      const grokPrompt = grokReview.prompt + `\n\nGemini 完成摘要：\n${completed.response || completed.logs}\n\n偵測到的檔案變更：\n${changed}`;
      updateTask(grokReview.id, { status: 'queued', prompt: grokPrompt });
      runSub2Api(taskById(grokReview.id));
    } else {
      const reviewPrompt = review.prompt + `\n\n程式 AI 的完成摘要：\n${completed.response || completed.logs}\n\n偵測到的檔案變更：\n${changed}`;
      updateTask(review.id, { status: 'queued', prompt: reviewPrompt });
      runCodex(taskById(review.id), { readOnly: true });
    }
    return;
  }
  if (completed.id === grokReview?.id && review?.status === 'blocked') {
    const reviewPrompt = review.prompt + `\n\nSub2API Gateway 模型提供的獨立複核：\n${completed.response}\n\n請再檢查工作區和實作，不要盲目接受複核結論。`;
    updateTask(review.id, { status: 'queued', prompt: reviewPrompt });
    runCodex(taskById(review.id), { readOnly: true });
    return;
  }
  if (completed.id === review?.id) {
    updateTask(parent.id, { status: 'ready_for_approval', finishedAt: new Date().toISOString(), response: completed.response });
  }
}
function validWorkspace(value) {
  if (typeof value !== 'string' || !path.isAbsolute(value)) return false;
  try { return statSync(value).isDirectory(); } catch { return false; }
}

async function checkAntigravity() {
  try {
    const { stdout } = await execFileAsync(AGY, ['--version'], { timeout: 5000, windowsHide: true });
    const verified = loadTasks().some(task => task.agent === 'gemini' && task.providerConnectionVerified === true);
    return { available: true, connected: verified, version: stdout.trim() || 'Antigravity CLI available', detail: verified ? '已由成功的 Antigravity 任務驗證。' : 'CLI 已安裝；Google 登入會在首次成功的任務中驗證。' };
  } catch (error) {
    return { available: false, connected: false, version: null, message: error.code === 'ENOENT' ? '找不到 agy；請安裝 Antigravity CLI 後再連結。' : (error.stderr || error.message).trim() };
  }
}

async function checkCodex() {
  try {
    const { stdout: version } = await execFileAsync(CODEX, ['--version'], { timeout: 5000, windowsHide: true });
    let auth = '';
    try { const result = await execFileAsync(CODEX, ['login', 'status'], { timeout: 8000, windowsHide: true }); auth = `${result.stdout}\n${result.stderr}`; }
    catch (error) { auth = `${error.stdout || ''}\n${error.stderr || error.message}`; }
    return { available: true, connected: /logged in|signed in|chatgpt/i.test(auth) && !/not logged|not signed|unauthenticated/i.test(auth), version: version.trim(), detail: auth.trim() };
  } catch (error) {
    return { available: false, connected: false, version: null, detail: error.code === 'ENOENT' ? '找不到 Codex CLI。' : (error.stderr || error.stdout || error.message).trim() };
  }
}

async function checkCursor() {
  try {
    const { stdout: version } = await execFileAsync(CURSOR, ['--version'], { timeout: 5000, windowsHide: true });
    let status = '';
    try { const r = await execFileAsync(CURSOR, ['status'], { timeout: 8000, windowsHide: true }); status = `${r.stdout}\n${r.stderr}`; }
    catch (e) { status = `${e.stdout || ''}\n${e.stderr || e.message}`; }
    const connected = !/not authenticated|not logged|unauthenticated|log in to cursor/i.test(status) && /authenticated|logged in|account|cursor/i.test(status);
    return { available: true, connected, version: version.trim(), detail: status.trim() };
  } catch (error) {
    return { available: false, connected: false, version: null, detail: error.code === 'ENOENT' ? '尚未安裝 Cursor Agent CLI。Windows PowerShell 安裝指令：irm "https://cursor.com/install?win32=true" | iex。安裝後重新啟動本工作台，再按連結。' : (error.stderr || error.message).trim() };
  }
}

function runCursor(task) {
  updateTask(task.id, { status: 'running', startedAt: new Date().toISOString(), logs: 'Cursor Agent 正在處理工作區…\n' });
  const child = spawn(CURSOR, ['-p', task.prompt, '--output-format', 'text'], {
    cwd: task.workspace, env: { ...process.env, NO_COLOR: '1' },
    stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true, shell: false
  });
  let stdout = '', stderr = '';
  child.stdout.on('data', chunk => { stdout += chunk; addLog(task.id, chunk); });
  child.stderr.on('data', chunk => { stderr += chunk; addLog(task.id, chunk, 'err'); });
  child.on('error', error => updateTask(task.id, { status: 'error', error: error.message, finishedAt: new Date().toISOString() }));
  child.on('close', async code => {
    const current = taskById(task.id); if (!current || current.status === 'error') return;
    const ok = code === 0 && stdout.trim().length > 0;
    const changes = ok ? await gitChanges(task.workspace) : [];
    updateTask(task.id, { status: ok ? 'done' : 'error', exitCode: code ?? 1, response: stdout.trim(), changes, providerConnectionVerified: ok, error: ok ? '' : (stderr.trim() || 'Cursor Agent 沒有成功完成任務。'), finishedAt: new Date().toISOString() });
  });
}

async function checkPerplexity() {
  try {
    const { stdout } = await execFileAsync(CODEX, ['mcp', 'list'], { timeout: 8000, windowsHide: true });
    const line = stdout.split(/\r?\n/).find(row => row.toLowerCase().includes(PPLX_MCP));
    if (!line) return { available: true, configured: false, connected: false, detail: '尚未加入 Perplexity Computer MCP。' };
    const verified = loadTasks().some(task => task.agent === 'perplexity' && task.providerConnectionVerified === true);
    return { available: true, configured: true, connected: verified, detail: verified ? '已由成功的 Perplexity Computer MCP 任務驗證。' : 'MCP 已設定；OAuth 必須由首次成功的 Computer 呼叫驗證。' };
  } catch (error) {
    return { available: false, configured: false, connected: false, detail: error.code === 'ENOENT' ? '需要先安裝 Codex CLI。' : (error.stderr || error.message).trim() };
  }
}

async function testSub2Api(config = loadSub2Api(), { probe = false } = {}) {
  if (!config?.baseUrl || !config?.apiKey || !config?.model) return { configured: false, connected: false, detail: '尚未設定 Sub2API Gateway。' };
  try {
    const baseUrl = config.baseUrl.replace(/\/+$/, '');
    const response = await fetch(`${baseUrl}/models`, { headers: { authorization: `Bearer ${config.apiKey}` }, signal: AbortSignal.timeout(8000) });
    if (!response.ok) return { configured: true, connected: false, detail: `Gateway 回應 HTTP ${response.status}；請檢查網址與 Gateway Key。` };
    const body = await response.json();
    const models = Array.isArray(body.data) ? body.data.map(item => item.id).filter(Boolean) : [];
    if (!models.length) return { configured: true, connected: false, detail: 'Gateway 有回應，但沒有提供可用模型清單；不會標記為已連線。' };
    if (!models.includes(config.model)) return { configured: true, connected: false, detail: `Gateway 已回應，但模型清單沒有 ${config.model}。`, models: models.slice(0, 100) };
    if (!probe) return { configured: true, connected: true, model: config.model, detail: `Gateway Key 與模型 ${config.model} 可用；實際派工時才會呼叫模型。`, models: models.slice(0, 100) };
    const probeResponse = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: { authorization: `Bearer ${config.apiKey}`, 'content-type': 'application/json' },
      body: JSON.stringify({ model: config.model, messages: [{ role: 'user', content: 'Reply with OK.' }], max_tokens: 8 }),
      signal: AbortSignal.timeout(30000)
    });
    const probeBody = await probeResponse.json().catch(() => ({}));
    if (!probeResponse.ok) return { configured: true, connected: false, detail: `模型實際請求失敗 HTTP ${probeResponse.status}：${probeBody.error?.message || probeBody.message || '請檢查上游帳號授權與模型路由。'}`, models: models.slice(0, 100) };
    if (!probeBody.choices?.[0]?.message?.content) return { configured: true, connected: false, detail: '模型測試請求沒有返回文字；不會標記為已連線。', models: models.slice(0, 100) };
    return { configured: true, connected: true, model: config.model, detail: `已成功呼叫模型 ${config.model}；請在 Sub2API 查看實際路由帳號。`, models: models.slice(0, 100) };
  } catch (error) {
    return { configured: true, connected: false, detail: `連不到 Sub2API：${error.name === 'TimeoutError' ? '逾時' : error.message}` };
  }
}

async function runSub2Api(task) {
  const config = loadSub2Api();
  updateTask(task.id, { status: 'running', startedAt: new Date().toISOString(), logs: 'Sub2API Gateway 模型正進行獨立複核…\n' });
  try {
    const response = await fetch(`${config.baseUrl.replace(/\/+$/, '')}/chat/completions`, {
      method: 'POST',
      headers: { authorization: `Bearer ${config.apiKey}`, 'content-type': 'application/json' },
      body: JSON.stringify({ model: config.model, messages: [
        { role: 'system', content: '你是獨立程式碼審查員。根據需求、摘要與變更清單，找出實際風險、漏做項目和可驗證的建議。不要宣稱已自行修改檔案。以繁體中文回答。' },
        { role: 'user', content: task.prompt }
      ], temperature: 0.2 }),
      signal: AbortSignal.timeout(180000)
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(`Sub2API 回應 HTTP ${response.status}：${body.error?.message || body.message || '請檢查帳號、模型路由與 Gateway 記錄。'}`);
    const result = body.choices?.[0]?.message?.content;
    if (typeof result !== 'string' || !result.trim()) throw new Error('Gateway 有回應，但沒有收到模型文字結果。');
    updateTask(task.id, { status: 'done', response: result, logs: '已收到 Sub2API 路由模型的實際回覆。\n', providerConnectionVerified: true, finishedAt: new Date().toISOString() });
    await advanceTeam(task.id);
  } catch (error) {
    updateTask(task.id, { status: 'error', error: error.message, logs: error.message, finishedAt: new Date().toISOString() });
    if (task.parentId) updateTask(task.parentId, { status: 'error', error: `Sub2API Gateway 複核失敗，已停止後續分工：${error.message}`, finishedAt: new Date().toISOString() });
  }
}

function launchLogin(provider) {
  const isWindows = process.platform === 'win32';
  const isMac = process.platform === 'darwin';
  let command, args;
  if (provider === 'gpt') {
    command = CODEX; args = ['login'];
  } else if (provider === 'gemini') {
    command = AGY; args = [];
  } else if (provider === 'cursor') {
    command = CURSOR; args = ['login'];
  } else if (provider === 'perplexity') {
    const ps = `$ErrorActionPreference='Continue'; codex mcp get ${PPLX_MCP} *> $null; if ($LASTEXITCODE -ne 0) { codex mcp add ${PPLX_MCP} --url ${PPLX_URL} }; codex mcp login ${PPLX_MCP}`;
    const sh = `codex mcp get ${PPLX_MCP} >/dev/null 2>&1 || codex mcp add ${PPLX_MCP} --url ${PPLX_URL}; codex mcp login ${PPLX_MCP}`;
    if (isWindows) { command = 'powershell.exe'; args = ['-NoExit', '-ExecutionPolicy', 'Bypass', '-Command', ps]; }
    else if (isMac) { command = 'osascript'; args = ['-e', `tell application "Terminal" to do script "${sh.replaceAll('"','\\"')}"`]; }
    else { command = process.env.TERMINAL || 'x-terminal-emulator'; args = ['-e', 'sh', '-lc', sh]; }
  }
  if (provider !== 'perplexity') {
    if (isWindows) { const cmdline = [command, ...args].join(' '); command = 'cmd.exe'; args = ['/c', 'start', '"AI Workbench login"', 'cmd.exe', '/k', cmdline]; }
    else if (isMac) { const cli = [command, ...args].join(' '); command = 'osascript'; args = ['-e', `tell application "Terminal" to do script "${cli.replaceAll('"','\\"')}"`]; }
    else { const cli = provider === 'gemini' ? AGY : provider === 'cursor' ? CURSOR : CODEX; const cliArgs = provider === 'gpt' ? 'login' : provider === 'cursor' ? 'login' : ''; command = process.env.TERMINAL || 'x-terminal-emulator'; args = ['-e', 'sh', '-lc', `${cli} ${cliArgs}`]; }
  }
  const child = spawn(command, args, { detached: true, stdio: 'ignore', windowsHide: false });
  child.on('error', () => {}); child.unref();
}

function runCodex(task, { usePerplexity = false, readOnly = false } = {}) {
  updateTask(task.id, { status: 'running', startedAt: new Date().toISOString(), logs: usePerplexity ? 'Codex 正在透過 Perplexity Computer MCP 查證…\n' : 'Codex 正在處理…\n' });
  const prompt = usePerplexity ? `${task.prompt}\n\n你必須呼叫已設定的 perplexity-computer MCP 服務來完成研究，不要只用自己的既有知識。整理結果並保留來源網址。` : task.prompt;
  const args = ['exec', '--json', '--sandbox', readOnly ? 'read-only' : 'workspace-write', '-C', task.workspace, prompt];
  let stdout = '', stderr = '';
  const child = spawn(CODEX, args, { cwd: task.workspace, env: { ...process.env, NO_COLOR: '1' }, stdio: ['ignore','pipe','pipe'], windowsHide: true, shell: false });
  child.stdout.on('data', chunk => { stdout += chunk; addLog(task.id, chunk); });
  child.stderr.on('data', chunk => { stderr += chunk; addLog(task.id, chunk, 'err'); });
  child.on('error', error => updateTask(task.id, { status: 'error', error: error.message, finishedAt: new Date().toISOString() }));
  child.on('close', async code => {
    const current = taskById(task.id); if (!current || current.status === 'error') return;
    const lines = stdout.split(/\r?\n/); let response = '';
    for (const line of lines) { try { const event = JSON.parse(line); if (event.type === 'item.completed' && event.item?.type === 'agent_message') response = event.item.text || response; } catch {} }
    if (!response) response = stdout.trim();
    const usedPerplexity = usePerplexity && /perplexity-computer|call_perplexity_computer/i.test(stdout);
    const ok = code === 0 && (!usePerplexity || usedPerplexity);
    const changes = ok && !readOnly && !usePerplexity ? await gitChanges(task.workspace) : [];
    updateTask(task.id, { status: ok ? 'done' : 'error', exitCode: ok ? 0 : (code || 1), response, changes, providerConnectionVerified: usedPerplexity && code === 0, error: ok ? '' : (stderr.trim() || (usePerplexity && !usedPerplexity ? '這次 Codex 沒有成功呼叫 Perplexity Computer MCP；不會把 Perplexity 標成已連線。請檢查 OAuth 狀態與執行記錄。' : response)), finishedAt: new Date().toISOString() });
    if (ok) await advanceTeam(task.id);
  });
}

function runGemini(task) {
  updateTask(task.id, { status: 'running', startedAt: new Date().toISOString(), logs: '啟動 Antigravity CLI…\n' });
  const args = ['-p', task.prompt, '--output-format', 'json'];
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
    let finalCode = code;
    try { const envelope = JSON.parse(stdout); if (envelope.status !== 'SUCCESS') finalCode = 1; }
    catch { if (!stdout.trim()) finalCode = 1; }
    const changes = finalCode === 0 ? await gitChanges(task.workspace) : [];
    updateTask(task.id, { status: finalCode === 0 ? 'done' : 'error', exitCode: finalCode, response, changes, providerConnectionVerified: finalCode === 0, error: finalCode === 0 ? '' : (stderr.trim() || response), finishedAt: new Date().toISOString() });
    if (finalCode === 0) await advanceTeam(task.id);
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
    const [gemini, gpt, perplexity, cursor] = await Promise.all([checkAntigravity(), checkCodex(), checkPerplexity(), checkCursor()]);
    const grok = await testSub2Api();
    return json(res, 200, { ok: true, providers: { gemini, gpt, perplexity, cursor, grok }, cli: gemini, platform: os.platform(), defaultWorkspace: process.cwd() });
  }
  if (req.method === 'POST' && url.pathname === '/api/sub2api/connect') {
    let body;
    try { body = await readBody(req); } catch (e) { return json(res, 400, { error: e.message }); }
    const baseUrl = typeof body.baseUrl === 'string' ? body.baseUrl.trim().replace(/\/+$/, '') : '';
    const apiKey = typeof body.apiKey === 'string' ? body.apiKey.trim() : '';
    const model = typeof body.model === 'string' ? body.model.trim() : '';
    let parsedUrl;
    try { parsedUrl = new URL(baseUrl); } catch { return json(res, 400, { error: '請輸入有效網址，例如 http://127.0.0.1:8080/v1。' }); }
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) return json(res, 400, { error: 'Gateway 網址必須使用 HTTP 或 HTTPS。' });
    if (!apiKey || !model) return json(res, 400, { error: '請輸入 Sub2API Gateway Key 和模型名稱。' });
    const previous = loadSub2Api() || {};
    const config = { ...previous, baseUrl, apiKey, model };
    const status = await testSub2Api(config, { probe: true });
    if (!status.connected) return json(res, 502, { error: status.detail, models: status.models || [] });
    saveSub2Api(config);
    return json(res, 200, { ok: true, message: status.detail, models: status.models || [] });
  }
  if (req.method === 'GET' && url.pathname === '/api/sub2api/config') return json(res, 200, publicSub2ApiConfig());
  if (req.method === 'POST' && url.pathname === '/api/sub2api/admin-config') {
    let body; try { body = await readBody(req); } catch (e) { return json(res, 400, { error: e.message }); }
    let adminBaseUrl; try { adminBaseUrl = new URL(String(body.baseUrl || '')).toString().replace(/\/$/, ''); } catch { return json(res, 400, { error: '請輸入 Sub2API 管理介面的網址。' }); }
    const adminKey = String(body.adminKey || '').trim();
    if (!['http:','https:'].includes(new URL(adminBaseUrl).protocol) || !adminKey) return json(res, 400, { error: '請輸入有效網址與管理員 API Key。' });
    const prev = loadSub2Api() || {};
    const probe = await fetch(`${adminBaseUrl}/api/v1/admin/accounts?page=1&page_size=100`, { headers: { 'x-api-key': adminKey }, signal: AbortSignal.timeout(10000) });
    const result = await probe.json().catch(() => ({}));
    if (!probe.ok) return json(res, 502, { error: `Sub2API 管理 API 回應 HTTP ${probe.status}；確認管理員 API Key 與網址。` });
    const data = result.data ?? result;
    const accounts = Array.isArray(data) ? data : data.items || data.accounts || data.list || [];
    if (!Array.isArray(accounts)) return json(res, 502, { error: '管理 API 有回應，但無法辨識帳號清單格式。' });
    saveSub2Api({ ...prev, adminBaseUrl, adminKey });
    return json(res, 200, { ok: true, total: data.total ?? data.pagination?.total ?? accounts.length, accounts: accounts.map(safeAccount) });
  }
  if (req.method === 'GET' && url.pathname === '/api/sub2api/accounts') {
    const c = loadSub2Api() || {};
    if (!c.adminBaseUrl || !c.adminKey) return json(res, 409, { error: '尚未設定 Sub2API 管理員唯讀入口。' });
    try {
      const upstream = await fetch(`${c.adminBaseUrl}/api/v1/admin/accounts?page=1&page_size=100`, { headers: { 'x-api-key': c.adminKey }, signal: AbortSignal.timeout(10000) });
      const result = await upstream.json().catch(() => ({}));
      if (!upstream.ok) return json(res, 502, { error: `Sub2API 管理 API 回應 HTTP ${upstream.status}。` });
      const data = result.data ?? result;
      const accounts = Array.isArray(data) ? data : data.items || data.accounts || data.list || [];
      return json(res, 200, { total: data.total ?? data.pagination?.total ?? accounts.length, accounts: accounts.map(safeAccount) });
    } catch (e) { return json(res, 502, { error: `無法讀取 Sub2API 帳號：${e.message}` }); }
  }
  const connectMatch = url.pathname.match(/^\/api\/connect\/(gemini|gpt|perplexity|cursor)$/);
  if (req.method === 'POST' && connectMatch) {
    const provider = connectMatch[1];
    if (provider === 'gpt' && !(await checkCodex()).available) return json(res, 409, { error: '此電腦找不到 Codex CLI。請先安裝官方 Codex CLI，再按連線。' });
    if (provider === 'perplexity' && !(await checkCodex()).available) return json(res, 409, { error: 'Perplexity Computer OAuth 由 Codex MCP 啟動，請先安裝官方 Codex CLI。' });
    if (provider === 'gemini' && !(await checkAntigravity()).available) return json(res, 409, { error: '此電腦找不到 Antigravity CLI (agy)。請先安裝官方 CLI，再按連線。' });
    if (provider === 'cursor' && !(await checkCursor()).available) return json(res, 409, { error: '找不到 Cursor Agent CLI。請在 Windows PowerShell 執行：irm "https://cursor.com/install?win32=true" | iex。安裝後重新啟動本工作台，再按「連結帳號」；登入命令為 agent login。' });
    try { launchLogin(provider); return json(res, 200, { ok: true, message: '已開啟官方登入終端。請在新視窗完成登入授權，完成後回到工作台更新狀態。' }); }
    catch (error) { return json(res, 500, { error: `無法開啟登入視窗：${error.message}` }); }
  }
  if (req.method === 'GET' && url.pathname === '/api/tasks') return json(res, 200, loadTasks().sort((a,b) => b.createdAt.localeCompare(a.createdAt)));
  if (req.method === 'POST' && url.pathname === '/api/tasks') {
    let body;
    try { body = await readBody(req); } catch (e) { return json(res, 400, { error: e.message }); }
    const { agent, prompt, workspace, mode, projectName, repoUrl, issueUrl } = body;
    if (!['gemini', 'gpt', 'perplexity', 'cursor', 'custom'].includes(agent)) return json(res, 400, { error: '請選擇有效的 AI 助理。' });
    if (typeof prompt !== 'string' || !prompt.trim()) return json(res, 400, { error: '請輸入任務內容。' });
    if ((mode === 'team' || ['gemini','gpt','perplexity','cursor'].includes(agent)) && !validWorkspace(workspace)) return json(res, 400, { error: '自動執行任務需要有效的絕對本機專案資料夾路徑。' });
    if (agent === 'cursor') {
      const cursor = await checkCursor();
      if (!cursor.connected) return json(res, 409, { error: cursor.available ? 'Cursor 尚未登入。請按「連結 Cursor」完成 agent login，再更新狀態。' : '尚未安裝 Cursor Agent CLI；請先安裝並登入，再交辦 Cursor 任務。' });
    }
    if (mode === 'team' || agent === 'gpt' || agent === 'perplexity') {
      const [gpt, perplexity] = await Promise.all([checkCodex(), checkPerplexity()]);
      if (!gpt.connected) return json(res, 409, { error: 'GPT/Codex 尚未登入。請先在「AI 助理」按「連結帳號」，完成 ChatGPT 登入後更新狀態。' });
      if ((mode === 'team' || agent === 'perplexity') && !perplexity.configured) return json(res, 409, { error: 'Perplexity Computer 尚未設定。請先按「連結帳號」並在瀏覽器完成 OAuth。' });
      if (mode === 'team') {
        const gemini = await checkAntigravity();
        if (!gemini.available) return json(res, 409, { error: '找不到 Antigravity CLI (agy)，尚不能進行 Gemini 程式實作。' });
        const grok = await testSub2Api();
        if (!grok.connected) return json(res, 409, { error: `Sub2API Gateway 複核尚未驗證：${grok.detail} 請先設定 Sub2API Gateway。` });
      }
    }
    if (mode === 'team') {
      const rootId = randomUUID();
      const createdAt = new Date().toISOString();
      const context = `\n\n專案：${projectName || prompt.trim().slice(0, 36)}\nGitHub：${repoUrl || '尚未設定'}\nIssue/PR：${issueUrl || '尚未設定'}`;
      const rootTask = { id: rootId, kind: 'parent', role: '總控／專案管理', agent: 'manager', prompt: prompt.trim(), projectName: projectName || prompt.trim().slice(0, 36), repoUrl: repoUrl || '', issueUrl: issueUrl || '', workspace, status: 'waiting_research', response: '', logs: '', createdAt, updatedAt: createdAt };
      const children = [
        { id: randomUUID(), kind: 'child', parentId: rootId, stage: 'planning', role: '需求拆解與方案規劃', agent: 'gpt', status: 'queued', prompt: `請先拆解以下專案需求，整理目標、必要功能、建議架構、驗收條件與待確認風險。請提供可直接交給研究與程式實作 AI 的明確規格，不要假裝已修改檔案。\n\n需求：${prompt.trim()}${context}` },
        { id: randomUUID(), kind: 'child', parentId: rootId, role: '需求研究與資料查證', agent: 'perplexity', status: 'blocked', prompt: `針對以下專案需求做研究與查證，列出可執行建議、風險和來源連結。\n\n需求：${prompt.trim()}${context}` },
        { id: randomUUID(), kind: 'child', parentId: rootId, role: '程式實作', agent: 'gemini', status: 'blocked', prompt: `請在目前工作資料夾直接實作以下專案需求。檢查現有架構，保留既有功能，完成後摘要修改檔案及驗證結果。\n\n需求：${prompt.trim()}${context}` },
        { id: randomUUID(), kind: 'child', parentId: rootId, stage: 'grok-review', role: 'Sub2API 模型複核', agent: 'grok', status: 'blocked', prompt: `請獨立審查 Gemini 的實作，指出可重現的錯誤、需求缺漏、安全問題和建議測試。只審查，不修改檔案。\n\n需求：${prompt.trim()}${context}` },
        { id: randomUUID(), kind: 'child', parentId: rootId, stage: 'review', role: '獨立審查與找問題', agent: 'gpt', status: 'blocked', prompt: `請獨立審查以下需求與實作結果，找出缺漏、錯誤風險、測試不足處並提出具體修正建議。\n\n需求：${prompt.trim()}${context}` }
      ].map(child => ({ ...child, projectName: rootTask.projectName, repoUrl: rootTask.repoUrl, issueUrl: rootTask.issueUrl, workspace, response: '', logs: '', createdAt, updatedAt: createdAt }));
      const tasks = loadTasks(); tasks.push(rootTask, ...children); saveTasks(tasks);
      updateTask(children[0].id, { status: 'running', startedAt: new Date().toISOString(), logs: 'GPT 正在拆解需求…\n' });
      runCodex(taskById(children[0].id), { readOnly: true });
      return json(res, 201, { ...rootTask, children });
    }
    const task = {
      id: randomUUID(), kind: 'standalone', agent, role: agent === 'gemini' ? '程式實作' : agent === 'perplexity' ? '研究與查證' : '獨立審查', prompt: prompt.trim(), workspace: workspace || '',
      status: agent === 'gemini' || agent === 'gpt' || agent === 'perplexity' || agent === 'cursor' ? 'queued' : 'handoff', response: '', logs: '',
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
    };
    const tasks = loadTasks(); tasks.push(task); saveTasks(tasks);
    if (agent === 'gemini') runGemini(task);
    else if (agent === 'gpt') runCodex(task, { readOnly: true });
    else if (agent === 'perplexity') runCodex(task, { usePerplexity: true });
    else if (agent === 'cursor') runCursor(task);
    return json(res, 201, task);
  }
  const dispatchMatch = url.pathname.match(/^\/api\/tasks\/([\w-]+)\/dispatch$/);
  if (req.method === 'POST' && dispatchMatch) {
    const task = loadTasks().find(item => item.id === dispatchMatch[1]);
    if (!task) return json(res, 404, { error: '找不到任務。' });
    if (task.status === 'blocked') return json(res, 409, { error: '這個任務要等前一個子任務完成後才會解鎖。' });
    updateTask(task.id, { status: 'handoff', dispatchedAt: new Date().toISOString() });
    return json(res, 200, { ok: true, task: { ...task, status: 'handoff' } });
  }
  const resultMatch = url.pathname.match(/^\/api\/tasks\/([\w-]+)\/result$/);
  if (req.method === 'POST' && resultMatch) {
    let body;
    try { body = await readBody(req); } catch (e) { return json(res, 400, { error: e.message }); }
    if (typeof body.response !== 'string' || !body.response.trim()) return json(res, 400, { error: '請貼上 AI 回覆。' });
    const task = loadTasks().find(item => item.id === resultMatch[1]);
    if (!task) return json(res, 404, { error: '找不到任務。' });
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

server.listen(PORT, HOST, () => console.log(`AI Workbench is running at http://${HOST}:${PORT}`));

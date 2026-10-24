$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'

function Refresh-Path {
  $machine = [Environment]::GetEnvironmentVariable('Path', 'Machine')
  $user = [Environment]::GetEnvironmentVariable('Path', 'User')
  $env:Path = @($machine, $user, $env:Path) -join ';'
  $nodeDirs = @(
    (Join-Path $env:ProgramFiles 'nodejs'),
    (Join-Path $env:APPDATA 'npm'),
    (Join-Path $env:LOCALAPPDATA 'agy\bin'),
    (Join-Path $env:USERPROFILE '.local\bin')
  )
  foreach ($dir in $nodeDirs) { if ((Test-Path $dir) -and $env:Path -notlike "*$dir*") { $env:Path = "$dir;$env:Path" } }
}

function Ensure-Node {
  Refresh-Path
  $nodeCommand = Get-Command node -ErrorAction SilentlyContinue
  if ($nodeCommand) {
    $nodeMajor = [int](node -p "process.versions.node.split('.')[0]")
    if ($nodeMajor -ge 22) { Write-Host "Node.js: $(node --version)"; return }
    Write-Host "Node.js $(node --version) 太舊，正在透過 winget 升級到 LTS…"
    if (-not (Get-Command winget -ErrorAction SilentlyContinue)) { throw '目前 Node.js 低於 22，且找不到 winget。請先安裝 Node.js LTS：https://nodejs.org/。' }
    winget upgrade --id OpenJS.NodeJS.LTS --exact --accept-package-agreements --accept-source-agreements
    if ($LASTEXITCODE -ne 0) { throw 'Node.js 升級失敗。請從 https://nodejs.org/ 安裝 LTS，再重跑 setup.bat。' }
    Refresh-Path
    $nodeMajor = [int](node -p "process.versions.node.split('.')[0]")
    if ($nodeMajor -lt 22) { throw 'Node.js 已升級，但目前終端仍讀取舊版本。請關閉視窗再執行 setup.bat。' }
    return
  }
  if (-not (Get-Command winget -ErrorAction SilentlyContinue)) {
    throw '找不到 Node.js，也找不到 winget。請先安裝 Node.js LTS：https://nodejs.org/，再重新執行 setup.bat。'
  }
  Write-Host '正在從 Windows 套件管理員安裝 Node.js LTS…'
  winget install --id OpenJS.NodeJS.LTS --exact --accept-package-agreements --accept-source-agreements
  if ($LASTEXITCODE -ne 0) { throw 'Node.js 安裝失敗。請確認 winget 可用後再試。' }
  Refresh-Path
  if (-not (Get-Command node -ErrorAction SilentlyContinue)) { throw 'Node.js 已安裝，但目前終端尚未讀到新 PATH。請關閉視窗、重新執行 setup.bat。' }
  Write-Host "Node.js: $(node --version)"
}

function Ensure-Codex {
  Refresh-Path
  if (Get-Command codex -ErrorAction SilentlyContinue) { Write-Host "Codex CLI: $(codex --version)"; return }
  Write-Host '正在安裝官方 Codex CLI…'
  npm install --global @openai/codex@latest
  if ($LASTEXITCODE -ne 0) { throw 'Codex CLI 安裝失敗。請檢查網路，或在 PowerShell 執行 npm install -g @openai/codex@latest。' }
  Refresh-Path
  if (-not (Get-Command codex -ErrorAction SilentlyContinue)) { throw 'Codex CLI 已安裝但找不到命令；請重新開啟終端再執行 setup.bat。' }
  Write-Host "Codex CLI: $(codex --version)"
}

function Ensure-Antigravity {
  Refresh-Path
  if (Get-Command agy -ErrorAction SilentlyContinue) { Write-Host "Antigravity CLI: $(agy --version)"; return }
  Write-Host '正在從 Google 官方安裝 Antigravity CLI…'
  Invoke-RestMethod 'https://antigravity.google/cli/install.ps1' | Invoke-Expression
  Refresh-Path
  if (-not (Get-Command agy -ErrorAction SilentlyContinue)) { throw 'Antigravity CLI 安裝後找不到 agy；請重新開啟終端再執行 setup.bat。' }
  Write-Host "Antigravity CLI: $(agy --version)"
}

try {
  Ensure-Node
  Ensure-Codex
  Ensure-Antigravity
  Write-Host ''
  Write-Host '必要程式已準備好。接著啟動 AI 工作台；首次使用再於頁面按「連結帳號」。' -ForegroundColor Green
  Set-Location $PSScriptRoot
  $nodePath = (Get-Command node).Source
  $server = Start-Process -FilePath $nodePath -ArgumentList 'server.js' -WorkingDirectory $PSScriptRoot -PassThru
  $ready = $false
  for ($i = 0; $i -lt 20; $i++) {
    if ($server.HasExited) { throw '工作台伺服器無法啟動。請查看新開啟的 Node 視窗。' }
    try {
      $client = [Net.Sockets.TcpClient]::new()
      $client.Connect('127.0.0.1', 4173)
      $client.Dispose()
      $ready = $true
      break
    } catch { Start-Sleep -Seconds 1 }
  }
  if (-not $ready) { throw '等待工作台啟動逾時。請查看 Node 視窗的錯誤訊息。' }
  Start-Process 'http://127.0.0.1:4173'
  Write-Host '工作台已開啟；要停止時，關閉 Node 伺服器視窗。'
  Wait-Process -Id $server.Id
  exit 0
} catch {
  Write-Host "設定未完成：$($_.Exception.Message)" -ForegroundColor Red
  exit 1
}

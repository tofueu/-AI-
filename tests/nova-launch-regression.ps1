#requires -version 5.1
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$port = 4173
$listener = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
if ($listener) { throw "Port 4173 is already in use before the launcher test" }

$env:NOVA_NO_OVERLAY = '1'
$env:NOVA_NO_BROWSER = '1'
try {
    Push-Location $root
    try {
        & cmd.exe /d /c 'start.bat'
        if ($LASTEXITCODE -ne 0) { throw "start.bat failed with $LASTEXITCODE" }
    } finally {
        Pop-Location
    }

    $tasksResponse = Invoke-WebRequest -UseBasicParsing -Uri 'http://127.0.0.1:4173/api/tasks' -TimeoutSec 3
    if ($tasksResponse.StatusCode -ne 200 -or -not $tasksResponse.Content.TrimStart().StartsWith('[')) {
        throw 'Task endpoint did not return a JSON array'
    }

    $listener = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction Stop |
        Select-Object -First 1
    if (-not $listener -or -not $listener.OwningProcess) {
        throw 'Backend did not survive launcher exit'
    }
    $firstPid = $listener.OwningProcess

    Push-Location $root
    try {
        & cmd.exe /d /c 'start.bat'
        if ($LASTEXITCODE -ne 0) { throw "Second launch failed with $LASTEXITCODE" }
    } finally {
        Pop-Location
    }
    $secondPid = (Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction Stop |
        Select-Object -First 1).OwningProcess
    if ($firstPid -ne $secondPid) { throw 'Second launch replaced or duplicated backend' }

    Write-Host 'PASS: backend survives launcher exit and repeat launch reuses listener'
} finally {
    $listener = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue |
        Select-Object -First 1
    if ($listener -and $listener.OwningProcess) {
        Stop-Process -Id $listener.OwningProcess -Force -ErrorAction SilentlyContinue
    }
    Remove-Item Env:\NOVA_NO_OVERLAY -ErrorAction SilentlyContinue
    Remove-Item Env:\NOVA_NO_BROWSER -ErrorAction SilentlyContinue
}

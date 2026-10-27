#requires -version 5.1
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
. (Join-Path $root 'nova-tasks.ps1')
$port = Get-Random -Minimum 40000 -Maximum 60000
$env:PORT = [string]$port
$base = "http://127.0.0.1:$port"
$server = Start-Process -FilePath 'node.exe' -ArgumentList 'server.js' -WorkingDirectory $root -WindowStyle Hidden -PassThru
try {
    $ready = $false
    for ($i = 0; $i -lt 40; $i++) {
        if ($server.HasExited) { throw "Workbench server exited before readiness" }
        try {
            $initial = Invoke-WebRequest -UseBasicParsing -Uri "$base/api/tasks" -TimeoutSec 2
            if ($initial.StatusCode -eq 200) { $ready = $true; break }
        } catch { Start-Sleep -Milliseconds 250 }
    }
    if (-not $ready) { throw 'Workbench /api/tasks did not become ready' }
    $before = ConvertTo-NovaTaskArray -Json ([string]$initial.Content)
    if ($before -isnot [array]) { throw 'NOVA parser did not return a task array' }

    # A local custom task requires no provider login, payment, or network calls.
    $payload = '{"agent":"custom","prompt":"NOVA local integration smoke test"}'
    $created = Invoke-RestMethod -Uri "$base/api/tasks" -Method Post -ContentType 'application/json' -Body $payload -TimeoutSec 5
    if (-not $created.id) { throw 'Workbench failed to create a local custom task' }
    $response = Invoke-WebRequest -UseBasicParsing -Uri "$base/api/tasks" -TimeoutSec 5
    $tasks = ConvertTo-NovaTaskArray -Json ([string]$response.Content)
    $match = @($tasks | Where-Object { $_.id -eq $created.id })
    if ($match.Count -ne 1 -or $match[0].status -ne 'handoff') {
        throw 'NOVA parser lost the real Workbench handoff state'
    }
    Write-Output 'PASS: Live local Workbench API -> NOVA parser -> handoff state'
} finally {
    if ($server -and -not $server.HasExited) {
        Stop-Process -Id $server.Id -Force -ErrorAction SilentlyContinue
    }
}

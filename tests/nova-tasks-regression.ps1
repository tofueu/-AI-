#requires -version 5.1
$ErrorActionPreference = 'Stop'
. (Join-Path (Split-Path -Parent $PSScriptRoot) 'nova-tasks.ps1')

function Assert-Valid([string]$Json, [int]$Count) {
    $tasks = ConvertTo-NovaTaskArray -Json $Json
    if ($tasks -isnot [array]) { throw "Expected an array, got scalar" }
    if ($tasks.Count -ne $Count) { throw "Expected $Count tasks, got $($tasks.Count)" }
}

function Assert-Rejected([string]$Json) {
    $rejected = $false
    try { $null = ConvertTo-NovaTaskArray -Json $Json }
    catch { $rejected = $true }
    if (-not $rejected) { throw "Malformed task response was accepted: $Json" }
}

Assert-Valid -Json '[]' -Count 0
Assert-Valid -Json '[{"status":"running"}]' -Count 1
Assert-Valid -Json '[{"status":"done"},{"status":"error"}]' -Count 2
Assert-Rejected -Json '{"status":"done"}'
Assert-Rejected -Json 'null'
Assert-Rejected -Json '[null]'
Assert-Rejected -Json '[{}]'
Assert-Rejected -Json '[{"status":"running"},null]'
Assert-Rejected -Json '[{"status":'
Write-Output 'PASS: NOVA JSON array parsing, 1-task preservation and malformed-response rejection (9 cases)'

function Assert-Color([string]$Json, [string]$Expected) {
    $tasks = ConvertTo-NovaTaskArray -Json $Json
    $actual = Get-NovaTaskColor -Tasks $tasks
    if ($actual -ne $Expected) { throw "Expected NOVA color $Expected, got $actual for $Json" }
}

# Active work must win over historical failures. Only the latest terminal
# outcome should determine idle color. Empty/malformed/stale data fails closed.
Assert-Color -Json '[]' -Expected 'Gray'
Assert-Color -Json '[{"status":"error","updatedAt":"2026-10-27T08:00:00Z"},{"status":"running","updatedAt":"2026-10-27T08:01:00Z"}]' -Expected 'Blue'
Assert-Color -Json '[{"status":"error","updatedAt":"2026-10-27T08:00:00Z"},{"status":"handoff","updatedAt":"2026-10-27T08:01:00Z"}]' -Expected 'Yellow'
Assert-Color -Json '[{"status":"error","updatedAt":"2026-10-27T08:00:00Z"},{"status":"waiting_research","updatedAt":"2026-10-27T08:01:00Z"}]' -Expected 'Orange'
Assert-Color -Json '[{"status":"error","updatedAt":"2026-10-27T08:00:00Z"},{"status":"queued","updatedAt":"2026-10-27T08:01:00Z"}]' -Expected 'Gray'
Assert-Color -Json '[{"status":"error","updatedAt":"2026-10-27T08:00:00Z"},{"status":"done","updatedAt":"2026-10-27T08:01:00Z"}]' -Expected 'Green'
Assert-Color -Json '[{"status":"done","updatedAt":"2026-10-27T08:00:00Z"},{"status":"error","updatedAt":"2026-10-27T08:01:00Z"}]' -Expected 'Red'
Assert-Color -Json '[{"status":"done","updatedAt":"2026-10-27T08:00:00Z"}]' -Expected 'Green'
Assert-Color -Json '[{"status":"cancelled","updatedAt":"2026-10-27T08:00:00Z"}]' -Expected 'Gray'
Write-Output 'PASS: NOVA live/terminal task colors (9 cases)'


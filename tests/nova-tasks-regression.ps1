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

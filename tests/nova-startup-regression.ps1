#requires -version 5.1
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$bat = Get-Content -LiteralPath (Join-Path $root 'start.bat') -Raw

if ($bat -notmatch '(?i)start\s+"NOVA"\s+powershell\.exe\s+-NoProfile\s+-WindowStyle\s+Hidden\s+-STA\s+-File') {
    throw 'Workbench start.bat does not launch the NOVA WPF overlay'
}
if ($bat -notmatch '(?i)if exist "%~dp0nova\.ps1" if exist "%~dp0nova-tasks\.ps1"') {
    throw 'NOVA startup does not guard missing optional files'
}
if ($bat -match '(?i)-ExecutionPolicy\s+Bypass|Set-ExecutionPolicy|RunAs|Start-Process\s+.*-Verb\s+RunAs') {
    throw 'NOVA startup must not bypass execution policy or elevate privileges'
}
if ($bat -notmatch '(?m)^npm start\s*$') {
    throw 'Workbench server startup was removed'
}

foreach ($name in @('nova.ps1', 'nova-tasks.ps1', 'tests/nova-tasks-regression.ps1')) {
    $file = Join-Path $root $name
    $tokens = $null
    $errors = $null
    [void][System.Management.Automation.Language.Parser]::ParseFile($file, [ref]$tokens, [ref]$errors)
    if ($errors.Count -gt 0) {
        throw "PowerShell parser rejected $name : $($errors[0].Message)"
    }
}
Write-Output 'PASS: Workbench launches NOVA without privilege bypass; PowerShell scripts parse (5 checks)'

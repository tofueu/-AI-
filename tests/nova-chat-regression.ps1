#requires -version 5.1
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$chatFile = Join-Path $root 'nova-chat.ps1'
$overlayFile = Join-Path $root 'nova.ps1'
foreach ($file in @($chatFile, $overlayFile)) {
    $tokens = $null
    $errors = $null
    $null = [System.Management.Automation.Language.Parser]::ParseFile($file, [ref]$tokens, [ref]$errors)
    if ($errors.Count -ne 0) { throw "PowerShell syntax error in $file : $($errors[0])" }
}
. $chatFile

$payload = New-NovaChatTaskPayload -Agent 'grok' -Prompt '  hello  '
$parsed = ConvertFrom-Json -InputObject $payload
if ($parsed.agent -ne 'grok' -or $parsed.prompt -ne 'hello') {
    throw 'NOVA provider selection or prompt serialization failed'
}
if ($parsed.PSObject.Properties.Match('workspace').Count -ne 0) {
    throw 'Non-CLI handoff should not require a workspace'
}
$codex = ConvertFrom-Json -InputObject (New-NovaChatTaskPayload -Agent 'codex' -Prompt 'review')
if ($codex.agent -ne 'codex') { throw 'Codex must be selectable without forcing GPT as the main provider' }

$rejected = $false
try { $null = New-NovaChatTaskPayload -Agent 'not-configured' -Prompt 'hello' } catch { $rejected = $true }
if (-not $rejected) { throw 'Unknown provider must be rejected' }

$rejected = $false
try { $null = New-NovaChatTaskPayload -Agent 'gemini' -Prompt 'hello' -Workspace 'missing-path' } catch { $rejected = $true }
if (-not $rejected) { throw 'Gemini CLI must require an existing absolute workspace' }

$rejected = $false
try { $null = New-NovaChatTaskPayload -Agent 'custom' -Prompt '  ' } catch { $rejected = $true }
if (-not $rejected) { throw 'Empty prompts must be rejected' }

$history = Format-NovaChatHistory -Tasks @(
    [pscustomobject]@{ agent = 'grok'; status = 'handoff'; prompt = 'hello'; response = '' },
    [pscustomobject]@{ agent = 'gemini'; status = 'done'; prompt = 'code'; response = 'complete' }
)
if ($history -notmatch 'grok / handoff' -or $history -notmatch 'Reply: complete') {
    throw 'NOVA must show the same task history and real replies as the control panel'
}
if ($history -match 'Reply: hello') { throw 'NOVA must not fabricate a model response' }
Write-Output 'NOVA chat regression: 6 checks passed (PowerShell parser, routing, validation, history).'

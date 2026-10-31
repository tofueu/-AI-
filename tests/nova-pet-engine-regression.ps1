#requires -version 5.1
# Test suite for NOVA Pet MOD Engine
. (Join-Path $PSScriptRoot '../nova-pet-engine.ps1')

$manifestPath = Join-Path $PSScriptRoot '../public/assets/nova-character/manifest.json'

Write-Host "Running MOD Engine Tests..."

# Test 1: Load Valid Manifest
try {
    $manifest = Get-NovaModManifest -Path $manifestPath
    if ($manifest.id -eq 'nova_chibi_purple_v1' -and $manifest.manifestVersion -eq '1.0.0') {
        Write-Host "PASS: Load Valid Manifest"
    } else {
        throw "Unexpected manifest ID or version"
    }
} catch {
    Write-Error "FAIL: Load Valid Manifest - $_"
    exit 1
}

# Test 2: Invalid Path Fallback Error
try {
    $null = Get-NovaModManifest -Path 'non_existent_file.json'
    Write-Error "FAIL: Should have thrown on invalid file path"
    exit 1
} catch {
    Write-Host "PASS: Throw on invalid file path"
}

# Test 3: Animation State Mapping
if ((Get-NovaAnimationState -TaskStatus 'running') -eq 'working' -and
    (Get-NovaAnimationState -TaskStatus 'handoff') -eq 'waiting_auth' -and
    (Get-NovaAnimationState -TaskStatus 'error') -eq 'error') {
    Write-Host "PASS: Animation State Mapping"
} else {
    Write-Error "FAIL: Animation State Mapping"
    exit 1
}

# Test 4: Timeline Frame Resolution
$frame0 = Get-NovaTimelineFrame -Manifest $manifest -StateName 'working' -FrameIndex 0
if ($frame0.eyes -eq 'eyes_working' -and $null -ne $frame0.bubbleText) {
    Write-Host "PASS: Timeline Frame Resolution"
} else {
    Write-Error "FAIL: Timeline Frame Resolution"
    exit 1
}

# Test 5: Slot Path Resolution
$slotPath = Get-NovaSlotPath -Manifest $manifest -SlotName 'head' -BaseDir 'C:\app\public\assets\nova-character'
if ($null -ne $slotPath -and ($slotPath -like '*parts*head.svg')) {
    Write-Host "PASS: Slot Path Resolution"
} else {
    Write-Error "FAIL: Slot Path Resolution ($slotPath)"
    exit 1
}

Write-Host "ALL MOD ENGINE TESTS PASSED!"

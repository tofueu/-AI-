#requires -version 5.1
# NOVA Animated Character MOD Engine

function Get-NovaModManifest {
    param([string]$Path)
    if (-not (Test-Path -LiteralPath $Path -PathType Leaf)) {
        throw "MOD Manifest file not found: $Path"
    }
    $raw = Get-Content -LiteralPath $Path -Raw -Encoding UTF8
    $manifest = ConvertFrom-Json -InputObject $raw
    if ($null -eq $manifest -or -not $manifest.manifestVersion) {
        throw "Invalid MOD Manifest format"
    }
    # Validate required slots
    $requiredSlots = @('head', 'body', 'arm_left', 'arm_right', 'leg_left', 'leg_right', 'eyes_normal')
    foreach ($slot in $requiredSlots) {
        if (-not $manifest.slots.PSObject.Properties.Match($slot).Count) {
            throw "Missing required slot in MOD manifest: $slot"
        }
    }
    return $manifest
}

function Get-NovaAnimationState {
    param([string]$TaskStatus)
    switch ($TaskStatus) {
        'running' { return 'working' }
        'handoff' { return 'waiting_auth' }
        'waiting_research' { return 'thinking' }
        'ready_for_approval' { return 'thinking' }
        'error' { return 'error' }
        'done' { return 'done' }
        Default { return 'idle' }
    }
}

function Get-NovaTimelineFrame {
    param(
        [Parameter(Mandatory = $true)]$Manifest,
        [Parameter(Mandatory = $true)][string]$StateName,
        [int]$FrameIndex = 0
    )
    if ($null -eq $Manifest.timelines -or -not $Manifest.timelines.PSObject.Properties.Match($StateName).Count) {
        # Fallback frame
        return [PSCustomObject]@{
            headY = 0
            armLeftRot = 0
            armRightRot = 0
            bubbleText = "NOVA"
            eyes = "eyes_normal"
        }
    }
    $timeline = $Manifest.timelines.$StateName
    $frames = @($timeline.frames)
    if ($frames.Count -eq 0) {
        return [PSCustomObject]@{ headY = 0; armLeftRot = 0; armRightRot = 0; bubbleText = "NOVA"; eyes = "eyes_normal" }
    }
    $idx = $FrameIndex % $frames.Count
    return $frames[$idx]
}

function Get-NovaSlotPath {
    param(
        [Parameter(Mandatory = $true)]$Manifest,
        [Parameter(Mandatory = $true)][string]$SlotName,
        [string]$BaseDir
    )
    if ($null -ne $Manifest.slots -and $Manifest.slots.PSObject.Properties.Match($SlotName).Count) {
        $relativePath = $Manifest.slots.$SlotName
        if ($BaseDir -and -not [System.IO.Path]::IsPathRooted($relativePath)) {
            return Join-Path $BaseDir $relativePath
        }
        return $relativePath
    }
    return $null
}

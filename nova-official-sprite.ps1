#requires -version 5.1
# Data-only NOVA official art renderer for the existing WPF pet.
function Get-NovaOfficialManifest {
    param([Parameter(Mandatory=$true)][string]$Path)
    if (-not (Test-Path -LiteralPath $Path -PathType Leaf)) { return $null }
    $data = Get-Content -LiteralPath $Path -Raw -Encoding UTF8 | ConvertFrom-Json
    if ($data.format -ne 'nova.character.mod' -or [int]$data.manifestVersion -ne 2) {
        throw 'NOVA 官方 MOD 版本不相容'
    }
    if ($null -eq $data.characters.chibi -or $null -eq $data.characters.mature) {
        throw 'NOVA 官方 MOD 必須提供 Q 版及成熟版角色'
    }
    return $data
}
function Get-NovaOfficialFrame {
    param(
        [Parameter(Mandatory=$true)]$Manifest,
        [Parameter(Mandatory=$true)][string]$Root,
        [ValidateSet('chibi','mature')][string]$Style='chibi',
        [string]$Action='idle',
        [int]$FrameIndex=0
    )
    $c = $Manifest.characters.$Style
    if ($null -eq $c) { return $null }
    $fileName=$null
    $timeline=$c.animations.$Action
    if ($null -eq $timeline) { $timeline=$c.animations.idle }
    if ($null -ne $timeline -and @($timeline.frames).Count -gt 0) {
        $frames=@($timeline.frames)
        $fileName=[string]$frames[($FrameIndex % $frames.Count)]
    } elseif ($null -ne $c.views) {
        $fileName=[string]$c.views.front
    }
    if ([string]::IsNullOrWhiteSpace($fileName)) { return $null }
    $relative=[string]$c.root
    if ($relative.StartsWith('/') -or $relative.Contains('\') -or
       $fileName.StartsWith('/') -or $fileName.Contains('\') -or
       @($relative.Split('/') + $fileName.Split('/')) -contains '..') {
        throw 'NOVA MOD 不允許絕對路徑或跨目錄路徑'
    }
    if ($fileName -notmatch '^[\w./-]+\.(png|webp)$') { throw 'NOVA MOD 只能載入圖片' }
    $base=[System.IO.Path]::GetFullPath($Root)
    $full=[System.IO.Path]::GetFullPath((Join-Path $base ($relative + '/' + $fileName)))
    if (-not $full.StartsWith($base.TrimEnd('\','/') + [System.IO.Path]::DirectorySeparatorChar,
         [System.StringComparison]::OrdinalIgnoreCase)) {
        throw 'NOVA MOD 路徑穿越遭拒'
    }
    if (-not (Test-Path -LiteralPath $full -PathType Leaf)) { return $null }
    return $full
}
function Set-NovaOfficialImage {
    param([Parameter(Mandatory=$true)]$Image,[string]$Path)
    if (-not $Path) { $Image.Visibility='Collapsed'; return }
    # Image uses true original PNG transparency. No WPF-drawn pretend character.
    # Decoding from disk 12 times/second would stall the UI.
    # Cache each immutable frame per path, then only switch Image.Source.
    if ($null -eq $script:NovaBitmapCache) { $script:NovaBitmapCache = @{} }
    if (-not $script:NovaBitmapCache.ContainsKey($Path)) {
        $bitmap=New-Object System.Windows.Media.Imaging.BitmapImage
        $bitmap.BeginInit()
        $bitmap.CacheOption=[System.Windows.Media.Imaging.BitmapCacheOption]::OnLoad
        $bitmap.UriSource=[Uri]::new($Path, [UriKind]::Absolute)
        $bitmap.EndInit()
        $bitmap.Freeze()
        $script:NovaBitmapCache[$Path]=$bitmap
    }
    $Image.Source=$script:NovaBitmapCache[$Path]
    $Image.Visibility='Visible'
}

#requires -version 5.1
Add-Type -AssemblyName PresentationFramework

$xaml = @"
<Window
    xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation"
    xmlns:x="http://schemas.microsoft.com/winfx/2006/xaml"
    Title="NOVA Overlay" Height="50" Width="50"
    WindowStyle="None" AllowsTransparency="True" Background="Transparent"
    Topmost="True" ShowInTaskbar="False">
    <Grid>
        <Ellipse x:Name="Orb" Width="40" Height="40" Fill="Gray" Stroke="White" StrokeThickness="2">
            <Ellipse.Effect>
                <DropShadowEffect Color="Black" BlurRadius="5" ShadowDepth="2"/>
            </Ellipse.Effect>
        </Ellipse>
    </Grid>
</Window>
"@

$reader = (New-Object System.Xml.XmlNodeReader([xml]$xaml))
$window = [Windows.Markup.XamlReader]::Load($reader)

$orb = $window.FindName("Orb")

$window.Add_MouseLeftButtonDown({
    try { $window.DragMove() } catch { }
})

$timer = New-Object System.Windows.Threading.DispatcherTimer
$timer.Interval = [TimeSpan]::FromSeconds(2)

$timer.Add_Tick({
    try {
        # Invoke-RestMethod in Windows PowerShell 5.1 can unwrap a one-item JSON array
        # into a scalar, so validating its result with -is [array] rejects a valid task.
        # Check the wire-level JSON container before parsing, then normalize the result.
        $http = Invoke-WebRequest -UseBasicParsing -Uri "http://127.0.0.1:4173/api/tasks" -TimeoutSec 1
        $json = [string]$http.Content
        if (-not $json.TrimStart().StartsWith('[')) { throw "Expected JSON task array" }
        $response = @(ConvertFrom-Json -InputObject $json -ErrorAction Stop)

        $hasError = $false
        $hasRunning = $false
        $hasHandoff = $false
        $hasDone = $false
        $hasBlockedQueued = $false
        $hasWaiting = $false

        # Fail closed if the endpoint returns an error object or unexpected payload.
        if ($response -isnot [array]) { throw "Unexpected /api/tasks response" }
        foreach ($task in $response) {
            if ($null -eq $task -or $task.PSObject.Properties.Name -notcontains "status") { throw "Task missing status" }
            switch ($task.status) {
                'error' { $hasError = $true }
                'running' { $hasRunning = $true }
                'handoff' { $hasHandoff = $true }
                'done' { $hasDone = $true }
                'blocked' { $hasBlockedQueued = $true }
                'queued' { $hasBlockedQueued = $true }
                'waiting_research' { $hasWaiting = $true }
                'ready_for_approval' { $hasWaiting = $true }
            }
        }

        $color = "Gray" # Default

        if ($hasError) {
            $color = "Red"
        } elseif ($hasRunning) {
            $color = "Blue"
        } elseif ($hasHandoff) {
            $color = "Yellow"
        } elseif ($hasWaiting) {
            $color = "Orange"
        } elseif ($hasDone) {
            $color = "Green"
        } elseif ($hasBlockedQueued) {
            $color = "Gray"
        }

        $brush = (New-Object System.Windows.Media.BrushConverter).ConvertFromString($color)
        $orb.Fill = $brush

    } catch {
        # If API is unreachable, turn Gray
        $brush = (New-Object System.Windows.Media.BrushConverter).ConvertFromString("Gray")
        $orb.Fill = $brush
    }
})

$timer.Start()
$window.ShowDialog() | Out-Null

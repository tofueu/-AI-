#requires -version 5.1
Add-Type -AssemblyName PresentationFramework
. (Join-Path $PSScriptRoot 'nova-tasks.ps1')

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
        $http = Invoke-WebRequest -UseBasicParsing -Uri "http://127.0.0.1:4173/api/tasks" -TimeoutSec 1
        $response = ConvertTo-NovaTaskArray -Json ([string]$http.Content)

        $color = Get-NovaTaskColor -Tasks $response

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

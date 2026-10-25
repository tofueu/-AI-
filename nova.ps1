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
$window.Add_MouseLeftButtonDown({ $window.DragMove() })

$syncContext = [System.Threading.SynchronizationContext]::Current

$job = [powershell]::Create().AddScript({
    param($sync, $orb)
    try {
        $req = [System.Net.WebRequest]::Create("http://127.0.0.1:4173/api/events")
        $req.Timeout = -1
        $res = $req.GetResponse()
        $stream = $res.GetResponseStream()
        $reader = New-Object System.IO.StreamReader($stream)

        while (!$reader.EndOfStream) {
            $line = $reader.ReadLine()
            if ($line.StartsWith("data: ") -and $line.Length -gt 6) {
                $json = $line.Substring(6)
                if ($json -ne "connected") {
                    try {
                        $task = $json | ConvertFrom-Json
                        $color = "Gray"
                        if ($task.status -eq 'error') { $color = "Red" }
                        elseif ($task.status -eq 'running') { $color = "Blue" }
                        elseif ($task.status -eq 'handoff') { $color = "Yellow" }
                        elseif ($task.status -match 'waiting|ready') { $color = "Orange" }
                        elseif ($task.status -eq 'done') { $color = "Green" }

                        $sync.Post({
                            $brush = (New-Object System.Windows.Media.BrushConverter).ConvertFromString($color)
                            $orb.Fill = $brush
                        }, $null)
                    } catch {}
                }
            }
        }
    } catch {
        $sync.Post({
            $brush = (New-Object System.Windows.Media.BrushConverter).ConvertFromString("Gray")
            $orb.Fill = $brush
        }, $null)
    }
}).AddArgument($syncContext).AddArgument($orb)

$asyncResult = $job.BeginInvoke()
$window.ShowDialog() | Out-Null
$job.Stop()
$job.Dispose()

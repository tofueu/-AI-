#requires -version 5.1
Add-Type -AssemblyName PresentationFramework
. (Join-Path $PSScriptRoot 'nova-tasks.ps1')
. (Join-Path $PSScriptRoot 'nova-chat.ps1')

# Canonical Asset Specification Reference: public/assets/nova-character/NOVA_ASSET_SPEC.md
# SVG Asset Reference: public/assets/nova-character/nova-purple-character.svg
# SHA-256 Hash: d409d9ff40766aefbd02c555b947bbdc79c2dc30956271d646e948a372cbc9a4

# Visual Purple Character Desktop Pet Window
$xaml = @"
<Window
    xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation"
    xmlns:x="http://schemas.microsoft.com/winfx/2006/xaml"
    Title="NOVA Desktop Character Pet" Height="110" Width="100"
    WindowStyle="None" AllowsTransparency="True" Background="Transparent"
    Topmost="True" ShowInTaskbar="False">
    <Grid x:Name="PetContainer" Cursor="Hand">
        <!-- Speech / Status Bubble -->
        <Border x:Name="SpeechBubble" Background="#241d3d" BorderBrush="#a38aff" BorderThickness="1.5"
                CornerRadius="8" Padding="6,3" HorizontalAlignment="Center" VerticalAlignment="Top"
                Margin="0,0,0,0" Visibility="Visible">
            <TextBlock x:Name="BubbleText" Text="NOVA" Foreground="#e6deff" FontSize="9"
                       FontWeight="Bold" TextAlignment="Center"/>
        </Border>

        <!-- Purple Character Body & Halo -->
        <Canvas Width="70" Height="70" HorizontalAlignment="Center" VerticalAlignment="Bottom" Margin="0,0,0,5">
            <!-- Halo Star / Crown -->
            <Polygon Points="35,2 38,10 46,10 40,15 42,23 35,18 28,23 30,15 24,10 32,10"
                     Fill="#ffd166" x:Name="HaloStar"/>

            <!-- Main Purple Body Silhouette -->
            <Path x:Name="BodyPath" Fill="#7b2cbf" Stroke="#c77dff" StrokeThickness="2">
                <Path.Data>
                    <PathGeometry>
                        <PathGeometry.Figures>
                            <PathFigure StartPoint="35,18">
                                <BezierSegment Point1="55,18" Point2="60,35" Point3="58,52"/>
                                <BezierSegment Point1="56,66" Point2="14,66" Point3="12,52"/>
                                <BezierSegment Point1="10,35" Point2="15,18" Point3="35,18"/>
                            </PathFigure>
                        </PathGeometry.Figures>
                    </PathGeometry>
                </Path.Data>
            </Path>

            <!-- Character Eyes -->
            <Ellipse x:Name="LeftEye" Canvas.Left="24" Canvas.Top="32" Width="6" Height="8" Fill="#ffffff"/>
            <Ellipse x:Name="RightEye" Canvas.Left="40" Canvas.Top="32" Width="6" Height="8" Fill="#ffffff"/>

            <!-- Character Pupils -->
            <Ellipse x:Name="LeftPupil" Canvas.Left="26" Canvas.Top="34" Width="3" Height="4" Fill="#10002b"/>
            <Ellipse x:Name="RightPupil" Canvas.Left="42" Canvas.Top="34" Width="3" Height="4" Fill="#10002b"/>

            <!-- Character Blush / Cheeks -->
            <Ellipse Canvas.Left="20" Canvas.Top="40" Width="7" Height="4" Fill="#ff9eaf" Opacity="0.7"/>
            <Ellipse Canvas.Left="43" Canvas.Top="40" Width="7" Height="4" Fill="#ff9eaf" Opacity="0.7"/>

            <!-- Character Mouth -->
            <Path x:Name="MouthPath" Stroke="#ffffff" StrokeThickness="1.5" Data="M 31 44 Q 35 48 39 44"/>
        </Canvas>
    </Grid>
</Window>
"@

$reader = (New-Object System.Xml.XmlNodeReader([xml]$xaml))
$window = [Windows.Markup.XamlReader]::Load($reader)

$bubbleText = $window.FindName("BubbleText")
$bodyPath = $window.FindName("BodyPath")
$haloStar = $window.FindName("HaloStar")

$window.Add_MouseLeftButtonDown({
    try { $window.DragMove() } catch { }
})

# Right-click opens NOVA chat window
$window.Add_MouseRightButtonUp({ Show-NovaChatWindow })

$timer = New-Object System.Windows.Threading.DispatcherTimer
$timer.Interval = [TimeSpan]::FromSeconds(2)

$timer.Add_Tick({
    try {
        $http = Invoke-WebRequest -UseBasicParsing -Uri "http://127.0.0.1:4173/api/tasks" -TimeoutSec 1
        $response = ConvertTo-NovaTaskArray -Json ([string]$http.Content)

        $colorName = Get-NovaTaskColor -Tasks $response

        switch ($colorName) {
            'Blue' {
                $bubbleText.Text = "工作中..."
                $bodyPath.Fill = (New-Object System.Windows.Media.BrushConverter).ConvertFromString("#5a189a")
                $haloStar.Fill = (New-Object System.Windows.Media.BrushConverter).ConvertFromString("#4cc9f0")
            }
            'Yellow' {
                $bubbleText.Text = "等待授權"
                $bodyPath.Fill = (New-Object System.Windows.Media.BrushConverter).ConvertFromString("#7209b7")
                $haloStar.Fill = (New-Object System.Windows.Media.BrushConverter).ConvertFromString("#ffb703")
            }
            'Orange' {
                $bubbleText.Text = "待審查"
                $bodyPath.Fill = (New-Object System.Windows.Media.BrushConverter).ConvertFromString("#7b2cbf")
                $haloStar.Fill = (New-Object System.Windows.Media.BrushConverter).ConvertFromString("#fb8500")
            }
            'Red' {
                $bubbleText.Text = "需處理!"
                $bodyPath.Fill = (New-Object System.Windows.Media.BrushConverter).ConvertFromString("#3c096c")
                $haloStar.Fill = (New-Object System.Windows.Media.BrushConverter).ConvertFromString("#f72585")
            }
            'Green' {
                $bubbleText.Text = "完成!"
                $bodyPath.Fill = (New-Object System.Windows.Media.BrushConverter).ConvertFromString("#9d4edd")
                $haloStar.Fill = (New-Object System.Windows.Media.BrushConverter).ConvertFromString("#06d6a0")
            }
            Default {
                $bubbleText.Text = "NOVA"
                $bodyPath.Fill = (New-Object System.Windows.Media.BrushConverter).ConvertFromString("#7b2cbf")
                $haloStar.Fill = (New-Object System.Windows.Media.BrushConverter).ConvertFromString("#ffd166")
            }
        }
    } catch {
        $bubbleText.Text = "離線"
        $bodyPath.Fill = (New-Object System.Windows.Media.BrushConverter).ConvertFromString("#4a4e69")
        $haloStar.Fill = (New-Object System.Windows.Media.BrushConverter).ConvertFromString("#9a8c98")
    }
})

$timer.Start()
$window.ShowDialog() | Out-Null

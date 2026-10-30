#requires -version 5.1
Add-Type -AssemblyName PresentationFramework
. (Join-Path $PSScriptRoot 'nova-tasks.ps1')
. (Join-Path $PSScriptRoot 'nova-chat.ps1')
. (Join-Path $PSScriptRoot 'nova-pet-engine.ps1')
. (Join-Path $PSScriptRoot 'nova-official-sprite.ps1')
$officialRoot = Join-Path $PSScriptRoot 'public/assets/nova-official'
$script:activeOfficialStyle = 'chibi'
$script:lastOfficialPath = ''
try { $officialManifest = Get-NovaOfficialManifest -Path (Join-Path $officialRoot 'manifest.json') } catch { $officialManifest = $null }

# Load MOD Manifest with Safe Fallback
$manifestPath = Join-Path $PSScriptRoot 'public/assets/nova-character/manifest.json'
try {
    $mod = Get-NovaModManifest -Path $manifestPath
} catch {
    # Default Fallback Data Structure
    $mod = [PSCustomObject]@{
        name = "NOVA Fallback Character"
        slots = [PSCustomObject]@{
            head = "parts/head.svg"
            body = "parts/body.svg"
        }
        timelines = [PSCustomObject]@{
            idle = [PSCustomObject]@{
                fps = 2
                frames = @(
                    [PSCustomObject]@{ headY = 0; armLeftRot = -5; armRightRot = 5; bubbleText = "NOVA"; eyes = "eyes_normal" },
                    [PSCustomObject]@{ headY = -2; armLeftRot = -8; armRightRot = 8; bubbleText = "NOVA"; eyes = "eyes_normal" }
                )
            }
        }
    }
}

# Animated Character WPF Window
$xaml = @"
<Window
    xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation"
    xmlns:x="http://schemas.microsoft.com/winfx/2006/xaml"
    Title="NOVA Official AI Companion" Height="245" Width="190"
    WindowStyle="None" AllowsTransparency="True" Background="Transparent"
    Topmost="True" ShowInTaskbar="False">
    <Window.ContextMenu>
        <ContextMenu>
            <MenuItem Header="開啟對話 (Chat)" x:Name="MenuChat"/>
            <MenuItem Header="官方 Q 版" x:Name="MenuOfficialChibi"/>
            <MenuItem Header="官方成熟版" x:Name="MenuOfficialMature"/>
            <MenuItem Header="最小化 (Minimize)" x:Name="MenuMinimize"/>
            <Separator/>
            <MenuItem Header="關閉 (Close)" x:Name="MenuClose"/>
        </ContextMenu>
    </Window.ContextMenu>
    <Grid x:Name="PetContainer" Cursor="Hand">
        <!-- Speech / Status Bubble -->
        <Border x:Name="SpeechBubble" Background="#241d3d" BorderBrush="#a38aff" BorderThickness="1.5"
                CornerRadius="8" Padding="6,3" HorizontalAlignment="Center" VerticalAlignment="Top"
                Margin="0,0,0,0" Visibility="Visible">
            <TextBlock x:Name="BubbleText" Text="NOVA" Foreground="#e6deff" FontSize="9"
                       FontWeight="Bold" TextAlignment="Center"/>
        </Border>

        <!-- Animated Skeletal Character Canvas -->
        <Canvas x:Name="VectorFallbackCanvas" Width="70" Height="75" HorizontalAlignment="Center" VerticalAlignment="Bottom" Margin="0,0,0,5">
            <!-- Halo Star / Crown Slot -->
            <Polygon Points="35,2 38,10 46,10 40,15 42,23 35,18 28,23 30,15 24,10 32,10"
                     Fill="#ffd166" x:Name="HaloStar"/>

            <!-- Left Arm Slot -->
            <Path x:Name="ArmLeft" Fill="#6a1b9a" Data="M 16 38 Q 10 45 14 52" Stroke="#c77dff" StrokeThickness="2">
                <Path.RenderTransform>
                    <RotateTransform x:Name="ArmLeftRot" Angle="0" CenterX="16" CenterY="38"/>
                </Path.RenderTransform>
            </Path>

            <!-- Right Arm Slot -->
            <Path x:Name="ArmRight" Fill="#6a1b9a" Data="M 54 38 Q 60 45 56 52" Stroke="#c77dff" StrokeThickness="2">
                <Path.RenderTransform>
                    <RotateTransform x:Name="ArmRightRot" Angle="0" CenterX="54" CenterY="38"/>
                </Path.RenderTransform>
            </Path>

            <!-- Main Body Torso Slot -->
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

            <!-- Head Group Slot -->
            <Canvas x:Name="HeadGroup" Canvas.Left="0" Canvas.Top="0">
                <Canvas.RenderTransform>
                    <TranslateTransform x:Name="HeadTransY" Y="0"/>
                </Canvas.RenderTransform>
                <!-- Eyes Slot -->
                <Ellipse x:Name="LeftEye" Canvas.Left="24" Canvas.Top="32" Width="6" Height="8" Fill="#ffffff"/>
                <Ellipse x:Name="RightEye" Canvas.Left="40" Canvas.Top="32" Width="6" Height="8" Fill="#ffffff"/>
                <Ellipse x:Name="LeftPupil" Canvas.Left="26" Canvas.Top="34" Width="3" Height="4" Fill="#10002b"/>
                <Ellipse x:Name="RightPupil" Canvas.Left="42" Canvas.Top="34" Width="3" Height="4" Fill="#10002b"/>

                <!-- Blush Cheeks -->
                <Ellipse Canvas.Left="20" Canvas.Top="40" Width="7" Height="4" Fill="#ff9eaf" Opacity="0.7"/>
                <Ellipse Canvas.Left="43" Canvas.Top="40" Width="7" Height="4" Fill="#ff9eaf" Opacity="0.7"/>

                <!-- Mouth Expression Slot -->
                <Path x:Name="MouthPath" Stroke="#ffffff" StrokeThickness="1.5" Data="M 31 44 Q 35 48 39 44"/>
            </Canvas>
        </Canvas>
        <Image x:Name="OfficialNovaSprite" Width="175" Height="190" Stretch="Uniform" HorizontalAlignment="Center" VerticalAlignment="Bottom" Margin="0,0,0,5" Visibility="Collapsed" />
    </Grid>
</Window>
"@

$reader = (New-Object System.Xml.XmlNodeReader([xml]$xaml))
$window = [Windows.Markup.XamlReader]::Load($reader)

$bubbleText = $window.FindName("BubbleText")
$bodyPath = $window.FindName("BodyPath")
$haloStar = $window.FindName("HaloStar")
$headTransY = $window.FindName("HeadTransY")
$armLeftRot = $window.FindName("ArmLeftRot")
$armRightRot = $window.FindName("ArmRightRot")
$officialSprite = $window.FindName("OfficialNovaSprite")
$vectorFallback = $window.FindName("VectorFallbackCanvas")
# Never display the geometric placeholder as the official character.
$vectorFallback.Visibility = "Collapsed"
if ($null -eq $officialManifest) { $bubbleText.Text = "官方素材尚未安裝" }

$menuChat = $window.FindName("MenuChat")
$menuMinimize = $window.FindName("MenuMinimize")
$menuClose = $window.FindName("MenuClose")

if ($null -ne $menuChat) { $menuChat.Add_Click({ Show-NovaChatWindow }) }
if ($null -ne $menuMinimize) { $menuMinimize.Add_Click({ $window.WindowState = 'Minimized' }) }
if ($null -ne $menuClose) { $menuClose.Add_Click({ $window.Close() }) }
$menuOfficialChibi = $window.ContextMenu.Items[1]
$menuOfficialMature = $window.ContextMenu.Items[2]
$menuOfficialChibi.Add_Click({ $script:activeOfficialStyle = "chibi"; $script:lastOfficialPath = "" })
$menuOfficialMature.Add_Click({ $script:activeOfficialStyle = "mature"; $script:lastOfficialPath = "" })

$window.Add_MouseLeftButtonDown({
    try { $window.DragMove() } catch { }
})

# Right-click opens NOVA chat window
$window.Add_MouseRightButtonUp({ Show-NovaChatWindow })

$frameStep = 0
$timer = New-Object System.Windows.Threading.DispatcherTimer
$timer.Interval = [TimeSpan]::FromMilliseconds(500)

$timer.Add_Tick({
    try {
        $http = Invoke-WebRequest -UseBasicParsing -Uri "http://127.0.0.1:4173/api/tasks" -TimeoutSec 1
        $response = ConvertTo-NovaTaskArray -Json ([string]$http.Content)

        $colorName = Get-NovaTaskColor -Tasks $response
        $animState = Get-NovaAnimationState -TaskStatus ($response | Select-Object -First 1).status

        $frameStep++
        $frame = Get-NovaTimelineFrame -Manifest $mod -StateName $animState -FrameIndex $frameStep

        # Render timeline frame values
        if ($null -ne $frame.headY) { $headTransY.Y = [double]$frame.headY }
        if ($null -ne $frame.armLeftRot) { $armLeftRot.Angle = [double]$frame.armLeftRot }
        if ($null -ne $frame.armRightRot) { $armRightRot.Angle = [double]$frame.armRightRot }
        if ($null -ne $frame.bubbleText) { $bubbleText.Text = [string]$frame.bubbleText }
        if ($null -ne $officialManifest) {
            try {
                $imagePath = Get-NovaOfficialFrame -Manifest $officialManifest -Root $officialRoot -Style $script:activeOfficialStyle -Action $animState -FrameIndex $frameStep
                if ($imagePath -and $imagePath -ne $script:lastOfficialPath) {
                    Set-NovaOfficialImage -Image $officialSprite -Path $imagePath
                    $script:lastOfficialPath = $imagePath
                } elseif (-not $imagePath) {
                    $officialSprite.Visibility = 'Collapsed'
                    $script:lastOfficialPath = ''
                }
                if ($script:activeOfficialStyle -eq 'mature') { $bubbleText.Text = '成熟版：動作分層待製作' }
            } catch {
                $officialSprite.Visibility = 'Collapsed'
                $bubbleText.Text = 'NOVA MOD 素材讀取失敗'
            }
        } else {
            $bubbleText.Text = '請安裝 NOVA 官方素材'
        }

        switch ($colorName) {
            'Blue' {
                $bodyPath.Fill = (New-Object System.Windows.Media.BrushConverter).ConvertFromString("#5a189a")
                $haloStar.Fill = (New-Object System.Windows.Media.BrushConverter).ConvertFromString("#4cc9f0")
            }
            'Yellow' {
                $bodyPath.Fill = (New-Object System.Windows.Media.BrushConverter).ConvertFromString("#7209b7")
                $haloStar.Fill = (New-Object System.Windows.Media.BrushConverter).ConvertFromString("#ffb703")
            }
            'Orange' {
                $bodyPath.Fill = (New-Object System.Windows.Media.BrushConverter).ConvertFromString("#7b2cbf")
                $haloStar.Fill = (New-Object System.Windows.Media.BrushConverter).ConvertFromString("#fb8500")
            }
            'Red' {
                $bodyPath.Fill = (New-Object System.Windows.Media.BrushConverter).ConvertFromString("#3c096c")
                $haloStar.Fill = (New-Object System.Windows.Media.BrushConverter).ConvertFromString("#f72585")
            }
            'Green' {
                $bodyPath.Fill = (New-Object System.Windows.Media.BrushConverter).ConvertFromString("#9d4edd")
                $haloStar.Fill = (New-Object System.Windows.Media.BrushConverter).ConvertFromString("#06d6a0")
            }
            Default {
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

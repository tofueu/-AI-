#requires -version 5.1
Add-Type -AssemblyName PresentationFramework

$xaml = @"
<Window xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation"
        xmlns:x="http://schemas.microsoft.com/winfx/2006/xaml"
        Title="AI Workbench Desktop" Width="1100" Height="780"
        MinWidth="800" MinHeight="600" WindowStartupLocation="CenterScreen">
    <Grid>
        <WebBrowser x:Name="Browser"/>
    </Grid>
</Window>
"@

$reader = New-Object System.Xml.XmlNodeReader([xml]$xaml)
$window = [Windows.Markup.XamlReader]::Load($reader)
$browser = $window.FindName("Browser")

$url = "http://127.0.0.1:4173/"
$browser.Navigate($url)

$window.ShowDialog() | Out-Null

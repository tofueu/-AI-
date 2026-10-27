#requires -version 5.1
# NOVA shares the local AI Workbench task API; it never fabricates an AI reply.
function New-NovaChatTaskPayload {
    param(
        [Parameter(Mandatory = $true)][string]$Agent,
        [Parameter(Mandatory = $true)][string]$Prompt,
        [string]$Workspace = ''
    )
    if ($Agent -notin @('gemini', 'codex', 'perplexity', 'grok', 'custom')) {
        throw 'Unsupported AI provider; select one configured in AI Workbench.'
    }
    if ([string]::IsNullOrWhiteSpace($Prompt)) { throw 'Enter a message.' }
    $payload = @{ agent = $Agent; prompt = $Prompt.Trim() }
    if ($Agent -eq 'gemini') {
        if ([string]::IsNullOrWhiteSpace($Workspace) -or
            -not [System.IO.Path]::IsPathRooted($Workspace) -or
            -not (Test-Path -LiteralPath $Workspace -PathType Container)) {
            throw 'Gemini CLI requires an existing absolute workspace directory.'
        }
        $payload.workspace = $Workspace
    }
    return ConvertTo-Json -InputObject $payload -Compress -Depth 4
}

function Format-NovaChatHistory {
    param([Parameter(Mandatory = $true)][AllowEmptyCollection()][array]$Tasks)
    $lines = New-Object System.Collections.Generic.List[string]
    foreach ($task in @($Tasks | Select-Object -First 15)) {
        $agent = [string]$task.agent
        $status = [string]$task.status
        $prompt = [string]$task.prompt
        $response = [string]$task.response
        if ($prompt.Length -gt 500) { $prompt = $prompt.Substring(0, 500) + '...' }
        if ($response.Length -gt 1500) { $response = $response.Substring(0, 1500) + '...' }
        $lines.Add(('[' + $agent + ' / ' + $status + '] ' + $prompt))
        if ($response) { $lines.Add(('Reply: ' + $response)) }
        if ($status -eq 'handoff') {
            $lines.Add('Waiting for an authorized provider handoff in the workbench.')
        }
        $lines.Add('')
    }
    return ($lines -join [Environment]::NewLine)
}

function Show-NovaChatWindow {
    $xaml = @"
<Window xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation"
        Title="NOVA - AI Workbench" Width="520" Height="590"
        MinWidth="410" MinHeight="440" WindowStartupLocation="CenterScreen">
    <Grid Margin="12">
        <Grid.RowDefinitions>
            <RowDefinition Height="Auto"/>
            <RowDefinition Height="*"/>
            <RowDefinition Height="Auto"/>
            <RowDefinition Height="90"/>
            <RowDefinition Height="Auto"/>
        </Grid.RowDefinitions>
        <StackPanel Grid.Row="0" Orientation="Horizontal" Margin="0,0,0,8">
            <TextBlock Text="AI provider:" VerticalAlignment="Center" Margin="0,0,8,0"/>
            <ComboBox x:Name="Provider" Width="195" SelectedIndex="0">
                <ComboBoxItem Content="Gemini CLI" Tag="gemini"/>
                <ComboBoxItem Content="Codex (handoff)" Tag="codex"/>
                <ComboBoxItem Content="Perplexity (handoff)" Tag="perplexity"/>
                <ComboBoxItem Content="Grok (handoff)" Tag="grok"/>
                <ComboBoxItem Content="Custom (handoff)" Tag="custom"/>
            </ComboBox>
            <Button x:Name="Refresh" Content="Refresh" Margin="8,0,0,0" Padding="10,4"/>
        </StackPanel>
        <TextBox x:Name="History" Grid.Row="1" IsReadOnly="True"
                 TextWrapping="Wrap" VerticalScrollBarVisibility="Auto"
                 HorizontalScrollBarVisibility="Disabled"/>
        <StackPanel Grid.Row="2" Margin="0,8,0,8">
            <TextBlock Text="Workspace (required for Gemini CLI):"/>
            <TextBox x:Name="Workspace"/>
        </StackPanel>
        <TextBox x:Name="Prompt" Grid.Row="3" AcceptsReturn="True"
                 TextWrapping="Wrap" VerticalScrollBarVisibility="Auto"/>
        <DockPanel Grid.Row="4" Margin="0,8,0,0" LastChildFill="True">
            <Button x:Name="Send" Content="Send" DockPanel.Dock="Right"
                    HorizontalAlignment="Right" Padding="18,5"/>
            <TextBlock x:Name="Status" Text="Local workbench task channel"
                       VerticalAlignment="Center" TextWrapping="Wrap"/>
        </DockPanel>
    </Grid>
</Window>
"@
    $reader = New-Object System.Xml.XmlNodeReader([xml]$xaml)
    $chat = [Windows.Markup.XamlReader]::Load($reader)
    $provider = $chat.FindName('Provider')
    $history = $chat.FindName('History')
    $workspace = $chat.FindName('Workspace')
    $promptBox = $chat.FindName('Prompt')
    $status = $chat.FindName('Status')
    $send = $chat.FindName('Send')
    $refresh = $chat.FindName('Refresh')
    $api = 'http://127.0.0.1:4173/api/tasks'

    $reload = {
        try {
            $http = Invoke-WebRequest -UseBasicParsing -Uri $api -TimeoutSec 3
            $tasks = ConvertTo-NovaTaskArray -Json ([string]$http.Content)
            $history.Text = Format-NovaChatHistory -Tasks $tasks
            $status.Text = 'Synced with AI Workbench'
        } catch {
            $status.Text = 'Workbench unavailable; start the local backend.'
        }
    }.GetNewClosure()

    $refresh.Add_Click($reload)
    $send.Add_Click({
        try {
            $selected = [string]$provider.SelectedItem.Tag
            $body = New-NovaChatTaskPayload -Agent $selected -Prompt $promptBox.Text -Workspace $workspace.Text
            $bytes = [System.Text.Encoding]::UTF8.GetBytes($body)
            $null = Invoke-WebRequest -UseBasicParsing -Method Post -Uri $api -ContentType 'application/json; charset=utf-8' -Body $bytes -TimeoutSec 5
            $promptBox.Clear()
            & $reload
        } catch {
            $status.Text = [string]$_.Exception.Message
        }
    }.GetNewClosure())

    $poll = New-Object System.Windows.Threading.DispatcherTimer
    $poll.Interval = [TimeSpan]::FromSeconds(3)
    $poll.Add_Tick($reload)
    $poll.Start()
    try {
        & $reload
        $null = $chat.ShowDialog()
    } finally {
        $poll.Stop()
    }
}

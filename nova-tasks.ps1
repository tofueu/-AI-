#requires -version 5.1
# Pure JSON parser: safe to dot-source in Windows PowerShell tests without starting WPF.
function ConvertTo-NovaTaskArray {
    param([Parameter(Mandatory = $true)][string]$Json)

    if (-not $Json.TrimStart().StartsWith('[')) {
        throw "Expected JSON task array"
    }

    # PowerShell 5.1 unwraps JSON arrays at the pipeline boundary, including [].
    # Wrap the JSON in an object so the array remains a property with exact cardinality.
    $envelope = ConvertFrom-Json -InputObject ('{"items":' + $Json + '}') -ErrorAction Stop
    $tasks = $envelope.items
    if ($tasks -isnot [array]) { throw "Expected JSON task array" }
    foreach ($task in $tasks) {
        if ($null -eq $task -or -not $task.PSObject.Properties.Match("status").Count) {
            throw "Task missing status"
        }
    }

    # Return the array as a single PowerShell pipeline object, including [] and [one].
    return ,$tasks
}

# Choose live work before historical results. Otherwise one old error pins NOVA red
# forever even while a new task is running or has completed successfully.
function Get-NovaTaskColor {
    param([Parameter(Mandatory = $true)][AllowEmptyCollection()][array]$Tasks)

    $statuses = @($Tasks | ForEach-Object { [string]$_.status })
    if ($statuses -contains 'running') { return 'Blue' }
    if ($statuses -contains 'handoff') { return 'Yellow' }
    if ($statuses -contains 'waiting_research' -or $statuses -contains 'ready_for_approval') { return 'Orange' }
    if ($statuses -contains 'queued' -or $statuses -contains 'blocked' -or $statuses -contains 'planned') { return 'Gray' }

    # No active tasks: show the latest completed outcome, not any historical failure.
    # API timestamps are UTC ISO 8601; retain first occurrence on a tie because
    # /api/tasks is already newest-created-first.
    $latest = $null
    $latestStamp = ''
    foreach ($task in $Tasks) {
        if ($task.status -notin @('done', 'error')) { continue }
        $stamp = if ($task.updatedAt) { [string]$task.updatedAt } elseif ($task.createdAt) { [string]$task.createdAt } else { '' }
        if ($null -eq $latest -or [string]::CompareOrdinal($stamp, $latestStamp) -gt 0) {
            $latest = [string]$task.status
            $latestStamp = $stamp
        }
    }
    if ($latest -eq 'error') { return 'Red' }
    if ($latest -eq 'done') { return 'Green' }
    return 'Gray'
}

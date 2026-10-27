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

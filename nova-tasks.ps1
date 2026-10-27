#requires -version 5.1
# Pure JSON parser: safe to dot-source in Windows PowerShell tests without starting WPF.
function ConvertTo-NovaTaskArray {
    param([Parameter(Mandatory = $true)][string]$Json)

    if (-not $Json.TrimStart().StartsWith('[')) {
        throw "Expected JSON task array"
    }

    $tasks = @(ConvertFrom-Json -InputObject $Json -ErrorAction Stop)
    foreach ($task in $tasks) {
        if ($null -eq $task -or $task.PSObject.Properties.Name -notcontains 'status') {
            throw "Task missing status"
        }
    }

    # Return the array as a single PowerShell pipeline object, including [] and [one].
    return ,$tasks
}

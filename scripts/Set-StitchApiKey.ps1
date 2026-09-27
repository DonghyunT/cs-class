# Run this script yourself in PowerShell; do not pass the key as a command argument.
# The key is stored in the current Windows user's environment, outside the repository.
# If script files are blocked, use the interactive command in README.md (Stitch key input).
[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
$stitchSecureKey = Read-Host 'Enter your new Stitch API key (input is hidden)' -AsSecureString
$stitchKeyPointer = [IntPtr]::Zero
$stitchKeyValue = $null

try {
    $stitchKeyPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($stitchSecureKey)
    $stitchKeyValue = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($stitchKeyPointer).Trim()
    if ($stitchKeyValue.Length -lt 20 -or $stitchKeyValue -match '\s') {
        throw 'The key is empty or contains whitespace. Nothing was saved.'
    }

    [Environment]::SetEnvironmentVariable('STITCH_API_KEY', $stitchKeyValue, 'User')
    Write-Host 'Stitch key saved to your Windows user environment. The value was not printed.'
    Write-Host 'Fully quit and reopen Codex so it can read the new environment variable.'
    Write-Host 'Return to this chat and say that the key setup is complete.'
}
finally {
    if ($stitchKeyPointer -ne [IntPtr]::Zero) {
        [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($stitchKeyPointer)
    }
    $stitchKeyValue = $null
    if ($null -ne $stitchSecureKey) {
        $stitchSecureKey.Dispose()
    }
}

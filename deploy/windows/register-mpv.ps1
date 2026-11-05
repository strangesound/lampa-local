param([Parameter(Mandatory=$true)][string]$PlayerPath)
$ErrorActionPreference = 'Stop'
$exe = (Resolve-Path -LiteralPath $PlayerPath).Path
if ([IO.Path]::GetFileName($exe) -notin @('mpv.exe', 'mpvnet.exe')) { throw 'Select mpv.exe or mpvnet.exe with native mpv:// support.' }
$key = 'HKCU:\Software\Classes\mpv'
# Register only this URL protocol for the current user; file associations stay intact.
if (Test-Path $key) {
    $backup = Join-Path $env:TEMP ('lampa-mpv-protocol-' + (Get-Date -Format yyyyMMddHHmmss) + '.reg')
    & reg.exe export 'HKCU\Software\Classes\mpv' $backup /y | Out-Null
    if ($LASTEXITCODE -ne 0) { throw 'Could not back up existing protocol registration.' }
}
New-Item -Path "$key\shell\open\command" -Force | Out-Null
Set-Item -Path $key -Value 'URL:mpv'
New-ItemProperty -Path $key -Name 'URL Protocol' -Value '' -PropertyType String -Force | Out-Null
$install = Join-Path $env:LOCALAPPDATA 'LampaPlayer'
New-Item -ItemType Directory -Path $install -Force | Out-Null
$launcher = Join-Path $install ('LampaMpv-' + (Get-Date -Format yyyyMMddHHmmss) + '.exe')
Add-Type -Path (Join-Path $PSScriptRoot 'MpvLauncher.cs') -OutputAssembly $launcher -OutputType WindowsApplication
Set-Content -LiteralPath (Join-Path $install 'player-path.txt') -Value $exe -Encoding UTF8
$command = '"' + $launcher + '" "%1"'
Set-Item -Path "$key\shell\open\command" -Value $command
if ((Get-Item "$key\shell\open\command").GetValue('') -ne $command) { throw 'Protocol verification failed.' }
Write-Output 'mpv URL handler registered and verified.'

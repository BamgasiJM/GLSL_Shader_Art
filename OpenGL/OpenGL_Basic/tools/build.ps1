param(
    [switch]$Run,
    [switch]$Fresh
)

$ErrorActionPreference = 'Stop'
# Use UTF-8 when forwarding native build output.
$utf8 = New-Object System.Text.UTF8Encoding $false
[Console]::OutputEncoding = $utf8
$OutputEncoding = $utf8
$projectDirectory = Split-Path -Parent $PSScriptRoot
$vswhere = Join-Path ${env:ProgramFiles(x86)} 'Microsoft Visual Studio/Installer/vswhere.exe'
if (-not (Test-Path -LiteralPath $vswhere)) {
    throw 'Install Visual Studio Build Tools with Desktop development with C++.'
}
$installation = & $vswhere -latest -products '*' -requires Microsoft.VisualStudio.Component.VC.Tools.x86.x64 -property installationPath
if (-not $installation) { throw 'MSVC x64 C++ build tools were not found.' }
$developerShell = Join-Path $installation 'Common7/Tools/Launch-VsDevShell.ps1'
# Microsoft's script imports the x64 MSVC/Windows SDK environment.
$env:Path = (Split-Path -Parent $vswhere) + ';' + $env:Path
$env:VSLANG = '1033'
& $developerShell -Arch amd64 -HostArch amd64 -SkipAutomaticLocation
if (-not (Get-Command cmake -ErrorAction SilentlyContinue)) { throw 'CMake 3.24+ is required.' }
if (-not (Get-Command ninja -ErrorAction SilentlyContinue)) { throw 'Ninja is required.' }

Push-Location $projectDirectory
try {
    if ($Fresh) {
        & cmake --fresh --preset windows-debug
    } else {
        & cmake --preset windows-debug
    }
    if ($LASTEXITCODE -ne 0) { throw 'CMake configuration failed.' }
    & cmake --build --preset windows-debug
    if ($LASTEXITCODE -ne 0) { throw 'Build failed.' }
    if ($Run) {
        & './build/windows-debug/OpenGL_Basic.exe'
        if ($LASTEXITCODE -ne 0) { throw 'OpenGL_Basic failed.' }
    }
} finally {
    Pop-Location
}

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

Set-Location $PSScriptRoot

Write-Host 'Starting TrackApp webapp on http://localhost:8000' -ForegroundColor Cyan

$python = Get-Command python -ErrorAction SilentlyContinue
if (-not $python) {
    $python = Get-Command py -ErrorAction SilentlyContinue
}

if (-not $python) {
    throw 'Python is not available on PATH. Install Python 3 first.'
}

$server = Start-Process -FilePath $python.Source -ArgumentList '-m http.server 8000' -PassThru
Start-Sleep -Seconds 2
Start-Process 'http://localhost:8000'

Write-Host 'Server started. Press Ctrl+C in the terminal window running the server to stop it.' -ForegroundColor Green
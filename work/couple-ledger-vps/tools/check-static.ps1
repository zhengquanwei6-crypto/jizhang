$ErrorActionPreference = "Stop"

$Root = Split-Path -Parent $PSScriptRoot
$Www = Join-Path $Root "www"
$Assets = Join-Path $Www "assets"
$Index = Join-Path $Www "index.html"

if (-not (Test-Path -LiteralPath $Index)) {
    throw "Missing local index.html at $Index"
}

$html = Get-Content -LiteralPath $Index -Raw -Encoding UTF8
$rounds = [regex]::Matches($html, "cl-round-\d{3}") | ForEach-Object { $_.Value } | Sort-Object -Unique
Write-Host ("rounds=" + ($rounds -join ","))

foreach ($round in 1..24) {
    $name = "cl-round-{0:D3}" -f $round
    if ($rounds -notcontains $name) {
        throw "Missing $name reference in index.html"
    }
}

$failed = $false
Get-ChildItem -LiteralPath $Assets -Filter "cl-round-*.js" | Sort-Object Name | ForEach-Object {
    Write-Host "node --check $($_.Name)"
    node --check $_.FullName
    if ($LASTEXITCODE -ne 0) {
        $failed = $true
    }
}

if ($failed) {
    throw "Static syntax check failed"
}

Write-Host "Static syntax OK."

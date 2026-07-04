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

foreach ($round in $rounds) {
    foreach ($ext in @("css", "js")) {
        $asset = Join-Path $Assets "$round.$ext"
        if (-not (Test-Path -LiteralPath $asset)) {
            throw "Missing referenced asset $round.$ext"
        }
    }
}

$failed = $false
Get-ChildItem -LiteralPath $Assets -File |
    Where-Object { $_.Name -like "cl-round-*.js" -or $_.Name -eq "cl-interaction-hotfix.js" } |
    Sort-Object Name |
    ForEach-Object {
    Write-Host "node --check $($_.Name)"
    node --check $_.FullName
    if ($LASTEXITCODE -ne 0) {
        $failed = $true
    }
}

if ($failed) {
    throw "Static syntax check failed"
}

$assetRefs = New-Object System.Collections.Generic.HashSet[string]
[regex]::Matches($html, "(?:src|href)=`"/([^`"]+)`"") | ForEach-Object {
    $ref = ($_.Groups[1].Value -split "[?#]")[0]
    if ($ref.StartsWith("assets/") -or $ref.StartsWith("icons/") -or $ref.StartsWith("models/") -or $ref -eq "favicon.svg" -or $ref -eq "manifest.webmanifest") {
        [void]$assetRefs.Add($ref)
    }
}

$entry = [regex]::Match($html, 'src="/(assets/index-[^"]+\.js)"')
if ($entry.Success) {
    $entryPath = Join-Path $Www $entry.Groups[1].Value
    if (-not (Test-Path -LiteralPath $entryPath)) {
        throw "Missing entry bundle $($entry.Groups[1].Value)"
    }
    $entryJs = Get-Content -LiteralPath $entryPath -Raw -Encoding UTF8
    [regex]::Matches($entryJs, "assets/[A-Za-z0-9_.-]+\.(?:js|css|wasm|json)") | ForEach-Object {
        [void]$assetRefs.Add($_.Value)
    }
}

foreach ($ref in ($assetRefs | Sort-Object)) {
    $path = Join-Path $Www $ref
    if (-not (Test-Path -LiteralPath $path)) {
        throw "Missing static reference $ref"
    }
}

Write-Host ("Static references OK: " + $assetRefs.Count)
Write-Host "Static syntax OK."

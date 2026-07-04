$ErrorActionPreference = "Stop"

$Root = Split-Path -Parent $PSScriptRoot
$Backend = Join-Path $Root "backend"
$Www = Join-Path $Root "www"
$Assets = Join-Path $Www "assets"

New-Item -ItemType Directory -Force -Path $Backend, $Www, $Assets | Out-Null

Write-Host "Sync backend source and tests..."
scp -r `
    couplespace-vps:/opt/couple-ledger/app `
    couplespace-vps:/opt/couple-ledger/tests `
    couplespace-vps:/opt/couple-ledger/requirements.txt `
    couplespace-vps:/opt/couple-ledger/pytest.ini `
    couplespace-vps:/opt/couple-ledger/OPTIMIZATION_ROUNDS.md `
    "$Backend\"

Write-Host "Sync static entry..."
scp `
    couplespace-vps:/var/www/couple-ledger/index.html `
    couplespace-vps:/var/www/couple-ledger/manifest.webmanifest `
    couplespace-vps:/var/www/couple-ledger/favicon.svg `
    couplespace-vps:/var/www/couple-ledger/icons.svg `
    couplespace-vps:/var/www/couple-ledger/sw.js `
    "$Www\"

$html = Get-Content -LiteralPath (Join-Path $Www "index.html") -Raw -Encoding UTF8
$assetRefs = [regex]::Matches($html, "/assets/[^`"']+") | ForEach-Object { $_.Value.TrimStart("/") } | Sort-Object -Unique
$roundRefs = 1..24 | ForEach-Object {
    @(
        ("assets/cl-round-{0:D3}.css" -f $_),
        ("assets/cl-round-{0:D3}.js" -f $_)
    )
}
$allRefs = @($assetRefs + $roundRefs) | Sort-Object -Unique

Write-Host "Sync selected assets..."
foreach ($ref in $allRefs) {
    $remote = "couplespace-vps:/var/www/couple-ledger/$ref"
    scp $remote "$Assets\"
}

Write-Host "Sync complete: $Root"

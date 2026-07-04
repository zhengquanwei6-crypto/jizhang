param(
    [Parameter(Mandatory = $true)]
    [string[]]$Files
)

$ErrorActionPreference = "Stop"

$Root = (Resolve-Path (Split-Path -Parent $PSScriptRoot)).Path
$Www = Join-Path $Root "www"
$stamp = Get-Date -Format "yyyyMMdd_HHmmss"

foreach ($file in $Files) {
    $local = (Resolve-Path $file).Path
    if (-not $local.StartsWith($Www, [System.StringComparison]::OrdinalIgnoreCase)) {
        throw "Static deploy file must be under $Www : $local"
    }

    $relative = $local.Substring($Www.Length).TrimStart("\") -replace "\\", "/"
    $remote = "/var/www/couple-ledger/$relative"

    if ($relative -eq "index.html") {
        ssh couplespace-vps "cp /var/www/couple-ledger/index.html /var/www/couple-ledger/.round-backups/index.$stamp.html"
    }

    Write-Host "Deploy $relative"
    scp $local "couplespace-vps:$remote"
}

Write-Host "Verify public health..."
curl.exe -sS http://162.243.80.127:8080/api/health

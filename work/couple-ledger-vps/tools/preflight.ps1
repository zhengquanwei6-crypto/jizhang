$ErrorActionPreference = "Stop"

$Root = Split-Path -Parent $PSScriptRoot
$SkillPreflight = Join-Path $env:USERPROFILE ".codex\skills\couple-ledger-optimizer\scripts\ledger-preflight.ps1"

Write-Host "== Couple Ledger local preflight =="

if (Test-Path -LiteralPath $SkillPreflight) {
    powershell -ExecutionPolicy Bypass -File $SkillPreflight
} else {
    Write-Host "missing skill preflight: $SkillPreflight"
}

Write-Host "`n== Local static syntax =="
powershell -ExecutionPolicy Bypass -File (Join-Path $PSScriptRoot "check-static.ps1")

Write-Host "`n== Backend smoke =="
ssh couplespace-vps "cd /opt/couple-ledger && PYTHONPATH=. .venv/bin/pytest -q"

Write-Host "`nPreflight complete."

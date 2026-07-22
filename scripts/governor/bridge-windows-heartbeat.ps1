<#
  bridge-windows-heartbeat.ps1 — Windows Governor heartbeat publisher (Operation HANDSHAKE).

  Writes bridge/windows/heartbeat.json with a checksum the Cloud Governor
  (scripts/governor/bridge-cloud.mjs) verifies. Run from the repo root on Windows, then
  commit + push. NON-SENSITIVE fields only; read-only against the system.

  STATUS: authored by Cloud Governor; NOT executed on Windows (Cloud has no Windows access).
  Review before running. It creates only bridge/windows/heartbeat.json — nothing else.

  CHECKSUM ALGORITHM (must match bridge-cloud.mjs exactly):
    sha256( UTF8( fields joined by U+001F ) ), lowercase hex, prefixed "sha256:"
    heartbeat field order:
      schema_version, type, sender, machine_id, governor_version, git_version,
      python_version, working_dir, repo_state.branch, repo_state.commit, health, ts_utc
#>
$ErrorActionPreference = 'Stop'

function Get-Sha256Hex([string]$s) {
  $bytes = [System.Text.Encoding]::UTF8.GetBytes($s)
  $sha = [System.Security.Cryptography.SHA256]::Create()
  ($sha.ComputeHash($bytes) | ForEach-Object { $_.ToString('x2') }) -join ''
}

# machine_id: hashed COMPUTERNAME so no personal/host name is exposed
$machineId = 'win-' + (Get-Sha256Hex $env:COMPUTERNAME).Substring(0, 12)

$gitVersion = (git --version) 2>$null; if (-not $gitVersion) { $gitVersion = 'absent' }
$pyVersion = (python --version 2>&1); if (-not $pyVersion) { $pyVersion = 'absent' }
$branch = (git rev-parse --abbrev-ref HEAD 2>$null); if (-not $branch) { $branch = 'unknown' }
$commit = (git rev-parse --short HEAD 2>$null); if (-not $commit) { $commit = 'unknown' }
$tsUtc = (Get-Date).ToUniversalTime().ToString('yyyy-MM-ddTHH:mm:ssZ')

$hb = [ordered]@{
  schema_version  = '1.0'
  type            = 'heartbeat'
  sender          = 'windows-governor'
  machine_id      = $machineId
  governor_version= 'win-gov-0.1'
  git_version     = "$gitVersion".Trim()
  python_version  = "$pyVersion".Trim()
  working_dir     = (Get-Location).Path
  repo_state      = [ordered]@{ branch = "$branch".Trim(); commit = "$commit".Trim() }
  health          = 'ok'
  ts_utc          = $tsUtc
}

$sep = [string][char]0x1F
$fields = @(
  $hb.schema_version, $hb.type, $hb.sender, $hb.machine_id, $hb.governor_version,
  $hb.git_version, $hb.python_version, $hb.working_dir, $hb.repo_state.branch,
  $hb.repo_state.commit, $hb.health, $hb.ts_utc
)
$hb.checksum = 'sha256:' + (Get-Sha256Hex ([string]::Join($sep, $fields)))

New-Item -ItemType Directory -Force -Path 'bridge/windows' | Out-Null
$hb | ConvertTo-Json -Depth 5 | Set-Content -Path 'bridge/windows/heartbeat.json' -Encoding UTF8

Write-Host "Wrote bridge/windows/heartbeat.json (machine_id=$machineId, branch=$branch, commit=$commit)"
Write-Host "NEXT: git add bridge/windows/heartbeat.json && git commit -m 'windows heartbeat' && git push"
Write-Host "Then Cloud runs: node scripts/governor/bridge-cloud.mjs verify-heartbeat bridge/windows/heartbeat.json"
